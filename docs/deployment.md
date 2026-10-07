# Namma Connect V2 — Deployment & Infrastructure Guide

This guide details local orchestration, containerization, database migrations, CI/CD pipelines, and production deployment for Namma Connect V2.

---

## 1. System Requirements & Prerequisites

| Component | Minimum Version | Notes |
|---|---|---|
| **Python** | 3.10+ | Required for backend FastAPI and Celery workers |
| **Node.js** | 18.x or 20.x | Required for React 18 / Vite 5 frontend build |
| **npm** | 9.x+ | Node package manager |
| **PostgreSQL** | 16.x with `pgvector` | Primary transactional and vector database |
| **Redis** | 7.x-alpine | Session store, rate limiter & Celery broker |
| **Docker & Compose** | Docker Engine 24+, Compose v2 | Multi-container orchestration |

---

## 2. Environment Variables Configuration

The backend utilizes `pydantic-settings` to strictly load and validate environment variables on boot.

### 2.1 Backend Environment Variables (`.env` or `.env.production`)

```bash
# ── Application Configuration ──
PROJECT_NAME="Namma Connect"
VERSION="2.0.0"
ENV=production                        # development | staging | production | test
DEBUG=False
API_V2_PREFIX=/api/v2
FRONTEND_URL="https://nammaconnect.in"

# ── CORS Allowlist (JSON array or comma-separated string) ──
CORS_ORIGINS=["https://nammaconnect.in", "https://admin.nammaconnect.in"]

# ── PostgreSQL Database Credentials ──
DATABASE_URL="postgresql+asyncpg://postgres:YourSecurePassword@localhost:5432/namma_connect"
DATABASE_SYNC_URL="postgresql://postgres:YourSecurePassword@localhost:5432/namma_connect"

# ── Redis In-Memory Cache & Broker ──
REDIS_URL="redis://localhost:6379/0"

# ── Authentication & Cryptography ──
# Minimum 32 characters required in production
JWT_SECRET="generate_a_secure_random_32_character_secret_key"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# ── Third-Party Service Credentials ──
# Google OAuth 2.0 (Optional for local testing)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Razorpay Payment Gateway (Test or Live)
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="your_razorpay_secret_key"
RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret"

# Cloudinary Media Storage (Optional, local fallbacks available)
MEDIA_STORAGE="cloudinary"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
CLOUDINARY_FOLDER="namma-connect"

# Resend Transactional Email (Optional)
RESEND_API_KEY=""
RESEND_FROM_EMAIL="notifications@nammaconnect.in"

# Google Gemini Generative AI (Optional, offline mock provider available)
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-3.5-flash-lite"
```

### 2.2 Frontend Environment Variables (`frontend/.env` or `.env.local`)

```bash
# Base URL for API requests (in dev, defaults to /api/v2 or localhost:8000)
VITE_API_URL="http://localhost:8000/api/v2"
VITE_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxxx"
```

---

## 3. Database & pgvector Setup

Namma Connect requires PostgreSQL 16 with the native `pgvector` extension enabled.

### 3.1 Dockerized PostgreSQL with pgvector
The recommended local and CI image is `pgvector/pgvector:pg16`:
```bash
docker run -d \
  --name namma_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=namma_connect \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### 3.2 Manual / Managed Database Extension Initialization
Connect to your PostgreSQL database instance using `psql` or a management tool and run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3.3 Running Alembic Migrations
Migrations must be executed prior to starting application containers:
```bash
cd backend

# Apply all migrations to the latest revision
alembic upgrade head

# Verify current database version
alembic current
```

---

## 4. Docker & Container Orchestration

The repository includes two complete Docker Compose topologies:

### 4.1 Development Orchestration (`compose.yaml`)
Mounts local source code into containers with hot-reloading for rapid development:
```bash
# Start all development services (FastAPI, Vite Frontend, PostgreSQL, Redis)
docker compose up --build

# Run in detached background mode
docker compose up -d

