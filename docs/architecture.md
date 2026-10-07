# Namma Connect V2 — Architecture Specification

## 1. System Overview

**Namma Connect** is a production-grade digital marketplace and intelligent travel platform designed for agro-tourism, rural stays, cultural workshops, culinary heritage, and guided experiences across the 31 districts of Karnataka.

The system is structured as a **Modular Monolith** pairing a high-throughput **FastAPI** backend with a modern **React 18 / TypeScript** Single Page Application (SPA). It integrates relational ACID transactions with pgvector cosine similarity search, asynchronous background task processing via Redis and Celery, and an **Agentic AI Orchestration Engine** powered by LangGraph and Google Gemini.

```mermaid
flowchart TD
    subgraph Client ["Frontend Client (React 18 + TypeScript + Vite)"]
        SPA["React SPA Routing Shells"]
        Contexts["Auth / Theme / I18n Contexts"]
        ClientAPI["Axios API Client (/api/v2)"]
        RazorpayModal["Razorpay Checkout Modal"]
    end

    subgraph Gateway ["Application Gateway & Middleware"]
        FastAPIApp["FastAPI Gateway (/api/v2)"]
        SecHeaders["Security Headers Middleware"]
        ReqContext["Request Context & Logging"]
        CORSMid["CORS & CSRF Validation"]
        RateLimiter["Redis Token Bucket Rate Limiter"]
        AuthGuard["JWT / RBAC Authorization Guards"]
    end

    subgraph Backend ["FastAPI Backend Modules (Modular Monolith)"]
        AuthMod["Auth & User Module"]
        MarketMod["Marketplace & Inventory Module"]
        TripMod["Trip Management Module"]
        BookingMod["Booking & Reservation Module"]
        PaymentMod["Payment & Settlement Module"]
        AIMod["LangGraph Agent & Trip Planner Module"]
        RecMod["Recommendation & NC Score Engine"]
        NotifMod["Notification & Communication Module"]
    end

    subgraph Storage ["Database & Storage Layer"]
        PostgreSQL[("PostgreSQL 16 Primary DB")]
        PGVector[("pgvector (768-dim Embeddings / HNSW)")]
        Redis[("Redis 7 (Session, Cache & Task Broker)")]
    end

    subgraph Integrations ["External Service Integrations"]
        GeminiAPI["Google Gemini LLM & Embeddings"]
        RazorpayAPI["Razorpay Payment Gateway"]
        CloudinaryCDN["Cloudinary Media CDN"]
        ResendEmail["Resend Email API"]
    end

    SPA --> Contexts
    SPA --> ClientAPI
    ClientAPI -->|HTTPS REST + Bearer JWT| FastAPIApp
    FastAPIApp --> SecHeaders --> ReqContext --> CORSMid --> RateLimiter --> AuthGuard

    AuthGuard --> AuthMod
    AuthGuard --> MarketMod
    AuthGuard --> TripMod
    AuthGuard --> BookingMod
    AuthGuard --> PaymentMod
    AuthGuard --> AIMod
    AuthGuard --> RecMod
    AuthGuard --> NotifMod

    AuthMod & MarketMod & TripMod & BookingMod & PaymentMod & AIMod & RecMod & NotifMod --> PostgreSQL
    MarketMod & RecMod & AIMod --> PGVector
    FastAPIApp & AIMod & RecMod -.-> Redis

    ClientAPI <--> RazorpayModal
    RazorpayModal <--> RazorpayAPI
    PaymentMod <--> RazorpayAPI
    AIMod <--> GeminiAPI
    MarketMod -.-> CloudinaryCDN
    NotifMod -.-> ResendEmail
```

---

## 2. Frontend Architecture

The frontend is built on **React 18**, **TypeScript 5**, **Vite 5**, and **Tailwind CSS 3**. It is organized around role-specific shell layouts, centralized reactive contexts, declarative route guards, and an Axios-based typed client.

### 2.1 Four Application Shells & Layouts

```text
frontend/src/layouts/
├── PublicLayout.tsx      # Public website shell: Navbar, hero headers, marketing footer
├── CustomerLayout.tsx    # Traveler app (/app): Bottom nav, search bar, floating AI assistant
├── PartnerLayout.tsx     # Host studio (/partner): Sidebar, KYC alerts, listing wizards
└── AdminLayout.tsx       # Operator portal (/admin): Dense metrics table, moderation queue
```

