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

## 2. Quickstart & Setup

### 2.1 Clone the Repository
```bash
git clone https://github.com/priyanshu130018/Namma-Connect.git
cd Namma-Connect
```

### 2.2 Configure Environment Files
```bash
# Copy example environment configuration
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

## 3. Supported Development Modes

### Mode A: Local Development (Recommended for Fast Iteration)

#### 1. Start Database & Cache
```bash
docker compose up -d postgres redis
```

#### 2. Setup Backend Virtual Environment & Migrations
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install pgvector

# Run database schema migrations
alembic upgrade head

# (Optional) Seed realistic Karnataka test listings
python scripts/seed_dev_data.py

# Start FastAPI backend
uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000/api/v2`
- Interactive Swagger UI: `http://localhost:8000/api/v2/docs`
- Health Endpoint: `http://localhost:8000/health`

#### 3. Setup Frontend
```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
- Frontend Web App: `http://localhost:5173`

---

### Mode B: Full-Stack Docker Compose

To launch the full stack in containerized mode:

```bash
# From repository root
docker compose up --build
```

---

## 4. Automated Testing & Verification

### 4.1 Backend Pytest Suites
Run the full backend test suite:
```bash
cd backend
pytest tests/ -v
```

Run specific test suites:
```bash
# Core models, schema and RBAC tests
pytest tests/test_v2_models_and_schema.py -v

# Modular domain services
pytest tests/test_v2_modular_services.py -v

# LangGraph AI conversational agent
pytest tests/test_v2_langgraph_agent.py -v

# Agentic Trip Planner & State Machine
pytest tests/test_v2_agentic_trip_planner.py -v

# Recommendation Engine & NC Score
pytest tests/test_v2_recommendation_engine.py -v

# End-to-End Integration & Hardening
pytest tests/test_v2_e2e_integration_and_hardening.py -v
```

### 4.2 Concurrency & Live Server Tests
Run tests verifying concurrent seat reservation locking and webhook replay protection against a running server:
```bash
pytest tests/ -m live -v
```

### 4.3 Frontend Vitest Suite
```bash
cd frontend

# Run all Vitest suites once
npm run test:run

# Run Vitest in watch mode
npm run test

# Run a specific component test
npx vitest run tests/components/namma_ai_agent.test.tsx
```

---

## 5. Code Quality, Linting & Typechecking

### 5.1 Python Code Linting (Ruff)
```bash
# From repository root
ruff check backend/

# Auto-fix supported linting issues
ruff check --fix backend/
```

### 5.2 Python Compilation Verification
```bash
cd backend
python -m compileall app tests
```

### 5.3 TypeScript Typechecking
```bash
cd frontend
npm run typecheck
```

### 5.4 Production Bundle Build
```bash
cd frontend
npm run build
```

---

## 6. Vector Search & HNSW Benchmark

Namma Connect includes an automated benchmark evaluating pgvector HNSW indexing performance across 10,000 services:

```bash
cd backend
python scripts/benchmark_vector_search.py
```

**Benchmark Flow**:
1. Verifies PostgreSQL connection and `vector` extension.
2. Seeds database up to 10,000 services with 768-dim embeddings.
3. Measures Pre-HNSW baseline search latency (flat table scan).
4. Builds HNSW index (`m=16, ef_construction=64`).
5. Measures Post-HNSW latency (`ef_search=40`) across 30 hand-crafted Karnataka tourism queries.
6. Reports p50/p95 latency speedup and Top-5 semantic hit rate.

---

## 7. Database Migrations Guide (Alembic)

```bash
cd backend

# Create an auto-generated migration from model changes
alembic revision --autogenerate -m "describe_migration"

# Apply all pending migrations to head
alembic upgrade head

# Rollback the last migration
alembic downgrade -1
```

---

## 8. Common Development Troubleshooting

| Issue | Root Cause | Solution |
|---|---|---|
| `extension "vector" is not available` | PostgreSQL instance lacks `pgvector` | Use `pgvector/pgvector:pg16` Docker image or install pgvector on native PostgreSQL. |
| `DATABASE_SYNC_URL missing or SQLite detected` | SQLite is prohibited in V2 runtime | Ensure `.env` specifies a valid PostgreSQL connection string in `DATABASE_SYNC_URL`. |
| `Insecure JWT_SECRET` error on startup | `JWT_SECRET` is shorter than 32 characters | Generate a 32+ character random secret in `.env`. |
| `CORS Error: No 'Access-Control-Allow-Origin'` | Frontend port not allowed | Add `http://localhost:5173` to `CORS_ORIGINS` in `.env`. |
| `Razorpay Signature Verification Failed` | Secret key mismatch | Check `RAZORPAY_KEY_SECRET` in `.env` against the Razorpay test dashboard. |
| `ModuleNotFoundError: No module named 'app'` | `PYTHONPATH` not set | Run commands from within the `backend/` directory or set `PYTHONPATH=.`. |
