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
ENV=development                       # development | staging | production | test
DEBUG=True
API_V2_PREFIX=/api/v2
FRONTEND_URL="http://localhost:5173"

# ── CORS Allowlist (JSON array or comma-separated string) ──
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

# ── PostgreSQL Database Credentials ──
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/namma_connect"
DATABASE_SYNC_URL="postgresql://postgres:postgres@localhost:5432/namma_connect"

# ── Redis In-Memory Cache & Broker ──
REDIS_URL="redis://localhost:6379/0"

# ── Authentication & Cryptography ──
# Minimum 32 characters required
JWT_SECRET="test_dev_jwt_secret_must_be_32_characters_long_min"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# ── Third-Party Service Credentials (Optional for local dev) ──
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
# Base URL for API requests
VITE_API_URL="http://localhost:8000/api/v2"
VITE_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxxx"
```

---

## 3. Supported Execution Workflows

Namma Connect V2 supports two execution models:

---

### Option A: Local Development Workflow

#### 1. Clone the Repository & Configure Environment
```bash
git clone https://github.com/priyanshu130018/Namma-Connect.git
cd Namma-Connect

# Copy example environment configuration
cp .env.example .env
```

#### 2. Start PostgreSQL & Redis
```bash
docker compose up -d postgres redis
```

#### 3. Setup Backend & Run Migrations
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install pgvector

# Run database migrations to head
alembic upgrade head

# (Optional) Seed realistic test data
python scripts/seed_dev_data.py

# Start FastAPI backend
uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000/api/v2`
- Interactive Swagger UI: `http://localhost:8000/api/v2/docs`
- Health Endpoint: `http://localhost:8000/health`

#### 4. Setup Frontend
```bash
# In a separate terminal
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
- Frontend Web App: `http://localhost:5173`

---

### Option B: Docker Compose Full-Stack Workflow

To run the complete stack inside containers:

```bash
# From repository root
cp .env.example .env

# Build and start all services
docker compose up --build
```

#### Services Started:
- **`frontend`**: React 18 / Vite SPA (`http://localhost:5173`)
- **`backend`**: FastAPI REST API Gateway (`http://localhost:8000`)
- **`worker`**: Celery background task worker
- **`postgres`**: PostgreSQL 16 with native `pgvector` extension (port `5432`)
- **`redis`**: Redis 7 cache and message broker (port `6379`)

---

## 4. Production Multi-Stage Deployment (`compose.prod.yaml`)

For production environments, the repository provides multi-stage immutable image orchestration with Nginx reverse proxying:

```bash
# Start production containers with environment variables injected
docker compose -f compose.prod.yaml up --build -d

# Execute database migrations
docker compose -f compose.prod.yaml run --rm migration
```

### Production Topology
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

## 5. Continuous Integration & Quality Gates (CI/CD)

GitHub Actions (`.github/workflows/ci.yml`) enforces 3 parallel verification gates on pushes and pull requests:

1. **Backend Verification**:
   - Live `pgvector/pgvector:pg16` and `redis:7-alpine` test services.
   - Python compilation check: `python -m compileall app tests`.
   - Database migrations: `alembic upgrade head`.
   - Full Pytest suite execution.
2. **Frontend Verification**:
   - TypeScript compilation: `npm run typecheck` (`tsc --noEmit`).
   - Vitest component suite: `npx vitest run`.
   - Static bundle build: `npm run build`.
3. **Secret Hygiene**:
   - Asserts zero committed `.env` secrets in git tracking.

---

## 6. Health Checks & Observability

### 6.1 Health Endpoint (`GET /health`)
The backend provides a deep dependency health check:
- **HTTP 200 OK**: PostgreSQL is reachable, `vector` extension is registered, and Redis ping succeeds.
- **HTTP 503 Service Unavailable**: Core database dependency unreachable.

```bash
curl http://localhost:8000/health
```

### 6.2 Docker Container Healthcheck
Defined in `compose.prod.yaml`:
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
  interval: 15s
  timeout: 5s
  retries: 3
  start_period: 10s
```