| Shell / Area | Route Prefix | Target User | Security / Access | Key Navigation Elements |
|---|---|---|---|---|
| **Public Website** | `/` | Prospective travelers & hosts | Public / Anonymous | Public Navbar, Discovery, About, FAQ, Partner Teaser |
| **Customer App** | `/app`, `/trips` | Registered tourists | Authenticated Customer | Customer Header, Explore Feed, Trip Drawer, Bookings Bar |
| **Partner Studio** | `/partner`, `/creator` | Farm hosts, guides, creators | Authenticated (`PARTNER`, `CREATOR`) | Partner Studio Sidebar, KYC Verification, Listings Manager |
| **Admin Console** | `/admin` | Platform operators | Authenticated (`ADMIN`) | High-density Admin Sidebar, Audit Logs, Payout Approvals |

### 2.2 Client State & Routing Architecture

1. **Context Providers** (`frontend/src/contexts/`):
   - `AuthContext`: Manages login session, current user state, token refresh triggers, and role definitions.
   - `ThemeContext`: Toggles `light`, `dark`, and `system` themes via the root `<html>` class list and `localStorage`.
   - `I18nContext`: Supplies reactive multi-language strings across English (`en`), Kannada (`kn`), and Hindi (`hi`).
2. **Route Guarding Components** (`frontend/src/routes/`):
   - `PublicRoute`: Unauthenticated access; automatically redirects authenticated users to their respective home dashboard.
   - `ProtectedRoute`: Validates token presence; redirects unauthenticated users to `/login?returnUrl=...`.
   - `RoleGuard`: Compares current JWT role against allowable permissions (`CUSTOMER`, `PARTNER`, `CREATOR`, `ADMIN`); renders a strict 403 Forbidden screen on violation.
3. **API Client Layer** (`frontend/src/services/api-client.ts`):
   - Injects `Authorization: Bearer <nc_access_token>` into every outbound request.
   - Intercepts `401 Unauthorized` responses and automatically initiates a single-flight token refresh against `/api/v2/auth/refresh`.
   - Queues concurrent failing requests during refresh to prevent race conditions and token thrashing.

---

## 3. FastAPI Backend Architecture

The backend is engineered with **FastAPI** (Python 3.10+) adhering to a clean **Domain-Driven Modular Monolith** topology.

### 3.1 Separation of Concerns (SoC) Flow

```text
HTTP Request
     │
     ▼
[Middleware Pipeline] (Security Headers, Request Context, CORS, Rate Limit)
     │
     ▼
[FastAPI Router] (/api/v2/...)
     │
     ▼
[Dependencies & Guards] (get_db, get_current_user, require_role)
     │
     ▼
[Application Service Layer] (Pure business rules, validations, orchestrations)
     │
     ▼
[Repository Layer] (SQLAlchemy ORM queries, database operations)
     │
     ▼
[PostgreSQL Database / Redis]
```

### 3.2 Directory Hierarchy

```text
backend/app/
├── api/
│   ├── health.py            # /health monitoring endpoint
│   └── v2/                  # API v2 aggregation router & legacy endpoints
├── core/
│   ├── config.py            # Pydantic Settings configuration with runtime validation
│   ├── database.py          # SQLAlchemy 2 engine, SessionLocal, and declarative Base
│   ├── logging.py           # Structured JSON and colored console logger
│   ├── security.py          # Cryptographic hashing (Argon2id/Bcrypt) & JWT encode/decode
│   └── rate_limiter.py      # Redis token bucket rate limiter dependency
├── dependencies/            # FastAPI Dependency Injection helpers (auth, db, rbac)
├── middleware/              # SecurityHeaders, RequestContext, CORS, ExceptionHandlers
├── models/                  # Declarative SQLAlchemy ORM models
├── modules/                 # Modular Domain Packages:
│   ├── admin/               # Platform administration & moderation
│   ├── ai/                  # LangGraph orchestrator, trip planner, tools, LLM providers
│   ├── analytics/           # Interaction logging and KPI aggregation
│   ├── auth/                # Identity, token lifecycle, OTP verification
│   ├── booking/             # Reservation lifecycle and availability validation
│   ├── marketplace/         # Services catalog, listings, categories
│   ├── messaging/           # In-app customer-host direct chat
│   ├── notification/        # Database notifications & transactional dispatch
│   ├── payment/             # Razorpay order generation & HMAC-SHA256 signature verification
│   ├── provider/            # Host KYC onboarding & partner intelligence
│   ├── recommendation/      # NC Score engine & behavioral personalization
│   ├── review/              # Post-trip customer reviews & ratings
│   ├── support/             # Help tickets & dispute management
│   ├── trip/                # Multi-day trip itineraries & trip day/item persistence
│   └── user/                # Profile management & role assignment
├── repositories/            # Data access abstractions
├── schemas/                 # Pydantic v2 request/response schemas
├── services/                # Cross-cutting business services (email, cloudinary, translation)
└── main.py                  # Monolithic FastAPI app instance, lifespan, middleware mounting
```