# Stop services
docker compose down
```

### 4.2 Production Multi-Stage Orchestration (`compose.prod.yaml`)
Optimized for immutable, multi-stage production container images with Nginx reverse proxying:
```bash
# Start production containers with environment variables injected
docker compose -f compose.prod.yaml up --build -d
```

### 4.3 Container Architecture Topology
```text
                  Internet / Client
                         │
                         ▼
             [Nginx Edge Reverse Proxy] (Port 80 / 443)
             ├── /api/v2/*  ──> [FastAPI Backend Service] (Port 8000)
             └── /*         ──> [Static Frontend Nginx Container] (Port 80)
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
             [PostgreSQL 16 + pgvector]        [Redis 7]
```

---

## 5. Production Deployment Specification

### 5.1 Host & Cloud Infrastructure
Namma Connect V2 is designed for flexible deployment across Linux VM environments (such as AWS EC2, DigitalOcean, or bare-metal Ubuntu 22.04 LTS) and container platforms:
- **Compute**: Linux host with Docker Engine and Docker Compose (or AWS ECS / Kubernetes).
- **Managed Database (Optional)**: AWS RDS for PostgreSQL 16 with `pgvector` enabled in parameter groups.
- **Managed Cache (Optional)**: AWS ElastiCache for Redis (or containerized Redis 7).
- **Edge Routing & SSL**: Nginx / Traefik reverse proxy terminating TLS with Let's Encrypt certificates.

### 5.2 Zero-Downtime Deployment Runbook

```bash
# 1. Pull latest code release from main branch
git pull origin main

# 2. Export / inject verified production secrets
export $(grep -v '^#' .env.production | xargs)

# 3. Build immutable multi-stage container images
docker compose -f compose.prod.yaml build

# 4. Run database migrations safely
docker compose -f compose.prod.yaml run --rm backend alembic upgrade head

# 5. Bring up updated services
docker compose -f compose.prod.yaml up -d --remove-orphans

# 6. Verify health check status
curl -fsS http://localhost:8000/health || exit 1
```

---

## 6. Continuous Integration & Quality Gates (CI/CD)

The repository uses GitHub Actions (`.github/workflows/ci.yml`) to enforce 3 parallel verification gates on all pull requests and pushes:

### 6.1 Gate 1: Backend Verification Job
- Spins up live `pgvector/pgvector:pg16` and `redis:7-alpine` service containers.
- Verifies clean Python compilation (`python -m compileall app tests`).
- Runs full Alembic migration cycle (`alembic upgrade head`).
- Executes the complete Pytest integration suite (320+ tests covering models, auth, payments, agentic trip planner, recommendation engine, and hardening).

### 6.2 Gate 2: Frontend Verification Job
- Executes TypeScript compilation check (`npm run typecheck` / `tsc --noEmit`).
- Executes Vitest test suite (`npx vitest run`).
- Validates production static bundling (`npm run build`).

### 6.3 Gate 3: Secret Hygiene & Security Scan
- Scans tracked git files to verify no sensitive `.env`, `.env.local`, or `.env.production` files are committed.

---

## 7. Health Checks & Observability

### 7.1 Health Endpoint (`GET /health`)
The backend provides a deep dependency health check:
- **HTTP 200 OK**: PostgreSQL is reachable, `vector` extension is registered, and Redis ping succeeds.
- **HTTP 503 Service Unavailable**: Core database dependency unreachable.

```bash
# Inspect health status
curl http://localhost:8000/health
```

### 7.2 Docker Container Healthcheck
Defined in `compose.prod.yaml`:
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
  interval: 15s
  timeout: 5s
  retries: 3
  start_period: 10s
```

---

## 8. Build & Verification Commands Summary

```bash
# ── Backend Verification ──
cd backend
python -m compileall app tests
pytest tests/ -v

# ── Frontend Verification ──
cd ../frontend
npm run typecheck
npm run test:run
npm run build

# ── Vector Search Benchmark Verification ──
cd ../backend
python scripts/benchmark_vector_search.py
```
