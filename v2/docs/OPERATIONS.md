# Namma Connect V2: Production Operations Manual

**Authoritative Reference**: Operational Runbooks, Maintenance Procedures, Observability, and Incident Response  
**Platform Version**: 2.0.0  
**Status**: Production-Ready  

---

## 1. System Topology & Architecture

Namma Connect V2 is structured as an enterprise-grade **Modular Monolith** engineered for high throughput, predictable latency, and resilient failover.

```
                      [ Client Applications / Web Browsers ]
                                       │
                                       ▼ (HTTPS / WSS)
                         [ CDN / Edge Reverse Proxy (Nginx) ]
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 │                                           │
          (API Requests)                              (Static Assets)
                 ▼                                           ▼
      [ FastAPI Core Monolith ]                    [ Object Store / CDN ]
       (Uvicorn Multi-Worker)                      (Vite React 18 SPA)
         ├── /api/v2/* (REST)
         ├── /ws/* (WebSockets)
         ├── /health/* (Probes)
         └── /metrics (Prometheus)
                 │
      ┌──────────┴─────────────────────────┬─────────────────────────┐
      ▼                                    ▼                         ▼
[ PostgreSQL 16 ]                 [ Redis 7 Cluster ]        [ Celery Workers ]
- pgvector extension               - Shared Cache Broker      - analytics queue
- Connection pooling               - Session Store            - recommendation queue
- Transaction isolation            - Rate Limiting            - nc_score queue
- Streaming replication            - Pub/Sub Channels         - notification queue
                                                              - translation queue
```

---

## 2. Environment Configurations

| Attribute | Staging | Production |
| :--- | :--- | :--- |
| **Domain** | `https://staging.nammaconnect.in` | `https://nammaconnect.in` |
| **API Base URL** | `https://staging.nammaconnect.in/api/v2` | `https://nammaconnect.in/api/v2` |
| **Database** | PostgreSQL 16 + pgvector (1 replica) | PostgreSQL 16 + pgvector (HA Multi-AZ, Read Replica) |
| **Redis** | Redis 7 Standalone (Persistence enabled) | Redis 7 Sentinel / Managed HA |
| **Worker Threads** | 2 Uvicorn workers, 2 Celery concurrency | 4+ Uvicorn workers per pod, autoscaled Celery workers |
| **Log Level** | `INFO` | `INFO` (Structured JSON) |
| **Debug Mode** | `False` | `False` |
| **CORS Whitelist** | Staging domains only | `https://nammaconnect.in`, `https://www.nammaconnect.in` |
| **External Sandboxes** | Razorpay Test, Resend Test Key | Razorpay Live, Resend Live Key |

---

## 3. CI/CD Pipelines & Quality Gates

Automated via `.github/workflows/ci.yml`. Every PR and branch push must pass the following quality gates:

1. **Static Analysis & Syntax**:
   - `python -m compileall v2/backend` (0 errors required).
2. **Database Migration Verification**:
   - Spawns ephemeral PostgreSQL 16 + pgvector container.
   - Applies migrations (`alembic upgrade head`).
   - Verifies schema downgrade and upgrade paths (`alembic downgrade base` -> `alembic upgrade head`).
3. **Backend Test Suite**:
   - Executes 77 Pytest test cases covering Auth, Marketplace, Bookings, Payments, Recommendations, AI Assistant, Provider Intelligence, and Security.
   - Enforces 100% pass rate.
4. **Frontend Quality Checks**:
   - `npm run typecheck` (TypeScript strict mode, 0 errors).
   - `npm run test` (Vitest suite, 100% pass rate).
   - `npm run build` (Vite production bundle verification).
5. **Security & Credential Scanning**:
   - Checks repository for uncommitted `.env` files and exposed API secrets.

---

## 4. Deployment Procedures

### Standard Zero-Downtime Deployment Flow
1. **Pre-flight Check**: Verify CI green status on release tag.
2. **Database Migration Step**:
   ```bash
   cd v2/backend
   alembic upgrade head
   alembic current
   ```
3. **Backend Deployment**:
   - Rolling restart of backend containers (25% max surge, 0% max unavailable).
   - Validate `/health/ready` returns `200 OK` before routing ingress traffic.
4. **Celery Worker Deployment**:
   - Warm-shutdown of existing workers (`SIGTERM`).
   - Start updated workers listening to all 5 queues.
5. **Frontend SPA Deployment**:
   - Deploy built `dist/` directory to CDN / S3 bucket.
   - Issue CloudFront / Edge cache invalidation for `index.html`.
6. **Post-Deployment Smoke Test**:
   ```bash
   python v2/backend/scripts/smoke_test.py --base-url https://nammaconnect.in
   ```

---

## 5. Database Operations & Schema Migrations

### Principles:
- `Base.metadata.create_all()` is strictly forbidden in production.
- All schema modifications must be scripted as Alembic migrations in `v2/backend/alembic/versions/`.
- Schema changes must be backwards-compatible (expand-and-contract pattern).

### Applying Migrations:
```bash
# Verify pending revisions
alembic check

# Apply migrations
alembic upgrade head

# Rollback single migration if required
alembic downgrade -1
```

---

## 6. Backup & Retention Policy

Automated backups are executed by `v2/backend/scripts/backup_db.py`.

- **Backup Schedule**: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC).
- **Format**: Gzip compressed PostgreSQL custom archive (`pg_dump -Fc`).
- **Integrity**: SHA-256 checksum generated and stored alongside each backup (`.sha256`).
- **Retention**:
  - Hourly/6-hour backups: Kept for 14 days locally/hot tier.
  - Weekly snapshots: Kept for 90 days in cold cloud object storage.
  - Monthly archives: Retained for 1 year.
