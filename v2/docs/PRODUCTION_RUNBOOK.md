# Namma Connect V2: Production Operations Runbook

**Target Version**: 2.0.0  
**Audience**: Site Reliability Engineers, DevOps Engineers, and Platform Administrators  
**Last Updated**: 2026-09-15  

---

## 1. First-Time System Deployment

```bash
# 1. Clone repository to deployment host
git clone https://github.com/priyanshu130018/Namma-Connect.git /opt/nammaconnect
cd /opt/nammaconnect

# 2. Inject production secrets into environment
cp v2/.env.production.example v2/.env.production
chmod 600 v2/.env.production
# Edit v2/.env.production with live credentials from AWS Secrets Manager / Vault

# 3. Pull / build immutable production container images
docker compose -f compose.prod.yaml build

# 4. Bootstrap database and enable pgvector
docker compose -f compose.prod.yaml up -d postgres redis
docker compose -f compose.prod.yaml run --rm migration alembic upgrade head

# 5. Start backend monolith and Celery workers
docker compose -f compose.prod.yaml up -d backend celery_worker

# 6. Start frontend and edge reverse proxy
docker compose -f compose.prod.yaml up -d frontend proxy

# 7. Execute post-deployment diagnostic verification
docker compose -f compose.prod.yaml exec backend python scripts/deploy_check.py
docker compose -f compose.prod.yaml exec backend python scripts/smoke_test.py --base-url http://localhost:8000
```

---

## 2. Standard Production Release & Rolling Update

```bash
# 1. Verify CI/CD release tag quality gates
git checkout tags/v2.0.1

# 2. Execute pre-deployment database backup
docker compose -f compose.prod.yaml exec backend python scripts/backup_db.py --output-dir /var/backups/namma_connect

# 3. Apply non-breaking database migrations
docker compose -f compose.prod.yaml run --rm migration alembic upgrade head

# 4. Rebuild & update backend, celery worker, frontend
docker compose -f compose.prod.yaml up -d --no-deps --build backend celery_worker frontend proxy

# 5. Execute automated smoke test suite
docker compose -f compose.prod.yaml exec backend python scripts/smoke_test.py --base-url http://localhost:8000
```

---

## 3. Database Operations & Migration Management

### Inspecting Database State
```bash
# Check current migration revision
docker compose -f compose.prod.yaml run --rm migration alembic current

# Inspect active PostgreSQL connections
docker compose -f compose.prod.yaml exec postgres psql -U namma_user -d namma_connect_prod -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

### Manual Backup Execution
```bash
docker compose -f compose.prod.yaml exec backend python scripts/backup_db.py --output-dir /var/backups/namma_connect
```

### Disaster Recovery Database Restore
```bash
# Requires explicit --confirm flag on production
docker compose -f compose.prod.yaml exec backend python scripts/restore_db.py \
  --file /var/backups/namma_connect/namma_connect_prod_20260915_120000.sql.gz \
  --confirm
```

---

## 4. Rollback Runbooks

### Scenario A: Application Code Regression (Database Unchanged)
```bash
# 1. Check out previous release tag
git checkout tags/v2.0.0

# 2. Re-deploy previous container image tags
docker compose -f compose.prod.yaml up -d --no-deps backend celery_worker frontend

# 3. Verify health
docker compose -f compose.prod.yaml exec backend python scripts/smoke_test.py --base-url http://localhost:8000
```

### Scenario B: Emergency Database Rollback
```bash
# 1. If the migration included a reversible downgrade:
docker compose -f compose.prod.yaml run --rm migration alembic downgrade -1

# 2. If the migration is irreversible or corrupted state:
# Place application in maintenance mode
docker compose -f compose.prod.yaml stop backend celery_worker
# Restore snapshot from pre-deployment backup
docker compose -f compose.prod.yaml exec backend python scripts/restore_db.py --file <backup_file> --confirm
# Restart services
docker compose -f compose.prod.yaml up -d backend celery_worker
```

---

## 5. Celery Worker Maintenance & Scaling

```bash
# Check worker status and queue sizes
docker compose -f compose.prod.yaml exec backend celery -A app.core.celery_app inspect active
docker compose -f compose.prod.yaml exec backend celery -A app.core.celery_app inspect ping

# Scale worker instances
docker compose -f compose.prod.yaml up -d --scale celery_worker=4
```

---

## 6. Incident Response Playbooks

### Incident 1: Redis Crash / Memory Saturation
1. Check Redis process status: `docker compose -f compose.prod.yaml ps redis`
2. Inspect memory: `docker compose -f compose.prod.yaml exec redis redis-cli -a $REDIS_PASSWORD info memory`
3. If memory is exhausted: check LRU eviction policy (`allkeys-lru`). Authoritative persistent data resides in PostgreSQL; restart Redis:
   ```bash
   docker compose -f compose.prod.yaml restart redis celery_worker
   ```

### Incident 2: Google Gemini LLM Degradation / Quota Exhaustion
1. The AI Assistant and Agentic Planner automatically activate circuit breakers and fallback to deterministic heuristics.
2. Verify rate limit status in Google Cloud / AI Studio Console.
3. If primary key is quota-limited, update `GEMINI_API_KEY` in `v2/.env.production` and run:
   ```bash
   docker compose -f compose.prod.yaml up -d --no-deps backend celery_worker
   ```

### Incident 3: Razorpay Webhook Signature Mismatch / Failure
1. Verify `RAZORPAY_WEBHOOK_SECRET` matches the webhook configuration in the Razorpay Dashboard.
2. Check incoming webhook signature logs: `docker compose -f compose.prod.yaml logs backend | grep -i razorpay`
3. If webhooks fail during network partition, trigger customer reconciliation:
   `POST /api/v2/payments/{payment_id}/verify`