### 3.3 Lifespan Management

On startup, FastAPI executes the lifespan context:
1. Initializes structured logging and request context formatters.
2. Validates runtime environment configuration without silent fallbacks.
3. Verifies PostgreSQL connectivity and executes `CREATE EXTENSION IF NOT EXISTS vector`.
4. Establishes Redis connection pools for caching and rate limiting.

---

## 4. PostgreSQL Architecture & Relational Schema

Database persistence is handled by **PostgreSQL 16** using **SQLAlchemy 2.0** with **Alembic** migrations. All models utilize UUID primary keys to ensure distributed safety and prevent enumeration attacks.

### 4.1 Entity-Relationship Overview

```mermaid
erDiagram
    users ||--o{ services : "hosts"
    users ||--o{ bookings : "places"
    users ||--o{ trips : "owns"
    users ||--o| creator_profiles : "has"
    users ||--o{ partner_applications : "submits"
    users ||--o{ notifications : "receives"
    users ||--o{ reviews : "writes"
    users ||--o{ payouts : "requests"

    services ||--o{ bookings : "reserved_in"
    services ||--o{ reviews : "receives"
    services ||--o{ trip_items : "referenced_in"
    services ||--o{ saved_services : "bookmarked_in"

    trips ||--o{ trip_days : "contains"
    trip_days ||--o{ trip_items : "schedules"
    trips ||--o| ai_trip_plans : "generated_from"

    bookings ||--o| payments : "settled_by"
    bookings ||--o| refunds : "triggers"

    users {
        uuid id PK
        string email UK
        string hashed_password
        enum role "CUSTOMER, PARTNER, CREATOR, ADMIN"
        string full_name
        string mobile
        boolean is_active
        boolean is_verified
        timestamp created_at
    }

    services {
        uuid id PK
        uuid provider_id FK
        string title
        string slug UK
        string category
        string district
        decimal price
        string unit
        decimal rating
        int max_capacity
        vector embedding "768-dim pgvector"
        enum status "DRAFT, PENDING, PUBLISHED, REJECTED"
        boolean is_active
    }

    trips {
        uuid id PK
        uuid user_id FK
        string title
        string destination
        date start_date
        date end_date
        enum status "PLANNED, ACTIVE, COMPLETED, CANCELLED"
        boolean ai_generated
        string created_by "USER, AI"
    }

    trip_days {
        uuid id PK
        uuid trip_id FK
        int day_number
        date date
        string title
        text notes
    }

    trip_items {
        uuid id PK
        uuid trip_day_id FK
        uuid service_id FK
        string title
        string item_type "SERVICE, CUSTOM"
        string start_time
        string end_time
        int duration_minutes
        int sequence_order
        boolean is_booked
    }

    bookings {
        uuid id PK
        string booking_code UK
        uuid customer_id FK
        uuid service_id FK
        uuid provider_id FK
        date start_date
        date end_date
        int guests
        decimal total_price
        decimal platform_fee
        enum status "PENDING, CONFIRMED, COMPLETED, CANCELLED"
        enum payment_status "PENDING, PAID, FAILED, REFUNDED"
    }

    payments {
        uuid id PK
        uuid booking_id FK
        string razorpay_order_id UK
        string razorpay_payment_id UK
        decimal amount
        string currency
        enum status "PENDING, ORDER_CREATED, PAID, FAILED, REFUNDED"
    }
```

---

## 5. pgvector & Vector Semantic Search

To enable natural language discovery across Karnataka's rural catalog, Namma Connect uses **pgvector** inside PostgreSQL.

### 5.1 Dense Embedding Pipeline
- Model: Google Gemini `embedding-001` (or deterministic 768-dim mathematical fallback in offline/test environments).
- Dimension: **768 dimensions**.
- Ingestion: Service titles, descriptions, categories, districts, and inclusions are serialized into text chunks and vectorized upon listing creation or updates.

