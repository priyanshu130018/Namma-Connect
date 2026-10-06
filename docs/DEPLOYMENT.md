# Namma Connect V2: Production Deployment Guide

**Target Version**: 2.0.0  
**Target Environment**: Linux / Containerized (Docker & Docker Compose / Kubernetes)  
**Database**: PostgreSQL 16 with pgvector  
**Cache / Message Broker**: Redis 7+  
**Application Runtime**: Python 3.10+ (FastAPI / Uvicorn / Celery) & Node.js 20+ (Vite React 18 SPA)

---

## 1. System Architecture & Topology

Namma Connect V2 is architected as a high-performance **Modular Monolith** with decoupled background asynchronous task processing and a client-side single page application:

```
[ Internet / Edge CDN ]
          │
          ▼
    [ Reverse Proxy / Nginx ]
    ├── /api/v2/*  ──────────────► [ FastAPI Monolith (Uvicorn Workers) ]
    │                                     │                │
    │                                     ▼                ▼
    │                           [ PostgreSQL 16+pgvector ] [ Redis 7 Cache/Broker ]
    │                                                              ▲
    │                                                              │
    ├── /ws/*      ───────────────────────────────────────────────┼──► [ Celery Workers ]
    └── /*         ──────────────► [ Vite Static Production Assets ]
```

---

## 2. Required Production Environment Variables

Never commit real production values to version control. Set these via your container orchestration secret manager or host environment:

| Variable | Type | Description | Production Example |
| :--- | :--- | :--- | :--- |
| `PROJECT_NAME` | String | Application display name | `Namma Connect` |
| `VERSION` | String | Release version tag | `2.0.0` |
| `ENV` | String | Environment identifier | `production` |
| `DEBUG` | Boolean | Debug flag (Must be `False` in prod) | `False` |
| `API_V2_PREFIX` | String | REST router root prefix | `/api/v2` |
| `FRONTEND_URL` | String | Canonical web app URL | `https://nammaconnect.in` |
| `CORS_ORIGINS` | JSON Array | Whitelisted browser origins | `["https://nammaconnect.in"]` |
| `DATABASE_URL` | String | Async database connection string | `postgresql+asyncpg://user:pass@db-host:5432/namma_connect_prod` |
| `DATABASE_SYNC_URL` | String | Sync DB URL (for Alembic migrations) | `postgresql://user:pass@db-host:5432/namma_connect_prod` |
| `REDIS_URL` | String | Redis cache and queue broker | `redis://:redis_password@redis-host:6379/0` |
| `JWT_SECRET` | String | 64+ char high-entropy HMAC secret | `[generate with openssl rand -hex 32]` |
| `JWT_ALGORITHM` | String | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Integer | Access token lifetime | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Integer | Refresh token lifetime | `30` |
| `GOOGLE_CLIENT_ID` | String | Google OAuth client ID | `[prod-client-id].apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | String | Google OAuth backend secret | `[prod-client-secret]` |
| `RAZORPAY_KEY_ID` | String | Razorpay live API key ID | `rzp_live_[prod_key]` |
| `RAZORPAY_KEY_SECRET` | String | Razorpay live API secret | `[prod-razorpay-secret]` |
| `RAZORPAY_WEBHOOK_SECRET` | String | Razorpay webhook validation secret | `[prod-webhook-secret]` |
| `CLOUDINARY_CLOUD_NAME` | String | Cloudinary cloud namespace | `nammaconnect-prod` |
| `CLOUDINARY_API_KEY` | String | Cloudinary API Key | `[prod-cloudinary-key]` |
| `CLOUDINARY_API_SECRET` | String | Cloudinary API Secret | `[prod-cloudinary-secret]` |
| `RESEND_API_KEY` | String | Resend email provider API key | `re_[prod-resend-key]` |
| `RESEND_FROM_EMAIL` | String | Verified outbound sender email | `notifications@nammaconnect.in` |
| `GEMINI_API_KEY` | String | Google Gemini LLM API key | `AIzaSy[prod-gemini-key]` |
| `GEMINI_MODEL` | String | Authoritative Gemini model identifier | `gemini-3.5-flash-lite` |
| `TOMTOM_API_KEY` | String | TomTom mapping & geocoding key | `[prod-tomtom-key]` |

---

## 3. Database Initialization & Alembic Migrations

1. Ensure PostgreSQL 16 is running with the `vector` extension enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
2. Execute authoritative Alembic database migrations:
   ```bash
   cd v2/backend
   alembic upgrade head
   ```
3. Validate migration state:
   ```bash
   alembic current
   # Expected output: 0001_initial_namma_connect_v2 (head)
   ```

---

## 4. Backend Service Startup (FastAPI + Gunicorn/Uvicorn)

For production deployments, execute with multiple Uvicorn workers behind a process manager:

```bash
uvicorn app.main:app   --host 0.0.0.0   --port 8000   --workers 4   --proxy-headers   --forwarded-allow-ips='*'
```

---

## 5. Background Worker Startup (Celery)

Start the asynchronous task worker processing the 5 dedicated queues:

```bash
celery -A app.core.celery_app worker   -Q analytics,recommendation,nc_score,notification,translation   -l INFO   --concurrency=4
```

---

## 6. Frontend Build & Static Serving

1. Build static production bundle:
   ```bash
   cd v2/frontend
   npm ci
   npm run build
   ```
2. Assets in `v2/frontend/dist` should be served via Nginx or uploaded to a global CDN (e.g., Cloudflare, CloudFront).

---

## 7. Containerized Orchestration (Docker Compose)

The production `docker-compose.prod.yml` defines the multi-tier containerized stack:

```yaml
version: '3.8'

services:
  db:
    image: pgvector/pgvector:pg16
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-namma_connect_prod}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB:-namma_connect_prod}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./v2/backend
      dockerfile: Dockerfile
    restart: always
    env_file: .env.production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: >
      sh -c "alembic upgrade head &&
             uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/ready"]
      interval: 15s
      timeout: 5s
      retries: 3

  celery_worker:
    build:
      context: ./v2/backend
      dockerfile: Dockerfile
    restart: always
    env_file: .env.production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: >
      celery -A app.core.celery_app worker
      -Q analytics,recommendation,nc_score,notification,translation
      -l INFO --concurrency=4

  frontend:
    build:
      context: ./v2/frontend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

---

## 8. Verification & Smoke Testing

Execute the automated smoke test script post-deployment:
```bash
python v2/backend/scripts/smoke_test.py --base-url https://nammaconnect.in
```