- **Manual Backup Command**:
  ```bash
  python v2/backend/scripts/backup_db.py --output-dir /var/backups/namma_connect
  ```

---

## 7. Database Restore & Disaster Recovery Runbook

To restore a database snapshot using `v2/backend/scripts/restore_db.py`:

```bash
# Restore on staging/local
python v2/backend/scripts/restore_db.py --file /var/backups/namma_connect/namma_connect_dev_20260915_120000.sql.gz

# Restore on production (Requires explicit confirmation flag)
python v2/backend/scripts/restore_db.py --file /var/backups/namma_connect/namma_connect_prod_20260915_120000.sql.gz --confirm
```

**Disaster Recovery SLA Targets**:
- **Recovery Point Objective (RPO)**: < 6 hours (or < 5 minutes if WAL archiving is active).
- **Recovery Time Objective (RTO)**: < 30 minutes from incident confirmation.

---

## 8. Health Probes & Monitoring Endpoints

| Endpoint | Probe Type | Purpose | Success Code |
| :--- | :--- | :--- | :--- |
| `GET /health/live` | Liveness | Verifies Python event loop is alive | `200 OK` |
| `GET /health/ready` | Readiness | Validates DB and Redis connections | `200 OK` |
| `GET /health` | System Health | Reports DB, Redis, and external service statuses | `200 OK` |
| `GET /metrics` | Prometheus | Exposes operational metrics (reqs, memory, latency) | `200 OK` |

---

## 9. Logging & Audit Trails

- Logs are emitted to `stdout` in structured format:
  ```json
  {"timestamp": "2026-09-15T12:00:00Z", "level": "INFO", "module": "booking", "message": "Booking status updated to CONFIRMED", "booking_id": "uuid", "user_id": "uuid"}
  ```
- **PII Scrubbing**: Passwords, auth tokens, credit card details, and private API keys are filtered before logging.
- **Retention**: 30 days hot search index, 365 days cold archive.

---

## 10. Alerting Rules & Thresholds

| Metric / Event | Warning Threshold | Critical Threshold | Action Channel |
| :--- | :--- | :--- | :--- |
| **API Error Rate (5xx)** | > 1% over 5m | > 5% over 2m | Slack #ops / PagerDuty |
| **P95 Latency** | > 500ms over 5m | > 1500ms over 2m | Slack #ops |
| **Database Pool Exhaustion** | > 75% active | > 90% active | Slack #ops / PagerDuty |
| **Redis Memory** | > 70% | > 85% | Slack #ops |
| **Celery Queue Lag** | > 500 jobs | > 2000 jobs | Slack #ops |
| **Payment Failure Spike** | > 5% failure rate | > 15% failure rate | PagerDuty |

---

## 11. Incident Response Playbooks

### Playbook A: PostgreSQL Connection Pool Saturation
1. Check active connections: `SELECT count(*), state FROM pg_stat_activity GROUP BY state;`
2. Identify long-running queries: `SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY 2 DESC;`
3. Terminate runaway query: `SELECT pg_cancel_backend(pid);` or `SELECT pg_terminate_backend(pid);`
4. Scale up Uvicorn pool configuration if normal traffic surge.

### Playbook B: Celery Queue Lag / Task Failure
1. Inspect Redis queue sizes: `redis-cli LLEN celery` or per queue `LLEN recommendation`.
2. Inspect worker logs for unhandled exceptions or deadlocks.
3. Scale Celery worker instances: `docker compose up --scale celery_worker=4 -d`.

### Playbook C: LLM / Gemini API Degradation
1. The AI Assistant and Agentic Planner automatically fall back to deterministic hybrid heuristics and cached responses.
2. Verify rate limit quotas on Google AI Studio console.
3. If outage persists, switch `GEMINI_MODEL` to fallback model or enable mock fallback flag in production config.

---

## 12. Rollback Runbooks

### Application Code Rollback:
```bash
# 1. Rollback backend to previous container tag
kubectl rollout undo deployment/backend-api
# or Docker Compose
docker compose up -d --no-deps backend_api:<previous_tag>

# 2. Invalidate CDN cache for frontend
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### Database Migration Rollback:
```bash
# Check current revision
alembic current

# Rollback one revision
alembic downgrade -1

# Verify
alembic current
```

---

## 13. External Provider Operational Runbooks

- **Razorpay**:
  - Webhooks signed with `RAZORPAY_WEBHOOK_SECRET`.
  - Replay attacks blocked via idempotent event logging.
  - Manual sync: Use `/api/v2/payments/{payment_id}/verify` to reconcile stuck payments.
- **Google Gemini**:
  - Circuit breakers wrap all prompt completions.
  - Failures degrade gracefully without crashing trip planning or recommendations.
- **TomTom**:
  - Route calculation fallback to Haversine geographic calculation on network timeout.
- **Cloudinary**:
  - Media asset transformations cached at edge.

---

## 14. Verification & Smoke Testing

Run the automated smoke test script post-deployment:
```bash
python v2/backend/scripts/smoke_test.py --base-url http://localhost:8000
```
Verifies:
1. Process Liveness (`/health/live`)
2. DB & Cache Readiness (`/health/ready`)
3. Subsystem Health (`/health`)
4. Operational Metrics (`/metrics`)
5. OpenAPI Documentation Schema (`/openapi.json`)
6. Marketplace Category Listing (`/api/v2/categories`)
7. Search & Discovery Engine (`/api/v2/listings/search`)