### 5.2 HNSW Indexing Specification
Vector search uses a Hierarchical Navigable Small World (HNSW) index using cosine distance operators:
```sql
CREATE INDEX ix_services_embedding_hnsw
ON services USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 5.3 Hybrid Retrieval Engine
`SemanticSearchService` combines vector similarity with hard relational SQL filtering:
1. Computes cosine distance `(embedding <=> :query_vector)`.
2. Applies relational predicates (`status = 'PUBLISHED'`, `district = :district`, `price <= :max_budget`, `is_active = true`).
3. Sorts by blended score: \( \text{Score} = 0.70 \times \text{SemanticSimilarity} + 0.10 \times \text{CategoryMatch} + 0.10 \times \text{LocationMatch} + 0.05 \times \text{Rating} + 0.05 \times \text{Availability} \).

---

## 6. LangGraph Architecture & Namma AI Orchestrator

The conversational intelligence layer is structured as a stateful graph using **LangGraph** (`langgraph.graph.StateGraph`).

### 6.1 Unified Agentic Workflow

The complete end-to-end journey from natural language prompt to confirmed trip:

```text
User
 ↓
Namma AI
 ↓
Intent Router
 ├── General Travel Request
 ├── Trip Planner
 └── Booking
       ↓
Trip Planner
 ↓
Validate
 ↓
Persist
 ↓
Booking Readiness
 ↓
Explicit Approval
 ↓
Booking
 ↓
Payment
 ↓
Confirmed Trip
```

### 6.2 LangGraph StateGraph Definition

The compiled LangGraph workflow consists of 7 functional nodes:

```mermaid
flowchart TD
    START([START]) --> Understand["understand_request"]
    Understand --> LoadContext["load_user_context"]
    LoadContext --> Decide["decide_actions"]

    Decide -->|Approval Pending| Respond["respond"]
    Decide -->|Booking Intent / Cancel / Modify| Booking["booking"]
    Decide -->|Trip Plan / Refinement / Action| Planner["trip_planner"]
    Decide -->|Search / Details / Recommendations| Tools["tool_execution"]

    Tools -->|Has Trip Context / Refinement| Planner
    Tools -->|Direct Result Ready| Respond

    Planner --> Respond
    Booking --> Respond
    Respond --> END([END])
```

#### Node Responsibilities:
1. **`understand_request`**: Classifies incoming human message, detects natural language (English, Kannada, Hindi), and parses extracted entities (districts, dates, party size, budget, preferences).
2. **`load_user_context`**: Rehydrates traveler session from database—fetches active bookings, saved services, ongoing trip itineraries, and previous conversation turns.
3. **`decide_actions`**: Policy engine assessing whether the intent requires general discovery, itinerary synthesis, booking execution, or human-in-the-loop approval.
4. **`tool_execution`**: Invokes authorized backend tools (`search_services`, `get_service_details`, `get_service_availability`, `get_user_recommendations`) with bounded parameters.
5. **`trip_planner`**: Executes multi-day schedule construction, runs deterministic constraint validation, and builds persisted `TripDay` / `TripItem` structures.
6. **`booking`**: Verifies booking readiness, enforces explicit user approval, validates inventory capacity, and creates pending reservation records.
7. **`respond`**: Generates grounded, culturally nuanced markdown responses in the user's detected language.

---

## 7. Intent Routing & Language Detection

The conversational orchestrator classifies requests into 6 distinct intents:

| Intent | Trigger Pattern | Route / Execution |
|---|---|---|
| `GENERAL_CHAT` | General Karnataka culture, seasons, travel advice | Fast LLM response with system travel knowledge |
| `MARKETPLACE_SEARCH` | *"Find homestays in Sakleshpur under 2000"* | `search_services` tool $\to$ Grounded listings display |
| `RECOMMENDATION` | *"What should I do this weekend?"* | `RecommendationService` hybrid personalized pipeline |
| `SERVICE_DETAILS` | *"Tell me more about the Coorg coffee tour"* | `get_service_details` tool with verified inclusions |
| `AVAILABILITY_CHECK` | *"Is there room for 4 guests next Saturday?"* | `get_service_availability` slot verification |
| `TRIP_PLAN` | *"Plan a 3-day trip to Chikmagalur for 2 people"* | Triggers Step-by-Step **Agentic Trip Planner** |

### Language Detection
The orchestrator uses script and vocabulary detection:
- **Kannada (`kn`)**: Detects Kannada Unicode range (`U+0C80` to `U+0CFF`) or phonetic Kannada keywords.
- **Hindi (`hi`)**: Detects Devanagari range (`U+0900` to `U+097F`) or Hindi vocabulary.
- **English (`en`)**: Default fallback language.

---

## 8. Agentic Trip Planner Workflow

The Trip Planner moves through an explicit 9-state machine with deterministic validation:

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> COLLECTING: User initiates trip prompt
    COLLECTING --> COLLECTING: Missing essential parameters (Dates/Budget)
    COLLECTING --> SEARCHING: Requirements collected
    SEARCHING --> BUILDING: Verified candidates retrieved
    BUILDING --> VALIDATING: Structured daily slots mapped
    VALIDATING --> REFINING: Collision or budget overflow detected
    REFINING --> VALIDATING: Swapped / Re-scheduled
    VALIDATING --> READY_FOR_REVIEW: Zero conflicts verified
    READY_FOR_REVIEW --> REFINING: User manual adjustment requested
    READY_FOR_REVIEW --> CONFIRMED: User explicitly approves proposal
    CONFIRMED --> HANDED_OFF: Hand off to booking & checkout
    HANDED_OFF --> [*]
```

