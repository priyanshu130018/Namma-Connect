# Namma Connect V2 — Developer Guide

This guide contains everything required to configure, develop, test, migrate, and troubleshoot Namma Connect V2 locally.

---

## 1. Prerequisites

Ensure the following tools are installed on your workstation:
- **Python 3.10+** (with `pip` and `venv`)
- **Node.js 18.x or 20.x** (with `npm 9+`)
- **PostgreSQL 16** with `pgvector` extension (or Docker Engine / Desktop)
- **Redis 7** (or Docker Engine / Desktop)
- **Git**

---

## 2. Local Environment Setup

### 2.1 Clone the Repository
```bash
git clone https://github.com/priyanshu130018/Namma-Connect.git
cd Namma-Connect
```

### 2.2 Configure Environment Files
Copy the example environment configuration:
```bash
# Root / Backend environment configuration
cp .env.example .env
```

Ensure `.env` contains:
```bash
PROJECT_NAME="Namma Connect"
ENV=development
DEBUG=True
API_V2_PREFIX=/api/v2
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/namma_connect
DATABASE_SYNC_URL=postgresql://postgres:postgres@localhost:5432/namma_connect
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=test_dev_jwt_secret_must_be_32_characters_long_min
JWT_ALGORITHM=HS256
```

---

## 3. Database & Container Setup

### 3.1 Start PostgreSQL (with pgvector) & Redis via Docker
```bash
# Start isolated database and cache containers
docker compose up -d postgres redis
```

### 3.2 Backend Virtual Environment & Dependencies
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install pgvector
```

### 3.3 Run Database Migrations
```bash
# Apply migrations to database head
alembic upgrade head

# Verify current revision
alembic current
```

### 3.4 Seed Development Data
```bash
# Seed realistic Karnataka services, categories, users, and embeddings
python scripts/seed_dev_data.py

# (Optional) Clean up synthetic data at any time
# python scripts/clear_dev_data.py
```

### 3.5 Frontend Installation
```bash
cd ../frontend

# Install node dependencies
npm install
```

---

## 4. Running the Application

### 4.1 Running via Individual Terminal Processes

#### Terminal 1 — Backend API (FastAPI / Uvicorn)
```bash
cd backend
# Activate venv if not already active
uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000/api/v2`
- Interactive Swagger UI: `http://localhost:8000/api/v2/docs`
- ReDoc Documentation: `http://localhost:8000/api/v2/redoc`
- Health Endpoint: `http://localhost:8000/health`

#### Terminal 2 — Frontend Development Server (Vite)
```bash
cd frontend
npm run dev
```
- Single Page Application: `http://localhost:5173`

---

## 5. Automated Testing & Verification

### 5.1 Backend Pytest Suites
Run the entire backend test suite:
```bash
cd backend
pytest tests/ -v
```

Run specific test modules:
```bash
# Core models, schema and RBAC tests
pytest tests/test_v2_models_and_schema.py -v

# Modular domain services
pytest tests/test_v2_modular_services.py -v

# AI Conversational Assistant
pytest tests/test_v2_ai_assistant.py -v

# Agentic Trip Planner & State Machine
pytest tests/test_v2_agentic_trip_planner.py -v

# Recommendation Engine & NC Score
pytest tests/test_v2_recommendation_engine.py -v

# End-to-End Integration & Production Hardening
pytest tests/test_v2_e2e_integration_and_hardening.py -v
```

### 5.2 Concurrency & Live Server Tests
Tests marked with `live` test concurrent bookings, seat depletion, and race condition resistance against a running server:
```bash
pytest tests/ -m live -v
```

### 5.3 Frontend Vitest Suite
```bash
cd frontend

# Run all Vitest suites once
npm run test:run

# Run Vitest in watch mode
npm run test

# Run a specific component test
npx vitest run tests/components/trip_planner_v2.test.tsx
```

---

## 6. Code Quality, Linting & Typechecking

### 6.1 Python Code Linting with Ruff
```bash
# From repository root
ruff check backend/

# Auto-fix linting issues where supported
ruff check --fix backend/
```

### 6.2 Python Bytecode Compilation Check
```bash
cd backend
python -m compileall app tests
```

### 6.3 TypeScript Typechecking
```bash
cd frontend
npm run typecheck
```

### 6.4 Production Bundle Build
```bash
cd frontend
npm run build
```

---

## 7. Vector Search & HNSW Benchmark

Namma Connect includes an automated benchmark evaluating pgvector HNSW indexing performance across 10,000 services:

```bash
cd backend
python scripts/benchmark_vector_search.py
```

**Benchmark Capabilities**:
1. Checks PostgreSQL connection and `vector` extension.
2. Seeds database up to 10,000 services with 768-dim embeddings.
3. Measures Pre-HNSW baseline search latency (flat table scan).
4. Builds HNSW index (`m=16, ef_construction=64`).
5. Measures Post-HNSW latency (`ef_search=40`) across 30 hand-crafted Karnataka tourism queries.
6. Reports p50/p95 latency speedup and Top-5 semantic hit rate.

---

## 8. Database Migrations Guide (Alembic)

### 8.1 Creating a New Migration
```bash
cd backend
# Create an auto-generated migration based on model changes
alembic revision --autogenerate -m "add_field_name_to_service"
```

### 8.2 Applying Migrations
```bash
alembic upgrade head
```

### 8.3 Rolling Back Migrations
```bash
alembic downgrade -1
```

---

## 9. Common Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| `extension "vector" is not available` | PostgreSQL instance lacks `pgvector` | Use `pgvector/pgvector:pg16` Docker image or install pgvector on native PostgreSQL. |
| `DATABASE_SYNC_URL missing or SQLite detected` | SQLite is prohibited in V2 runtime | Ensure `.env` specifies a valid PostgreSQL connection string in `DATABASE_SYNC_URL`. |
| `Insecure JWT_SECRET` error on startup | `JWT_SECRET` is shorter than 32 characters in staging/production | Generate a 32+ character random secret in `.env`. |
| `CORS Error: No 'Access-Control-Allow-Origin'` | Frontend port not allowed | Add `http://localhost:5173` to `CORS_ORIGINS` in `.env`. |
| `Razorpay Signature Verification Failed` | Secret key mismatch | Check `RAZORPAY_KEY_SECRET` in `.env` against the Razorpay dashboard. |
| `ModuleNotFoundError: No module named 'app'` | `PYTHONPATH` not set | Run commands from within the `backend/` directory or set `PYTHONPATH=.`. |
