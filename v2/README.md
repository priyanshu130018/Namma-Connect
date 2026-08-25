# NammaConnect V2 — Technical Architecture & Developer Guide

Welcome to the **V2** codebase of **NammaConnect**, a production-grade agro-tourism and rural Karnataka experience marketplace connecting **Tourists / Customers**, **Farmers & Experience Partners**, **Content Creators**, and **Platform Administrators**.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [V2 Goals & Architectural Approach](#2-v2-goals--architectural-approach)
3. [Key Features](#3-key-features)
4. [Architecture Overview](#4-architecture-overview)
5. [Technology Stack](#5-technology-stack)
6. [Project Structure](#6-project-structure)
7. [Authentication System](#7-authentication-system)
8. [Authorization & Role-Based Access Control (RBAC)](#8-authorization--role-based-access-control-rbac)
9. [Booking Workflow](#9-booking-workflow)
10. [Razorpay Payment Architecture](#10-razorpay-payment-architecture)
11. [Payment Lifecycle & States](#11-payment-lifecycle--states)
12. [Namma AI & Vector Semantic Search](#12-namma-ai--vector-semantic-search)
13. [Notification Subsystem](#13-notification-subsystem)
14. [Partner / Provider Portal](#14-partner--provider-portal)
15. [Creator & Collaboration System](#15-creator--collaboration-system)
16. [Admin Management Portal](#16-admin-management-portal)
17. [Unified Marketplace Search](#17-unified-marketplace-search)
18. [Trips & Booking History](#18-trips--booking-history)
19. [Internationalization & Language System](#19-internationalization--language-system)
20. [Theme System (Dark / Light Mode)](#20-theme-system-dark--light-mode)
21. [Responsive Design](#21-responsive-design)
22. [Database Schema & Migrations](#22-database-schema--migrations)
23. [API Reference](#23-api-reference)
24. [Environment Variables](#24-environment-variables)
25. [Developer Quickstart & Setup](#25-developer-quickstart--setup)
26. [Running the Application](#26-running-the-application)
27. [Development Tools & Data Seeding](#27-development-tools--data-seeding)
28. [Automated Testing & Verification](#28-automated-testing--verification)
29. [Security Engineering](#29-security-engineering)
30. [Maintenance & Development Principles](#30-maintenance--development-principles)
31. [Known Limitations & Fallback Behaviors](#31-known-limitations--fallback-behaviors)
32. [Troubleshooting Guide](#32-troubleshooting-guide)
33. [V2 Summary](#33-v2-summary)

---

## 1. Overview

**NammaConnect V2** is a modern, full-stack digital marketplace tailored for rural tourism, farm stays, agro-workshops, culinary heritage, and guided experiences across the districts of Karnataka.

V2 transitions NammaConnect from an MVP into a scalable, production-ready system featuring:
- **Authoritative Payment Lifecycle**: Secure Razorpay integration in Test Mode with cryptographic HMAC-SHA256 signature validation and idempotent confirmations.
- **AI-Powered Discovery**: Hybrid semantic search powered by pgvector (768-dimensional embeddings) and conversational travel planning via Google Gemini.
- **Progressive Partner Onboarding**: Multi-step partner verification (KYC) and administrative service moderation workflows.
- **Role-Based Portals**: Dedicated, optimized layouts for Customers, Service Providers, Content Creators, and Administrators.
- **Localized Experience**: Multi-language support (English, Kannada, Hindi) and fluid dark/light theming.

---

## 2. V2 Goals & Architectural Approach

1. **Separation of Concerns**: Strict decoupling of API routers, service business logic, data access repositories, and database models.
2. **Backend as Source of Truth**: All financial calculations, availability collisions, discount applications, and permission checks are strictly computed server-side.
3. **Database-Driven State**: Migration from memory/ephemeral state to transactional persistence in PostgreSQL 16 using SQLAlchemy 2.0 and Alembic.
4. **Resilient Third-Party Integrations**: Fallbacks and graceful degradations for external APIs (Google Gemini, Razorpay, Cloudinary, Resend, Redis).
5. **Deterministic Testing**: Isolated database suites with 100% automated test coverage across backend (`pytest`) and frontend (`vitest`).

---

## 3. Key Features

### 🧳 Customer / Tourist Experience
- **Interactive Marketplace**: Browse and filter experiences by category (Stay, Food, Guides & Tours, Experiences), location/district, price range, and rating.
- **Semantic & Keyword Search**: AI-powered natural language queries (e.g., *"organic coffee plantation stay with guided harvest in Coorg"*).
- **Date & Slot Availability**: Real-time calendar availability selection with instant pricing computation.
- **Razorpay Checkout**: Seamless modal payment handling INR amounts with instant confirmation receipts.
- **My Trips Management**: Categorized view of Upcoming, Active, Completed, and Cancelled trips with cancellation/refund requests.
- **Saved Services**: Wishlist bookmarking accessible across sessions.
- **Conversational Travel AI**: Floating AI chatbot assistant capable of crafting tailored multi-day Karnataka itineraries.
- **Reviews & Ratings**: Post verified reviews with star ratings and feedback after trip completion.

### 🧑‍🌾 Partner / Provider Experience
- **Partner Application Flow**: Multi-step onboarding submitting business details, government ID/Aadhaar, and farm locations.
- **Service Management**: Create, edit, and manage rich service listings (pricing models, units, amenities, high-resolution photos) subject to admin approval.
- **Availability Management**: Define blackout dates, maximum guest capacity, and slot schedules.
- **Bookings Dashboard**: Accept or decline reservations, review guest manifests, and track fulfillment status.
- **Financial Center**: Real-time earnings summary, gross transaction tracking, commission deductions, and payout request logs.

### 🎬 Creator / Influencer Experience
- **Creator Profiles**: Public portfolios highlighting content niches, social metrics (Instagram/YouTube), and collaboration rates.
- **Brand Collaborations**: Structured workflow for receiving, negotiating, and executing host sponsorship invitations.
- **Collaboration States**: Track proposal lifecycle (`PENDING` → `ACCEPTED` / `REJECTED` → `COMPLETED`).

### 🛡️ Administrator Management
- **Central Dashboard**: High-level platform statistics (Gross Volume, Commission, Active Users, Pending Moderations).
- **Partner KYC Moderation**: Review and approve/reject partner applications with reviewer notes.
- **Service Listing Moderation**: Audit newly submitted or edited services (`PENDING` → `APPROVED` / `REJECTED`).
- **User Management**: Search, inspect, role-promote, or deactivate user accounts.
- **Financial Audit**: Global ledger of Razorpay transactions, platform commissions, and provider payout disbursements.

---

## 4. Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 18 + TypeScript + Vite)"]
        SPA["React SPA (Routes & Pages)"]
        Contexts["Auth / Theme / I18n Contexts"]
        ClientAPI["Axios Client (services/api.ts)"]
        RazorpayModal["Razorpay Checkout SDK"]
    end

    subgraph Backend ["Backend API (FastAPI + Python 3.10+)"]
        Router["FastAPI Router (/api/v2)"]
        AuthMid["Auth & RBAC Dependencies"]
        Services["Domain Services (Payment, Booking, AI, Search)"]
        Repos["SQLAlchemy Repositories"]
    end

    subgraph Data ["Data & Cache Layer"]
        Postgres[("PostgreSQL 16")]
        PGVector[("pgvector (768-dim embeddings)")]
        Redis[("Redis (Caching & Rate Limiting)")]
    end

    subgraph External ["External Integrations"]
        RazorpayGateway["Razorpay Payment Gateway"]
        GoogleGemini["Google Gemini AI & Embeddings"]
        CloudinaryAPI["Cloudinary CDN"]
        ResendAPI["Resend Email API"]
    end

    SPA --> Contexts
    SPA --> ClientAPI
    ClientAPI -->|HTTP REST + Bearer JWT| Router
    Router --> AuthMid
    AuthMid --> Services
    Services --> Repos
    Repos --> Postgres
    Services --> PGVector
    Services -.-> Redis

    ClientAPI <--> RazorpayModal
    RazorpayModal <--> RazorpayGateway
    Services <--> RazorpayGateway
    Services <--> GoogleGemini
    Services -.-> CloudinaryAPI
    Services -.-> ResendAPI
```

---

## 5. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18 (`react`, `react-dom`) | Declarative, component-driven UI architecture |
| **Language & Build** | TypeScript 5, Vite 5 | Type-safe development and optimized production bundling |
| **Styling & UI** | Tailwind CSS 3, Lucide React, CVA | Responsive utility styling, UI icons, variant management |
| **Internationalization** | Custom TypeScript i18n framework | Multi-language support (English, Kannada, Hindi) |
| **Client Testing** | Vitest, React Testing Library, jsdom | Component rendering and unit test suite |
| **Backend Framework** | FastAPI (Python 3.10+) | High-throughput asynchronous REST API |
| **ASGI Server** | Uvicorn | Production-grade async HTTP server |
| **Database ORM** | SQLAlchemy 2.0 (Sync & Async) | Object-relational database mapping and repository access |
| **Database Migrations**| Alembic | Version-controlled, reproducible database schema migrations |
| **Relational DB & Vector** | PostgreSQL 16 with `pgvector` | Persistent ACID transactions and 768-dim cosine vector similarity |
| **Cache & Sessions** | Redis 7 | High-speed in-memory caching and session acceleration |
| **Payment Gateway** | Razorpay Python SDK & Checkout | Authoritative payment orders, webhooks, and HMAC signature verification |
| **Generative AI** | Google Gemini (`gemini-1.5`, `embedding-001`) | Natural language itinerary planning and catalog embedding |
| **Media Storage** | Cloudinary | Cloud image upload, transformation, and CDN hosting |
| **Email Delivery** | Resend API | Transactional notifications and verification emails |
| **Backend Testing** | Pytest, FastAPI TestClient | Automated integration, security, and repository test suites |

---

## 6. Project Structure

```text
v2/
├── README.md                      # V2 Technical Documentation
├── docker-compose.yml             # Full-stack container orchestration
├── backend/                       # FastAPI Backend Service
│   ├── Dockerfile                 # Backend containerization spec
│   ├── alembic.ini                # Alembic migration configuration
│   ├── requirements.txt           # Python dependency manifest
│   ├── alembic/                   # Database version scripts
│   │   ├── env.py                 # Alembic environment runner
│   │   └── versions/              # Migration steps (0001 to 0004)
│   │       ├── 0001_initial_core_schema.py
│   │       ├── 0002_create_partner_applications.py
│   │       ├── 0003_add_service_moderation_fields.py
│   │       └── 0004_add_is_test_data_and_pgvector_embedding.py
│   ├── app/
│   │   ├── main.py                # FastAPI app initialization, middleware, lifespan
│   │   ├── api/                   # API routing
│   │   │   ├── health.py          # /api/health monitoring endpoint
│   │   │   └── v2/
│   │   │       ├── router.py      # Aggregates all v2 endpoint routers
│   │   │       └── endpoints/     # Feature-specific route controllers
│   │   │           ├── admin.py
│   │   │           ├── ai.py
│   │   │           ├── auth.py
│   │   │           ├── bookings.py
│   │   │           ├── collaborations.py
│   │   │           ├── creators.py
│   │   │           ├── earnings.py
│   │   │           ├── messages.py
│   │   │           ├── notifications.py
│   │   │           ├── partner_applications.py
│   │   │           ├── payments.py
│   │   │           ├── payouts.py
│   │   │           ├── search.py
│   │   │           ├── services.py
│   │   │           ├── support.py
│   │   │           └── users.py
│   │   ├── core/                  # Engine configurations
│   │   │   ├── config.py          # Pydantic Settings (.env loader)
│   │   │   ├── database.py        # Database sessions & engine lifecycle
│   │   │   ├── logging.py         # Structured logging configuration
│   │   │   └── security.py        # Passlib (Argon2id/bcrypt) & JWT operations
│   │   ├── dependencies/          # Injected route dependencies
│   │   │   ├── auth.py            # get_current_user, get_optional_user
│   │   │   ├── database.py        # get_db session dependency
│   │   │   └── rbac.py            # Role verification guards
│   │   ├── models/                # SQLAlchemy declarative ORM models
│   │   │   ├── base.py            # Base declarative model & GUID types
│   │   │   ├── booking.py         # Booking model
│   │   │   ├── collaboration.py   # Collaboration proposals
│   │   │   ├── creator.py         # Creator profile
│   │   │   ├── message.py         # Messaging & conversations
│   │   │   ├── notification.py    # Database notifications
│   │   │   ├── partner_application.py # KYC applications
│   │   │   ├── payment.py         # Transaction records
│   │   │   ├── payout.py          # Provider payout records
│   │   │   ├── refund.py          # Refund transaction tracking
│   │   │   ├── saved_service.py   # Wishlist items
│   │   │   ├── service.py         # Service & Review models with Vector column
│   │   │   ├── support.py         # Support tickets
│   │   │   └── user.py            # User entity
│   │   ├── repositories/          # Data access layer
│   │   └── services/              # Pure business logic layer
│   │       ├── admin.py
│   │       ├── auth.py
│   │       ├── booking.py
│   │       ├── embedding.py       # pgvector & Gemini embedding generator
│   │       ├── gemini.py          # Multi-turn travel assistant
│   │       ├── payment.py         # Razorpay checkout & signature validator
│   │       ├── search.py          # Semantic & relational search service
│   │       └── ...
│   ├── scripts/                   # CLI maintenance & seeding utilities
│   │   ├── seed_dev_data.py       # Seeds 500+ users and 1,000+ Karnataka services
│   │   ├── generate_embeddings.py # Batch vector embedding calculator
│   │   └── clear_dev_data.py      # Cleans synthetic test data safely
│   └── tests/                     # 100% passing Pytest integration test suite
└── frontend/                      # React SPA Frontend
    ├── package.json               # Scripts and dependency registry
    ├── vite.config.ts             # Vite build settings & dev proxy
    ├── tsconfig.json              # TypeScript compilation rules
    └── src/
        ├── app/                   # Root App, ErrorBoundary, Theme & Context Providers
        ├── components/            # UI component design system
        │   ├── availability/      # Date & time slot picker widgets
        │   ├── booking/           # Booking modal & receipt dialogs
        │   ├── cards/             # ServiceCard & skeleton loaders
        │   ├── customer/          # Floating AI chat & support widgets
        │   ├── layout/            # Navbars, sidebars, and footers for all roles
        │   └── ui/                # Base primitives (Button, Dialog, Input, Select)
        ├── contexts/              # React state contexts (Auth, Theme, I18n)
        ├── hooks/                 # Custom reusable hooks
        ├── i18n/                  # Translation dictionaries (English, Kannada, Hindi)
        ├── layouts/               # CustomerLayout, PartnerLayout, AdminLayout, PublicLayout
        ├── routes/                # Page route handlers
        │   ├── admin/             # Admin console views
        │   ├── customer/          # Marketplace, ServiceDetail, BookingDetail, Profile
        │   ├── partner/           # Provider onboarding, listings, bookings, earnings
        │   └── public/            # Landing, About, Contact, Auth views
        ├── services/              # HTTP clients & Razorpay checkout integration
        ├── types/                 # Shared TypeScript interfaces
        └── tests/                 # Vitest component test suites
```

---

## 7. Authentication System

NammaConnect V2 features an enterprise authentication architecture:
- **JWT (JSON Web Tokens)**:
  - **Access Token**: Short-lived (60 minutes) signed with `HS256` using `JWT_SECRET`. Carries user ID, email, and authoritative role.
  - **Refresh Token**: Long-lived (30 days) allowing seamless background session renewal.
- **Password Security**: Uses `passlib` supporting modern **Argon2id** and **bcrypt** cryptographic algorithms with automatic salting.
- **Google OAuth 2.0**: Validates client-side OAuth ID tokens on the backend using Google's verification library (`id_token.verify_oauth2_token`), automatically linking or registering accounts.
- **FastAPI Dependencies**:
  - `get_current_user`: Validates `Authorization: Bearer <token>` headers and fetches active user records.
  - `get_optional_user`: Allows public endpoints to optionally personalize responses for logged-in users.

---

## 8. Authorization & Role-Based Access Control (RBAC)

NammaConnect enforces 4 distinct system roles defined in `app.models.user.UserRole`:

```mermaid
graph TD
    User([Authenticated User]) --> RoleCheck{Role Evaluation}
    RoleCheck -->|CUSTOMER| CustomerRoutes["Marketplace, Bookings, Trips, Saved Services"]
    RoleCheck -->|PARTNER / PROVIDER| PartnerRoutes["Listing Creation, Availability, Booking Fulfillment, Earnings"]
    RoleCheck -->|CREATOR| CreatorRoutes["Portfolio, Collaborations, Social Media Metrics"]
    RoleCheck -->|ADMIN| AdminRoutes["Global Moderation, Partner Approvals, Financial Audit, User Admin"]
```

### Server-Side Enforcement Rules
1. **Frontend Role Decoupling**: The backend strictly ignores role assertions from the client; permissions are extracted solely from verified JWT payloads and database state.
2. **Endpoint Guards**: Routes are protected by declarative RBAC dependencies:
   ```python
   @router.get("/admin/stats")
   def get_stats(current_user: User = Depends(require_role(["ADMIN"]))):
       ...
   ```
3. **Resource Ownership Verification**: Every mutative action on bookings, services, or earnings verifies that `resource.user_id == current_user.id` or `current_user.role == "ADMIN"`.

---

## 9. Booking Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend as React SPA
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL 16
    participant Razorpay as Razorpay Test Gateway

    Customer->>Frontend: Select Service, Date & Guests
    Frontend->>Backend: GET /api/v2/services/{id}/availability
    Backend->>DB: Check active booking overlaps & blackout dates
    DB-->>Backend: Available
    Backend-->>Frontend: Availability confirmed
    Customer->>Frontend: Click "Reserve Now"
    Frontend->>Backend: POST /api/v2/bookings
    Backend->>Backend: Compute authoritative total price server-side
    Backend->>DB: Insert Booking (status='PENDING', payment_status='PENDING')
    DB-->>Backend: Booking Created
    Backend-->>Frontend: Return Booking Details & Summary
    Customer->>Frontend: Click "Pay with Razorpay"
    Frontend->>Backend: POST /api/v2/payments/create-order
    Backend->>Razorpay: Generate Razorpay Test Order (amount in paise)
    Razorpay-->>Backend: order_id (e.g. order_xyz123)
    Backend->>DB: Create Payment record (status='ORDER_CREATED')
    Backend-->>Frontend: Return key_id, order_id, amount
    Frontend->>Razorpay: Open Razorpay Checkout Modal
    Customer->>Razorpay: Complete Test Payment (Success)
    Razorpay-->>Frontend: Return razorpay_payment_id & razorpay_signature
    Frontend->>Backend: POST /api/v2/payments/verify
    Backend->>Backend: Verify HMAC-SHA256 signature
    Backend->>DB: Transition Payment -> 'PAID', Booking -> 'CONFIRMED'
    Backend->>DB: Trigger automated Customer & Host Notifications
    Backend-->>Frontend: Verification Successful
    Frontend-->>Customer: Display Booking Confirmation & Receipt
```

---

## 10. Razorpay Payment Architecture

NammaConnect V2 uses **Razorpay Test Mode** with server-authoritative amount calculations and cryptographic signature verification.

### Key Principles
1. **Server Amount Authority**: Clients never specify transaction amounts. The backend computes the final price from `service.price * units * guests` plus platform fees.
2. **Currency Unit Standard**: Amounts are passed to Razorpay in **paise** (1 INR = 100 paise) to prevent floating-point inaccuracies.
3. **Cryptographic Verification**:
   ```python
   msg = f"{razorpay_order_id}|{razorpay_payment_id}"
   expected_signature = hmac.new(
       key=settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
       msg=msg.encode("utf-8"),
       digestmod=hashlib.sha256
   ).hexdigest()

   if not hmac.compare_digest(expected_signature, client_signature):
       raise HTTPException(status_code=400, detail="Invalid cryptographic payment signature.")
   ```
4. **Idempotent Verification**: Re-sending verification for an already confirmed payment safely returns the verified state without duplicate transitions or notifications.
5. **Webhook Fallback**: `POST /api/v2/payments/webhook` listens for async gateway events (`payment.captured`, `payment.failed`).

---

## 11. Payment Lifecycle & States

```mermaid
stateDiagram-v2
    [*] --> PENDING: Reservation Created
    PENDING --> ORDER_CREATED: create-order executed
    ORDER_CREATED --> PAID: HMAC signature verified
    ORDER_CREATED --> FAILED: Payment declined / expired
    PAID --> REFUNDED: Cancellation & Refund approved
    FAILED --> ORDER_CREATED: User retries payment
    PAID --> [*]
    REFUNDED --> [*]
```

### State Definitions

| State | Description | Frontend UI Display |
|---|---|---|
| `PENDING` | Booking created; awaiting order initialization. | *"Awaiting Payment"* (Yellow badge with Pay Now action) |
| `ORDER_CREATED` | Gateway order generated; awaiting customer checkout. | *"Processing Checkout"* |
| `PAID` | Signature verified; booking confirmed. | *"Confirmed & Paid"* (Green badge with Download Receipt) |
| `FAILED` | Transaction failed or dismissed. | *"Payment Failed"* (Red badge with Retry option) |
| `REFUNDED` | Booking cancelled; refund processed. | *"Refunded"* (Gray badge with refund reference) |

---

## 12. Namma AI & Vector Semantic Search

NammaConnect V2 includes a unified semantic retrieval and conversational AI system.

```mermaid
flowchart LR
    Catalog[("1,000+ Services")] --> EmbedScript["scripts/generate_embeddings.py"]
    EmbedScript --> GeminiEmbed["Google Gemini embedding-001 (768-dim)"]
    GeminiEmbed --> pgvector[("PostgreSQL pgvector")]

    UserQuery["User Natural Language Query"] --> SearchEngine["SemanticSearchService"]
    SearchEngine --> QueryVector["Vectorize Query"]
    QueryVector --> CosineSim["Cosine Distance Search <-> pgvector"]
    CosineSim --> RelationalFilter["Apply SQL Filters (Location, Price, Rating)"]
    RelationalFilter --> GroundedResults["Top Ranked Grounded Catalog Results"]

    GroundedResults --> TravelAI["Gemini 1.5 Conversational Assistant"]
    TravelAI --> UserResponse["Structured Multi-Day Itinerary & Recommendations"]
```

### Core AI Capabilities
- **Embedding Pipeline**: Google Gemini `gemini-embedding-001` generates 768-dimensional dense vectors stored in `service.embedding` via `pgvector`.
- **Hybrid Retrieval**: `SemanticSearchService` executes cosine similarity queries while applying relational constraints (`district`, `price <= max_budget`, `is_active = true`, `moderation_status = 'APPROVED'`).
- **Conversational Engine**: `POST /api/v2/ai/travel/chat` maintains multi-turn session context (budget, destinations, party size) and constructs grounded responses in **English** and **Kannada**.
- **Offline Fallback**: If Gemini credentials are not supplied, the system uses lexical scoring and deterministic rule engines without raising runtime exceptions.

---

## 13. Notification Subsystem

V2 provides database-backed notifications for critical platform events.

### Notification Endpoints
- `GET /api/v2/notifications`: Paginated list of notifications for the authenticated user.
- `GET /api/v2/notifications/unread-count`: Returns the integer count of unread items for badge display.
- `PUT /api/v2/notifications/{id}/read`: Marks a single notification as read.
- `PUT /api/v2/notifications/read-all`: Marks all notifications for the user as read.

### Automated Event Triggers
- **New Booking Notification**: Sent to Provider when a customer initiates a reservation.
- **Payment Success Confirmation**: Sent to Customer when payment signature is verified.
- **Partner Application Approved/Rejected**: Sent to applicant upon admin review.
- **Service Moderation Status Update**: Sent to Provider when a listing is published or flagged.
- **Collaboration Proposal**: Sent to Creator when a host requests promotion.

---

## 14. Partner / Provider Portal

### Progressive Onboarding (KYC)
1. User navigates to `/become-partner`.
2. Submits identity details, business name, Aadhaar number, phone, and property address via `POST /api/v2/partner-applications`.
3. Application enters `PENDING` state and appears in the Admin moderation queue.
4. Upon Admin approval, user account role is upgraded to `PARTNER`.

### Provider Capabilities
- **Service Listings**: Submit and update listings with auto-assignment of `moderation_status = 'PENDING'`.
- **Availability Calendar**: Manage calendar schedules, blackout windows, and slot capacity.
- **Earnings & Payouts**: Review real-time net revenue after commission and request payout disbursements.

---

## 15. Creator & Collaboration System

- **Discovery**: Tourists and hosts discover creators filtered by niche (Culinary, Adventure, Sustainable Agriculture) and state on `/collaborations`.
- **Collaboration Lifecycle**:
  - `POST /api/v2/collaborations`: Host sends proposal with deliverables, compensation terms, and target dates.
  - `PUT /api/v2/collaborations/{id}/status`: Creator updates status (`ACCEPTED`, `REJECTED`, `COMPLETED`).
- **Authorization**: Only the participating host or creator can inspect or modify their collaboration record.

---

## 16. Admin Management Portal

Located under `/admin/*` in the frontend and `/api/v2/admin/*` on the backend:
- **Global Overview**: Real-time KPI widgets (gross volume, active listings, verified partners).
- **KYC Review**: `PUT /api/v2/admin/partner-applications/{id}/approve` and `/reject`.
- **Service Moderation**: `PUT /api/v2/admin/services/{id}/moderate` to approve or reject listings.
- **User Governance**: Audit user profiles, modify roles, or deactivate malicious accounts.
- **Payout Auditing**: Review and approve provider withdrawal requests.

---

## 17. Unified Marketplace Search

The search engine at `GET /api/v2/search` powers the customer exploration interface:
- **Keyword Filtering**: Full-text and substring search across title, description, district, and activities.
- **Faceted Filters**: Category, District, Price Min/Max, Rating, Duration, and Date Availability.
- **Vector Boost**: When `query` is present, pgvector cosine similarity ranks results by semantic relevance.

---

## 18. Trips & Booking History

Customers track their journeys under `/trips`:
- **Categorized Tabs**: `Upcoming` (confirmed future bookings), `Current` (in-progress stays), `Completed` (past stays), and `Cancelled`.
- **Cancellation & Refunds**: Automatic refund calculation based on cancellation policy and status tracking via `POST /api/v2/bookings/{id}/cancel`.
- **Post-Trip Reviews**: Trigger review modals for completed reservations.

---

## 19. Internationalization & Language System

NammaConnect V2 features a custom TypeScript-based localization subsystem located in `frontend/src/i18n/`:
- **Supported Locales**:
  - `en` — English (Default)
  - `kn` — ಕನ್ನಡ (Kannada)
  - `hi` — हिन्दी (Hindi)
- **Persistence**: Language selection is saved to `localStorage` (`nammaconnect_language`) and restored on application boot.
- **Context API**: `useTranslation()` hook supplies reactive strings across all pages and modals.

---

## 20. Theme System (Dark / Light Mode)

- **Theme Modes**: `light`, `dark`, and `system` (syncs with OS `prefers-color-scheme`).
- **Persistence**: Saved to `localStorage` (`nammaconnect_theme`).
- **Tailwind Integration**: Toggles the `.dark` class on the root `<html>` element.

---

## 21. Responsive Design

NammaConnect V2 is engineered with a mobile-first responsive strategy:
- **Desktop (>= 1280px)**: Multi-column layouts, expanded sidebars, floating AI assistant.
- **Laptop / Tablet (768px - 1024px)**: Collapsible navigation sidebars, dynamic grid cards.
- **Mobile (< 768px)**: Bottom navigation bar, slide-out drawer menus, full-screen checkout modal.

---

## 22. Database Schema & Migrations

### Core Relational & Vector Schema

```mermaid
erDiagram
    users ||--o{ services : hosts
    users ||--o{ bookings : places
    users ||--o| creator_profiles : has
    users ||--o{ partner_applications : submits
    users ||--o{ notifications : receives
    services ||--o{ bookings : booked_in
    services ||--o{ reviews : receives
    services ||--o{ saved_services : bookmarked_in
    bookings ||--o| payments : pays_for
    bookings ||--o| refunds : generates
    users ||--o{ payouts : requests

    users {
        uuid id PK
        string email UK
        string hashed_password
        enum role "CUSTOMER, PARTNER, CREATOR, ADMIN"
        string full_name
        string phone
        boolean is_active
        boolean is_verified
        boolean is_test_data
        timestamp created_at
    }

    services {
        uuid id PK
        uuid host_id FK
        string title
        text description
        string category
        string district
        string state
        decimal price
        string unit
        decimal rating
        enum moderation_status "PENDING, APPROVED, REJECTED"
        vector embedding "768-dim pgvector"
        boolean is_active
        boolean is_test_data
    }

    bookings {
        uuid id PK
        string booking_code UK
        uuid customer_id FK
        uuid service_id FK
        date start_date
        date end_date
        int guests
        decimal total_price
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
        enum status "PENDING, ORDER_CREATED, PAID, FAILED"
    }
```

### Alembic Migrations
Migrations are managed in `backend/alembic/versions/`:
1. `0001_initial_core_schema.py`: Establishes users, services, bookings, payments, payouts, creators, collaborations, messages, notifications.
2. `0002_create_partner_applications.py`: Adds KYC partner application tables.
3. `0003_add_service_moderation_fields.py`: Introduces service review status and moderation audit logs.
4. `0004_add_is_test_data_and_pgvector_embedding.py`: Adds `is_test_data` flags and 768-dimensional `pgvector` embedding columns.

---

## 23. API Reference

All V2 endpoints are mounted under `/api/v2`.

### Essential API Endpoints

| Method | Path | Purpose | Authorization |
|---|---|---|---|
| `POST` | `/api/v2/auth/register` | Register new user account | Public |
| `POST` | `/api/v2/auth/login` | Authenticate and obtain JWT tokens | Public |
| `POST` | `/api/v2/auth/google` | Authenticate via Google OAuth token | Public |
| `GET` | `/api/v2/auth/me` | Fetch authenticated profile details | Authenticated |
| `GET` | `/api/v2/search` | Unified semantic & faceted search | Public |
| `GET` | `/api/v2/services` | List published services with pagination | Public |
| `GET` | `/api/v2/services/{id}` | Retrieve specific service listing | Public |
| `POST` | `/api/v2/services` | Create new service listing | Partner / Admin |
| `PUT` | `/api/v2/services/{id}` | Update existing service listing | Owner / Admin |
| `POST` | `/api/v2/bookings` | Create new reservation | Customer |
| `GET` | `/api/v2/bookings/{id}` | Retrieve booking detail | Participant / Admin |
| `POST` | `/api/v2/payments/create-order` | Create Razorpay payment order | Customer (Booking Owner) |
| `POST` | `/api/v2/payments/verify` | Verify cryptographic HMAC signature | Customer (Booking Owner) |
| `POST` | `/api/v2/payments/webhook` | Asynchronous Razorpay payment webhook | Razorpay Gateway |
| `POST` | `/api/v2/ai/travel/chat` | Conversational travel assistant | Public / Authenticated |
| `GET` | `/api/v2/notifications` | Fetch user notifications | Authenticated |
| `PUT` | `/api/v2/notifications/{id}/read` | Mark notification as read | Authenticated |
| `POST` | `/api/v2/partner-applications` | Submit partner KYC application | Authenticated |
| `GET` | `/api/v2/admin/stats` | Retrieve platform-wide metrics | Admin |
| `PUT` | `/api/v2/admin/partner-applications/{id}/approve` | Approve partner application | Admin |
| `PUT` | `/api/v2/admin/services/{id}/moderate` | Moderate service listing | Admin |

---

## 24. Environment Variables

### Backend Configuration (`.env`)

| Variable | Description | Example / Default |
|---|---|---|
| `PROJECT_NAME` | Name of the platform | `Namma Connect` |
| `ENV` | Deployment environment | `development` / `production` |
| `DEBUG` | Enable debug logs & reload | `True` |
| `API_V2_PREFIX` | API v2 route prefix | `/api/v2` |
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://postgres:pass@localhost:5432/namma_connect_db` |
| `DATABASE_SYNC_URL` | Sync PostgreSQL connection string (for Alembic) | `postgresql://postgres:pass@localhost:5432/namma_connect_db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `JWT_SECRET` | 32-byte secret for JWT signing | `change_me_in_production_jwt_secret_32b` |
| `JWT_ALGORITHM` | Algorithm used for JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifespan | `30` |
| `GOOGLE_CLIENT_ID` | Google OAuth Web Client ID | `your-google-client-id` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `your-google-client-secret` |
| `RAZORPAY_KEY_ID` | Razorpay Test Key ID | `rzp_test_xxxxxxxxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay Test Secret Key | `your_razorpay_secret` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret | `your_webhook_secret` |
| `GEMINI_API_KEY` | Google Gemini API Key | `your-gemini-api-key` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `your-cloudinary-key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `your-cloudinary-secret` |
| `RESEND_API_KEY` | Resend Transactional Email API Key | `re_xxxxxxxxxxxxxxxxxxxx` |

### Frontend Configuration (`frontend/.env.local` or `.env`)

| Variable | Description | Example / Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for FastAPI Backend | `http://localhost:8000` |
| `VITE_RAZORPAY_KEY_ID` | Razorpay Public Key for Checkout Modal | `rzp_test_xxxxxxxxxxxxxx` |

---

## 25. Developer Quickstart & Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **PostgreSQL 16** with `pgvector` extension (or Docker Compose)
- **Redis 7** (Optional, graceful in-memory fallback enabled)

### Step-by-Step Installation

#### 1. Clone the Repository & Configure Environment
```bash
git clone https://github.com/priyanshu130018/Namma-Connect.git
cd Namma-Connect

# Copy example environment configuration
cp .env.example .env
```

#### 2. Backend Setup & Migrations
```bash
cd v2/backend

# Create and activate Python virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt
pip install pgvector

# Run database migrations to head
python -m alembic upgrade head
```

#### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install
```

---

## 26. Running the Application

### Option A: Local Development Server

```bash
# Terminal 1 — Backend
cd v2/backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd v2/frontend
npm run dev
```

- **Frontend SPA**: `http://localhost:5173`
- **FastAPI OpenAPI Swagger**: `http://localhost:8000/docs`
- **FastAPI ReDoc**: `http://localhost:8000/redoc`

### Option B: Full-Stack Docker Compose

```bash
# From repository root
docker compose up --build
```

---

## 27. Development Tools & Data Seeding

NammaConnect V2 provides safe, environment-guarded CLI scripts for development and staging:

```bash
cd v2/backend

# 1. Seed 500+ realistic users and 1,000+ Karnataka services (is_test_data=True)
python scripts/seed_dev_data.py

# 2. Batch-generate 768-dim Gemini vector embeddings for all services
python scripts/generate_embeddings.py

# 3. Clean up synthetic test data (safely preserves real customer data)
python scripts/clear_dev_data.py
```

> [!NOTE]
> All seeding and cleanup scripts enforce a strict safety check and automatically refuse execution if `ENV=production`.

---

## 28. Automated Testing & Verification

Both backend and frontend suites are fully automated:

```bash
# ── Backend Pytest Suite ──
cd v2/backend
python -m pytest tests -v
# Result: 100% Passing across all integration suites

# ── Frontend Vitest Suite ──
cd ../frontend
npm run test:run
# Result: 100% Passing across component and integration tests

# ── Frontend Typecheck & Build ──
npm run typecheck
npm run build
```

---

## 29. Security Engineering

- **No Secrets in Client Code**: All Razorpay secrets, Google OAuth secrets, and database credentials exist exclusively on the server.
- **HMAC Signature Validation**: Gateway payments require `hmac.compare_digest` matching before status transitions occur.
- **SQL Parameterization**: SQLAlchemy 2.0 ORM query structures eliminate SQL injection vulnerabilities.
- **RBAC Server Guards**: Strict server-side validation on every privileged operation.
- **Safe Password Storage**: Argon2id and bcrypt password hashing with per-user salt.
- **CORS Allowlist**: Explicit allowed origin policy.

---

## 30. Maintenance & Development Principles

- **Database as Truth**: Avoid creating ephemeral state in memory; persist domain changes through database models and Alembic migrations.
- **Unified Vector Search**: Always route search and conversational AI queries through `SemanticSearchService`.
- **Never Fake Financial Success**: Keep payment verification tied to authoritative cryptographic verification.

---

## 31. Known Limitations & Fallback Behaviors

1. **Razorpay in Test Mode**: Configured by default for development/test mode transactions.
2. **Optional External Services**: When third-party API keys (Gemini, Cloudinary, Resend) are omitted, the application transparently activates local fallbacks (lexical search, mock notifications).
3. **In-Memory Conversation Cache**: AI chat turns are cached in-memory and reset upon backend process restart.

---

## 32. Troubleshooting Guide

| Issue | Common Cause | Resolution |
|---|---|---|
| `pgvector extension not found` | PostgreSQL lacks `vector` extension | Run `CREATE EXTENSION IF NOT EXISTS vector;` in your PostgreSQL instance or use the provided Docker Compose. |
| `Alembic upgrade head fails` | Database URL mismatch | Ensure `DATABASE_SYNC_URL` in `.env` points to a reachable PostgreSQL instance. |
| `Razorpay Signature Verification Failed` | Incorrect `RAZORPAY_KEY_SECRET` | Verify your key secret in `.env` matches the test dashboard. |
| `CORS Error in Browser` | Frontend running on non-whitelisted port | Add your origin URL to `CORS_ORIGINS` in `.env`. |
| `Google Login Failed` | Origin not registered in Google Cloud Console | Add `http://localhost:5173` to Authorised JavaScript origins in Google Cloud Console. |

---

## 33. V2 Summary

NammaConnect V2 delivers a scalable, modular, and battle-tested architecture for sustainable agricultural tourism in Karnataka. With authoritative payments, pgvector-powered AI discovery, Alembic database migrations, and role-specific workflows, V2 provides a solid platform for rural hosts and travelers.