### 8.1 Deterministic Conflict & Constraint Validation
Unlike unconstrained LLM generators that hallucinate impossible timelines, `ItineraryValidator` runs deterministic arithmetic and calendar checks:
- **Time Slot Overlaps**: Computes exact start and end minute boundaries on each day to prevent concurrent scheduling collisions.
- **Live Inventory Capacity**: Verifies that party size \(\le\) `service.max_capacity` and that dates do not hit blackout windows.
- **Date Consistency**: Enforces all items fall between trip `start_date` and `end_date`.
- **Budget Ceiling**: Asserts that \(\sum \text{Item Estimated Cost} \le \text{User Target Budget}\).

### 8.2 Iterative Refinement Actions
- `REPLACE`: Swaps a specific item for an alternative verified service in the same district.
- `REMOVE`: Removes an activity from a day schedule and re-sequences remaining slots.
- `REDUCE_BUDGET`: Automatically identifies top-cost items and substitutes them with lower-cost alternatives until total cost \(\le\) target budget.

---

## 9. Persistent Conversation & Trip Architecture

### 9.1 LangGraph State Checkpointing
Agent execution state is checkpointed in PostgreSQL using `SQLAlchemyCheckpointSaver`. Every conversation turn stores:
- `thread_id`: Bound to `AIConversation.id`.
- `checkpoint`: Serialized state containing extracted constraints, candidate service IDs, draft itinerary, pending approval flags, and message history.

### 9.2 Trip Persistence Model
When a trip is confirmed by the traveler:
1. `TripPersistenceEngine` creates a root `Trip` record (`ai_generated=True`, `status='PLANNED'`).
2. Iterates over planned days to insert `TripDay` records (`day_number`, `date`, `title`).
3. Inserts schedule rows into `TripItem` (`service_id`, `start_time`, `end_time`, `sequence_order`, `is_booked=False`).
4. Creates an `AITripPlan` record storing the initial prompt, preferences JSON, constraints JSON, and model provenance.

---

## 10. Rehydration, Booking Readiness & Approval Flow

### 10.1 Rehydration Flow
When a user returns to the chat or opens an existing trip:
1. The backend loads the conversation thread and rehydrates previous turns.
2. Cross-references persisted `TripItem` IDs with the live database to check current pricing and real-time availability.
3. Injects live status flags into the agent state before evaluating the next user turn.

### 10.2 Booking Readiness Check
Before initiating any reservation, the system validates:
- [x] All scheduled items have verified, published `service_id` references.
- [x] Host provider accounts are active and KYC-verified.
- [x] Requested dates have open capacity for the requested guest count.
- [x] The traveler is authenticated and is not the host of the service (preventing self-booking).

### 10.3 Explicit Approval Flow (Human-in-the-Loop)
Namma Connect strictly forbids autonomous financial charges:
- The AI presents a structured **Itinerary Proposal** with itemized costs, dates, and provider details.
- The user must provide **Explicit Approval** (e.g., clicking *"Confirm Itinerary"* or saying *"Yes, proceed to booking"*).
- The state transitions from `READY_FOR_REVIEW` to `CONFIRMED`.
- Only then does the engine generate the `booking-handoff` payload.

---

