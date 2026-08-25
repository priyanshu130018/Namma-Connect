# NammaConnect V2 — Technical Architecture & Developer Guide

Welcome to the **V2** codebase of **NammaConnect**, the production-grade agro-tourism and local Karnataka experience marketplace.

---

## 1. Directory Structure

```text
v2/
├── backend/
│   ├── alembic/                      # Database migration versions
│   │   └── versions/
│   │       ├── 0001_initial_core_schema.py
│   │       ├── 0002_create_partner_applications.py
│   │       ├── 0003_add_service_moderation_fields.py
│   │       └── 0004_add_is_test_data_and_pgvector_embedding.py
│   ├── app/
│   │   ├── api/v2/endpoints/         # REST API routers
│   │   ├── core/                     # Config, database, security, logging
│   │   ├── dependencies/             # Auth & RBAC dependencies
│   │   ├── models/                   # SQLAlchemy 2.0 ORM models
│   │   ├── repositories/             # Database queries & persistence
│   │   ├── schemas/                  # Pydantic validation & response schemas
│   │   └── services/                 # Business logic, payments, AI, search
│   ├── scripts/
│   │   ├── seed_dev_data.py          # 500+ users & 1000+ services seeder
│   │   ├── generate_embeddings.py    # Gemini 768-dim embedding generator
│   │   └── clear_dev_data.py         # Safe synthetic data cleaner
│   ├── tests/                        # 100% passing automated Pytest suite
│   ├── Dockerfile                    # Containerization definition
│   └── requirements.txt              # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/               # UI components, modals, forms, layout
│   │   ├── contexts/                 # Auth, theme, socket contexts
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── i18n/                     # English, Kannada, Hindi locales
│   │   ├── routes/                   # Customer, Partner, Admin, Creator pages
│   │   ├── services/                 # API client & payment/marketplace services
│   │   └── types/                    # TypeScript interfaces
│   ├── tests/                        # Vitest component & integration tests
│   └── vite.config.ts                # Vite build configuration
├── docs/                             # Architecture blueprints & route maps
└── docker-compose.yml                # Multi-container orchestration
```

---

## 2. Key Architecture Pillars

### 1. Vector Search Pipeline (Gemini + pgvector)
- **Embedding Model**: Google Gemini `gemini-embedding-001` configured with `outputDimensionality: 768`.
- **Search Engine**: Unified `SemanticSearchService` combining pgvector cosine distance (`Service.embedding.cosine_distance(query_vector)`) with relational SQL filters.
- **Unified Pipeline**: Both conventional marketplace search (`/api/v2/search`) and conversational AI (`/api/v2/ai/travel/chat`) execute through the exact same vector retrieval pipeline.

### 2. Authoritative Payments (Razorpay Test Mode)
- **Server Amount Authority**: Total amount computed strictly server-side from service unit price, duration, and guest count.
- **HMAC Signature**: Validated using `hmac.compare_digest` with server secret before booking status transitions to `CONFIRMED`.
- **Idempotency**: Repeat verification calls safely return the confirmed state without double payments or duplicated notifications.

### 3. Progressive Partner Verification & Moderation
- **KYC Submission**: Multi-step partner onboarding (`/api/v2/partner-applications`).
- **Admin Workflow**: Partner applications and new service listings start in `PENDING` state and require administrative review (`/api/v2/admin/*`).

---

## 3. Test Runner & Quality Gates

```bash
# Run backend tests
cd backend
python -m pytest tests -v

# Run frontend tests
cd ../frontend
npm run test:run

# Build frontend production bundle
npm run build
```
