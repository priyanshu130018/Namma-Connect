# Namma Connect V2: Production Deployment Checklist

**Release Target**: 2.0.0  
**Sign-off Required Prior to Production Promotion**  

---

## Phase 1: Pre-Deployment Gates

- [ ] **Release Identification**: Release tag created (e.g., `v2.0.0`) with Git commit SHA logged.
- [ ] **CI Quality Gate**: GitHub Actions CI workflow fully green (Compileall, Pytest 79/79, TypeScript typecheck, Vitest, Vite build).
- [ ] **Security Audit**: No committed secrets, no unencrypted `.env` files in git, `.env.production` access permissions restricted (`chmod 600`).
- [ ] **Database Pre-Migration Backup**: Fresh PostgreSQL database dump verified with SHA-256 checksum.
- [ ] **Migration Compatibility**: Alembic migration script reviewed for backwards compatibility (no destructive drops without data migration).
- [ ] **Secret Injection**: Production secrets verified in cloud secret store (`JWT_SECRET`, `RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`).

---

## Phase 2: Deployment Execution

- [ ] **Database Migration**: Run `alembic upgrade head` via one-shot migration runner; verify migration head matches codebase.
- [ ] **Backend Service Launch**: Start FastAPI container with 4 Uvicorn workers behind process manager.
- [ ] **Celery Worker Launch**: Start Celery workers listening to all 5 queues (`analytics`, `recommendation`, `nc_score`, `notification`, `translation`).
- [ ] **Frontend Static Asset Deployment**: Build production bundle and verify Nginx SPA routing.
- [ ] **Edge Proxy & TLS Configuration**: Nginx reverse proxy routing `/api/v2/*`, `/ws/*`, `/health/*` and terminating TLS.

---

## Phase 3: Post-Deployment Verification

- [ ] **Liveness Probe**: `GET /health/live` returns HTTP 200 `{"status": "alive"}`.
- [ ] **Readiness Probe**: `GET /health/ready` returns HTTP 200 with active PostgreSQL and Redis sockets.
- [ ] **Subsystem Probe**: `GET /health` reports healthy database query latency and external adapters.
- [ ] **Automated Smoke Test**: `python scripts/smoke_test.py --base-url <PROD_URL>` completes with all 7/7 steps passing.
- [ ] **Metrics Scraping**: `GET /metrics` produces Prometheus counters without credential leakage.
- [ ] **Payment Webhook Reachability**: Confirm Razorpay webhook URL endpoint responds to signature validation probes.
- [ ] **AI Assistant & Trip Planner**: Verify basic conversational flow and search tool execution.
- [ ] **Worker Task Ingestion**: Confirm asynchronous tasks (analytics, recommendations) are dequeued and processed without backlog.