## 11. Booking Execution & Razorpay Payment Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Traveler as Customer / Traveler
    participant SPA as React Frontend SPA
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL 16 DB
    participant Razorpay as Razorpay Gateway

    Traveler->>SPA: Select Service, Dates & Guests (or Approve AI Plan)
    SPA->>Backend: POST /api/v2/bookings
    Backend->>Backend: Compute authoritative server-side price (paise)
    Backend->>DB: Insert Booking (status='PENDING', payment_status='PENDING')
    DB-->>Backend: Booking Created
    Backend-->>SPA: Return Booking Summary
    
    Traveler->>SPA: Click "Pay with Razorpay"
    SPA->>Backend: POST /api/v2/payments/create-order
    Backend->>Razorpay: orders.create(amount_in_paise, currency='INR')
    Razorpay-->>Backend: order_id (e.g. order_xyz123)
    Backend->>DB: Create Payment (status='ORDER_CREATED')
    Backend-->>SPA: Return order_id, key_id, amount
    
    SPA->>Razorpay: Open Razorpay Checkout Modal
    Traveler->>Razorpay: Complete Payment (Card / UPI / NetBanking)
    Razorpay-->>SPA: Return razorpay_payment_id & razorpay_signature
    
    SPA->>Backend: POST /api/v2/payments/verify
    Backend->>Backend: Verify HMAC-SHA256 signature
    Backend->>DB: Update Payment -> 'PAID', Booking -> 'CONFIRMED'
    Backend->>DB: Trigger Customer & Provider Notifications
    Backend-->>SPA: Verification Successful (Confirmed Booking)
    SPA-->>Traveler: Display Receipt & Itinerary Confirmation
```

### 11.1 Authoritative Pricing Principles
- **No Client-Side Pricing**: The client never passes financial totals. Price is calculated as:
  $$\text{Total Price} = (\text{service.price} \times \text{units} \times \text{guests}) + \text{Platform Fee}$$
- **Integer Standard**: Razorpay transactions are computed in **paise** (1 INR = 100 paise) to eliminate IEEE-754 floating-point inaccuracies.

### 11.2 Cryptographic Signature Verification
Payment confirmations require strict HMAC-SHA256 signature validation:
```python
message = f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
expected_signature = hmac.new(
    key=settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
    msg=message,
    digestmod=hashlib.sha256,
).hexdigest()

if not hmac.compare_digest(expected_signature, razorpay_signature):
    raise HTTPException(status_code=400, detail="Invalid cryptographic payment signature.")
```

### 11.3 Idempotency & Webhook Resilience
- Re-verifying an already `PAID` booking returns the verified confirmation safely without duplicate state transitions or duplicate notification dispatches.
- Asynchronous webhook at `POST /api/v2/payments/webhook` verifies webhook signatures using `RAZORPAY_WEBHOOK_SECRET` to capture asynchronous gateway events (`payment.captured`, `payment.failed`).

---

## 12. Agent Tools & Security Boundaries

The LLM is strictly isolated from direct database queries or raw Python execution. All tool executions flow through typed classes registered in `AIToolRegistry`:

| Tool Name | Underlying Service / Repository | Access Control |
|---|---|---|
| `search_services` | `MarketplaceRepository.search_services()` | Public / Authenticated |
| `get_service_details` | `MarketplaceRepository.get_service_by_id()` | Public / Authenticated |
| `get_service_availability` | `MarketplaceRepository.get_availabilities()` | Public / Authenticated |
| `get_categories` | `MarketplaceRepository.list_active_categories()` | Public / Authenticated |
| `get_user_recommendations` | `RecommendationService.get_personalized_recommendations()` | Authenticated (Own User) |
| `get_user_saved_services` | `MarketplaceRepository.list_saved_services()` | Authenticated (Own User) |
| `get_user_trips` | `TripRepository.list_user_trips()` | Authenticated (Own User) |

### 12.1 Security Guarantees
- **Tenant Isolation**: Tools verify `user_id == current_user.id`. Cross-user access returns HTTP 403 Forbidden.
- **Zero Hallucination Grounding**: The LLM prompt strictly forbids fabricating non-existent prices, unverified hosts, or discounts not present in tool outputs.

---

## 13. Production Considerations

1. **Database Connection Pooling**: AsyncPG connection pool (`pool_size=20`, `max_overflow=10`, `pool_pre_ping=True`) for high concurrency.
2. **Stateless Backend Scaling**: Backend containers carry zero in-memory session state; all state lives in PostgreSQL or Redis.
3. **Structured Logging & Correlation**: Every request receives a unique `X-Request-ID` attached to log lines and error payloads.
4. **Graceful Fallbacks**: If external APIs (Gemini, Cloudinary, Resend) experience outages, the system activates local fallbacks (deterministic lexical search, local mock notifications) without crashing the application.
