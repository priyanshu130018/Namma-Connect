# Namma Connect V2 — Architecture Specification

## 1. System Overview

Namma Connect V2 is a unified service marketplace platform designed for discovery, booking, payments, host management, creator collaborations, and administration in the agricultural tourism and local experiences sector.

### Architecture Topology: Modular Monolith
```
┌────────────────────────────────────────────────────────────────────────┐
│                        Namma Connect V2 Frontend                       │
│      (React 18 + TypeScript + Tailwind CSS + Client Routing Shells)   │
└──────┬─────────────────┬──────────────────┬─────────────────┬──────────┘
       │                 │                  │                 │
  [Public Web]    [Customer /app]    [Partner /partner] [Admin /admin]
       │                 │                  │                 │
       └─────────────────┴────────┬─────────┴─────────────────┘
                                  │ HTTPS / JSON
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Application Gateway                     │
│                        (Base Path: /api/v2)                            │
├────────────────────────────────────────────────────────────────────────┤
│ • Security Middleware (CORS, Rate Limiters, Request ID, CSRF Guards)   │
│ • Authentication Dependency (JWT Bearer Token / Session Resolution)    │
│ • RBAC & Permission Enforcement Engine                                 │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
      ┌───────────────────────────┼──────────────────────────┐
      ▼                           ▼                          ▼
┌──────────────┐          ┌──────────────┐           ┌──────────────┐
│  Auth & User │          │   Services   │           │   Bookings   │
│    Domain    │          │  & Inventory │           │  & Payments  │
└──────┬───────┘          └──────┬───────┘           └──────┬───────┘
       │                         │                          │
       └─────────────────────────┼──────────────────────────┘
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Repository & Data Access Layer                    │
│                      (SQLAlchemy 2 Async & Sync ORM)                   │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      ┌────────────────────┐          ┌────────────────────┐
      │  PostgreSQL (Rel)  │          │   Redis (Cache &   │
      │  Primary Database  │          │    Rate Limits)    │
      └────────────────────┘          └────────────────────┘
```

---

## 2. Four Distinct Application Areas

| Area | Base Path | Target Audience | Access & Security Level | Key Layout & Navigation |
| :--- | :--- | :--- | :--- | :--- |
| **Public Website** | `/` | Anonymous visitors, prospective customers & partners | **Public** (Unauthenticated) | Public Navbar, Informational & Marketing Shell, Public Footer |
| **Customer Application** | `/app` | Registered travelers & customers | **Authenticated Customer** (`role = customer` or any logged in user) | Customer Header, Sidebar / Bottom Nav, Travel AI Drawer, Cart/Booking Bar |
| **Partner & Creator Application** | `/partner` & `/partner/creator` | Verified farm owners, hosts, guides, and digital creators | **Authenticated + Partner/Creator RBAC** (`role in [partner, farmer, creator]`) | Partner Studio Sidebar, KYC Banner, Listing Wizards, Collaboration Board |
| **Admin Control Center** | `/admin` | Platform operators & dispute officers | **Authenticated + Admin RBAC** (`role = admin`) | High-density Admin Sidebar, Audit Logs, Verification Queues, Financial Ledgers |

> [!IMPORTANT]
> **Strict Boundary Enforcement**: The marketplace (`/app`), partner studio (`/partner`), and admin console (`/admin`) are never exposed as public unauthenticated views. The main search (`GET /api/v2/search`) lives inside `/app`.

---

## 3. Frontend Architecture

- **Stack**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Axios API client.
- **Directory Hierarchy**:
  ```
  v2/frontend/
  ├── src/
  │   ├── app/           # App root, Providers (Auth, Theme, Toast), Router setup
  │   ├── components/    # Reusable UI primitives (Button, Input, Card, Modal, Table, etc.)
  │   ├── features/      # Feature modules (auth, explore, bookings, partner, admin, etc.)
  │   ├── layouts/       # Shell layouts (PublicLayout, CustomerLayout, PartnerLayout, AdminLayout)
  │   ├── routes/        # Route page components and protected guards
  │   ├── services/      # Typed API Client targeting /api/v2
  │   ├── hooks/         # Shared React hooks (useAuth, useDebounce, useMediaQuery)
  │   ├── lib/           # Utilities (cn, formatters, validation helpers)
  │   └── types/         # Domain TypeScript contracts
  └── tests/             # Vitest unit and integration test suites
  ```
- **Route Guarding Architecture**:
  - `PublicRoute`: Allows public access; redirects authenticated users to appropriate default dashboards if visited.
  - `ProtectedRoute`: Verifies active session/token; redirects unauthenticated visitors to `/login` with `returnUrl`.
  - `RoleGuard`: Verifies user roles (`customer`, `partner`, `creator`, `admin`); presents 403 Forbidden with support action if unauthorized.

---

## 4. Backend Architecture

- **Stack**: Python 3.10+, FastAPI, SQLAlchemy 2, Pydantic v2, Alembic, PostgreSQL, Redis, Argon2id/Bcrypt.
- **Directory Hierarchy**:
  ```
  v2/backend/
  ├── app/
  │   ├── api/
  │   │   ├── health.py        # GET /health
  │   │   └── v2/              # Root /api/v2 aggregation router & sub-endpoints
  │   ├── core/                # Configuration, Database sessionmaker, Security, Logging
  │   ├── dependencies/        # FastAPI DI (get_db, get_current_user, require_role)
  │   ├── models/              # SQLAlchemy 2 declarative models with UUID GUIDs
  │   ├── repositories/        # Database access and query encapsulation (SoC)
  │   ├── schemas/             # Pydantic serialization and request validation schemas
  │   ├── services/            # Pure business logic and domain managers
  │   ├── workers/             # Background workers and async task dispatchers
  │   └── main.py              # Application entrypoint with middleware and CORS
  ├── alembic/                 # Database migrations
  └── tests/                   # Pytest test suite with in-memory SQLite / test DB
  ```
- **Separation of Concerns (SoC) Flow**:
  $$\text{HTTP Request} \longrightarrow \text{API Router} \longrightarrow \text{Auth/RBAC Guard} \longrightarrow \text{Service Layer} \longrightarrow \text{Repository} \longrightarrow \text{Database}$$

---

## 5. Core Data Model & Relationships

```
┌──────────────┐ 1      1 ┌────────────────┐ 1      * ┌──────────────┐
│     User     ├──────────┤ PartnerProfile ├──────────┤   Service    │
└──────┬───────┘          └────────────────┘          └──────┬───────┘
       │ 1                                                   │ 1
       │                                                     │
       │ *                                                   │ *
┌──────┴───────┐ 1      1 ┌────────────────┐ 1      * ┌──────┴───────┐
│   Customer   ├──────────┤    Payment     ├──────────┤   Booking    │
└──────────────┘          └────────────────┘          └──────────────┘
```

- **Authoritative Integrity**:
  - Pricing, status transitions (`pending` $\to$ `confirmed` $\to$ `completed`), availability locks, and payment settlements are 100% computed and enforced by backend services.
  - Self-booking prevention is enforced at the service level (`customer_id != service.partner_id`).
