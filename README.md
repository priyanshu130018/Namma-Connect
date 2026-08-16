# Namma Connect

Namma Connect is a full-stack agritourism and rural collaboration platform that connects rural farmers, creative content creators, and urban tourists. The platform facilitates farm stays, hands-on agricultural workshops, content creator partnerships, and verified community reviews within a unified marketplace.

---

## 📑 Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. System Architecture](#2-system-architecture)
- [3. Technology Stack](#3-technology-stack)
- [4. Canonical API Reference](#4-canonical-api-reference)
- [5. Core Workflows](#5-core-workflows)
- [6. Security & Authorization](#6-security--authorization)
- [7. Database & Migrations](#7-database--migrations)
- [8. Environment Configuration](#8-environment-configuration)
- [9. Local Development Setup](#9-local-development-setup)
- [10. Testing](#10-testing)
- [11. Containerization & Deployment](#11-containerization--deployment)
- [12. Repository Structure](#12-repository-structure)
- [13. Project Status](#13-project-status)
- [14. Documentation Links](#14-documentation-links)

---

## 1. Project Overview

Namma Connect provides an integrated ecosystem for agritourism discovery, booking management, and creative collaborations.

### User Roles & Personas

- **Guest**: Unauthenticated visitor. Can explore landing pages, view published farm stays, read public blog posts, browse available activities, and submit contact messages. Unauthenticated guests are restricted from accessing private features (such as the AI Trip Planner or booking checkout).
- **Tourist**: Authenticated traveler. Can search and filter farms, book farm stays and activities, manage booking dates and cancellations, execute Razorpay payments, write post-stay reviews, save favorites to their wishlist, receive notifications, and interact with the AI Trip Planner.
- **Farmer**: Authenticated host with an approved `FarmerProfile`. Can manage farm listings, create rural activities/workshops, review incoming tourist bookings, accept/reject booking change requests, discover creators, and initiate or accept collaboration proposals.
- **Creator**: Authenticated content creator with an approved `CreatorProfile`. Can showcase media portfolios, discover farm locations, check availability, negotiate collaboration proposals, and receive collaboration payments from hosts.
- **Admin**: Platform administrator. Manages user accounts, audits and approves/rejects Farmer and Creator onboarding applications with rejection feedback, inspects platform analytics, and oversees bookings.

### Home ⇄ Work Workspace Concept

The frontend features a dynamic **Home ⇄ Work** workspace model:
- **Home Mode**: Consumer-facing experience for browsing, discovering, booking farm stays, and planning trips.
- **Work Mode**: Professional dashboard accessible to approved Farmers and Creators for listing management, booking schedules, incoming inquiries, earnings overview, and collaboration management.
- Users with approved profiles can switch between **Home** and **Work** instantly in the navigation bar without re-authenticating.

---

## 2. System Architecture

The project is organized into a modular backend API and a modern client-side React frontend.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                      │
│   TanStack Start / TanStack Router + Tailwind CSS + Vite    │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON / REST (Bearer JWT)
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend (FastAPI)                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Routes Layer (/api/*)                                   │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Dependency Layer (Auth, RBAC, Rate Limiting)            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Service Layer (Business Logic & External Integrations)  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Schemas Layer (Pydantic DTOs & Validation)              │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Models Layer (SQLAlchemy 2.0 ORM)                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     PostgreSQL Database     ││   Third-Party Integrations   │
│   (Managed via Alembic)     ││  Razorpay, Resend, Cloudinary│
└─────────────────────────────┘└──────────────────────────────┘
```

### Backend Architecture (`backend/app/`)
The backend is structured into decoupled, single-responsibility modules:
- **`app/models/`**: SQLAlchemy 2.0 ORM declarations covering 20 relational entities (`Login`, `FarmerProfile`, `CreatorProfile`, `FarmListing`, `Activity`, `Booking`, `Collaboration`, `Payment`, `Review`, `Wishlist`, `Application`, `Notification`, `Message`, `Blog`, etc.).
- **`app/schemas/`**: Pydantic models handling request validation, data sanitization, and response serialization.
- **`app/services/`**: Domain business logic encapsulated away from HTTP transport (`auth_service`, `farm_service`, `booking_service`, `collaboration_service`, `payment_service`, `review_service`, `application_service`, `email_service`, `cloudinary_service`, `user_service`).
- **`app/routes/`**: FastAPI routers mounted under the unified `/api` prefix.
- **`app/dependencies/`**: Dependency injection for JWT authentication (`get_current_user`), admin authorization (`get_current_admin`), and role checks.
- **`app/core/`**: Configuration management (`pydantic-settings`), database session factory (`get_db`), structured logging, and response standardization middleware.
- **`app/ai/`**: Recommender engine utilizing TF-IDF cosine similarity for farm/creator matchmaking and conversational assistant.

### Frontend Architecture (`frontend/v2/`)
- Built with **React 19** and **Vite**, utilizing **TanStack Start** and **TanStack Router** for file-based route handling.
- Centralized API client (`frontend/v2/src/services/api.js`) providing consistent request normalization, auth header injection, and response transformation.
- Component library powered by **Radix UI** headless primitives, **Tailwind CSS 4**, **Lucide React** icons, **Leaflet** mapping, and **Sonner** toast notifications.

---

## 3. Technology Stack

### Backend
| Technology | Version / Specification | Purpose |
| :--- | :--- | :--- |
| **Python** | 3.10+ | Primary backend programming language |
| **FastAPI** | 0.115+ | High-performance asynchronous REST API framework |
| **Uvicorn** | 0.32+ | ASGI web server implementation |
| **SQLAlchemy** | 2.0+ | Relational ORM and database abstraction |
| **PostgreSQL** | 15+ | Primary relational database |
| **Alembic** | 1.14+ | Schema migration and version control tool |
| **Pydantic** | 2.10+ | Data validation, settings parsing, and response schemas |
| **Python-JOSE & Passlib** | 3.3+ / 1.7+ | JWT token generation/validation and bcrypt password hashing |
| **Razorpay SDK** | 1.4+ | Payment order creation, verification, and webhooks |
| **Resend** | 2.6+ | Transactional email delivery service |
| **Cloudinary** | 1.41+ | Cloud media management and asset hosting |
| **Pytest** | 8.0+ | Automated unit, integration, and E2E test runner |

### Frontend
| Technology | Version / Specification | Purpose |
| :--- | :--- | :--- |
| **React** | 19.2.0 | UI component framework |
| **Vite** | 8.2.0 | Frontend build tool and development server |
| **TanStack Router / Start** | 1.170.18 / 1.168.32 | Type-safe routing and server/client orchestration |
| **TanStack Query** | 5.101.1 | Async state management and data caching |
| **Tailwind CSS** | 4.2.1 | Utility-first styling engine |
| **Radix UI** | Latest | Accessible unstyled UI primitives |
| **Leaflet & React-Leaflet** | 1.9.4 / 5.0.0 | Interactive geolocation mapping |
| **Axios** | 1.19.0 | HTTP client for backend communication |
| **Zod & React Hook Form** | 3.24.2 / 7.71.2 | Client-side schema validation and form management |

---

## 4. Canonical API Reference

All backend routes are mounted under the `/api` prefix. Interactive Swagger documentation is available at `/docs`, and ReDoc is available at `/redoc`.

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new user (`tourist` by default) |
| `POST` | `/api/auth/login` | Public | Authenticate via email/mobile and password; returns JWT |
| `POST` | `/api/auth/google` | Public | Authenticate using Google OAuth id_token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user details with dynamic role |

### User Profiles & Discovery (`/api/users`, `/api/creators`, `/api/search`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/profile` | Authenticated | Retrieve current user profile |
| `PUT` | `/api/users/profile` | Authenticated | Update user profile details |
| `GET` | `/api/creators` | Public / Auth | List approved creators (supports search & filter) |
| `GET` | `/api/creators/me` | Authenticated | Retrieve current creator profile |
| `GET` | `/api/creators/{id}` | Public / Auth | Retrieve public details for a specific creator |
| `GET` | `/api/creators/{id}/availability` | Authenticated | Check creator availability for a given date range |
| `GET` | `/api/search` | Public | Unified search across farms, creators, or all entities |

### Farms & Activities (`/api/farms`, `/api/activities`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/farms` | Public | List and filter active farm listings |
| `POST` | `/api/farms` | Farmer | Create a new farm listing |
| `GET` | `/api/farms/my` | Farmer | List farms owned by the authenticated farmer |
| `GET` | `/api/farms/{id}` | Public | Retrieve detailed farm information and activities |
| `PUT` | `/api/farms/{id}` | Farmer | Update farm listing details (owner only) |
| `DELETE` | `/api/farms/{id}` | Farmer | Delete a farm listing (owner only) |
| `GET` | `/api/activities` | Public | List active farm activities |
| `POST` | `/api/activities` | Farmer | Create an activity attached to a farm |
| `GET` | `/api/activities/{id}` | Public | Retrieve specific activity details |
| `PUT` | `/api/activities/{id}` | Farmer | Update activity details (owner only) |
| `DELETE` | `/api/activities/{id}` | Farmer | Delete an activity (owner only) |

### Bookings (`/api/bookings`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Authenticated | Create a farm/activity booking request |
| `GET` | `/api/bookings/my` | Authenticated | List bookings made by the current user |
| `GET` | `/api/bookings/farmer` | Farmer | List bookings received for the farmer's properties |
| `GET` | `/api/bookings/{id}` | Authenticated | Retrieve booking details (participant only) |
| `PATCH` | `/api/bookings/{id}/status` | Farmer | Update booking status (`confirmed`, `cancelled`, `completed`) |
| `POST` | `/api/bookings/{id}/cancel` | Authenticated | Cancel a booking with reason code |
| `POST` | `/api/bookings/{id}/date-change` | Authenticated | Request date modification for a booking |

### Collaborations (`/api/collaborations`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/collaborations` | Farmer / Creator | Submit a collaboration proposal |
| `GET` | `/api/collaborations/my` | Authenticated | List sent and received collaboration proposals |
| `GET` | `/api/collaborations/{id}` | Authenticated | Retrieve collaboration proposal details |
| `PATCH` | `/api/collaborations/{id}/status` | Authenticated | Accept, reject, or complete a collaboration proposal |
| `POST` | `/api/collaborations/{id}/date-change`| Authenticated | Request date modification for a collaboration |

### Payments (`/api/payments`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/create-order` | Authenticated | Create a Razorpay order from a Booking or Collaboration |
| `POST` | `/api/payments/verify` | Authenticated | Verify Razorpay payment signature idempotently |
| `GET` | `/api/payments/{id}` | Authenticated | Retrieve payment transaction receipt |

### Reviews (`/api/reviews`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/reviews` | Authenticated | Submit a verified review for a completed booking/collab |
| `GET` | `/api/reviews` | Public | List reviews filtered by `target_type` and `target_id` |

### Wishlist (`/api/wishlist`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/wishlist` | Authenticated | Retrieve current user's saved wishlist items |
| `POST` | `/api/wishlist` | Authenticated | Add an item (`farm`, `creator`, `activity`) to wishlist |
| `DELETE` | `/api/wishlist/{item_id}` | Authenticated | Remove an item from the wishlist |

### Onboarding Applications (`/api/applications`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/applications` | Authenticated | Submit onboarding application to become Farmer or Creator |
| `GET` | `/api/applications/me` | Authenticated | Retrieve current user's onboarding application status |

### Admin Management (`/api/admin` — Admin Only)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users` | Admin | List all registered platform users with search/role filters |
| `DELETE` | `/api/admin/users/{id}` | Admin | Delete a user account |
| `GET` | `/api/admin/applications` | Admin | List pending/reviewed onboarding applications |
| `GET` | `/api/admin/applications/{id}` | Admin | Retrieve onboarding application with verification documents |
| `PATCH` | `/api/admin/applications/{id}` | Admin | Approve or reject application with optional reason |
| `GET` | `/api/admin/stats` | Admin | Aggregated platform metrics (users, bookings, listings) |
| `GET` | `/api/admin/bookings` | Admin | List and audit platform-wide bookings |

### AI, Messaging, Media & Webhooks
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/chat` | Authenticated | Query the AI travel assistant / trip planner |
| `GET` | `/api/ai/recommend/farms` | Authenticated | Semantic farm recommendations based on user preferences |
| `GET` | `/api/ai/recommend/creators` | Authenticated | Semantic creator recommendations |
| `GET` | `/api/conversations` | Authenticated | List direct messaging threads |
| `GET` | `/api/conversations/{user_id}/messages` | Authenticated | Retrieve chat history with a specific user |
| `POST` | `/api/conversations/{user_id}/messages` | Authenticated | Send a direct message to another user |
| `GET` | `/api/notifications` | Authenticated | List user notifications |
| `PATCH` | `/api/notifications/{id}/read` | Authenticated | Mark notification as read |
| `POST` | `/api/contact` | Public | Submit contact inquiry |
| `POST` | `/api/media/upload` | Authenticated | Upload image/video file to Cloudinary storage |
| `POST` | `/api/webhook/razorpay` | Public (HMAC) | Handle Razorpay `payment.captured` and `payment.failed` events |

---

## 5. Core Workflows

1. **Authentication & Role Resolution**:
   Users register and receive a signed JWT token. The `/api/auth/me` endpoint dynamically computes the user's role (`admin`, `farmer`, `creator`, or `tourist`) based on email rules and approved profile records.
2. **Farm Discovery & Booking**:
   Tourists browse farm stays and activities, filter by category/location, and submit booking requests with guest counts and contact details.
3. **Server-Authoritative Razorpay Checkout**:
   Payment amounts are looked up directly from database entities rather than trusting client-supplied values. Orders are created via Razorpay, signatures are validated via HMAC-SHA256, and duplicate verifications are handled idempotently.
4. **Booking Modifications & Cancellations**:
   Tourists and farmers can submit date change requests or cancel bookings with reason codes, automatically triggering transactional email updates and in-app notifications.
5. **Farmer & Creator Onboarding**:
   Tourists submit applications with verification details (experience, category, identification). Admins review applications via the Admin portal and approve or reject them with reason codes. Approval instantly grants the applicant access to Work Mode.
6. **Farmer ⇄ Creator Collaboration**:
   Farmers discover creators, verify availability via `GET /api/creators/{id}/availability`, and submit collaboration proposals. Counterparties can accept, reject, negotiate dates, and process payments. Self-collaboration is strictly prohibited.
7. **Verified Review System**:
   Reviews enforce strict post-completion validation: a user can only review a farm or activity after completing a valid booking, or review a creator after a completed collaboration. Ratings are constrained to integers from 1 to 5, and duplicate reviews are blocked.
8. **In-App Notifications & Resend Emails**:
   Key events (booking confirmations, cancellations, payment receipts, collaboration requests, application review updates) generate both in-app notification records and transactional emails with non-blocking error fallbacks.

---

## 6. Security & Authorization

The platform incorporates the following security controls:

- **JWT Bearer Authentication**: Stateless token authentication using HS256 algorithm and configurable token expiration.
- **Role-Based Access Control (RBAC)**: Enforced endpoint-level authorization ensuring operations are limited to appropriate roles (`tourist`, `farmer`, `creator`, `admin`).
- **Strict Admin Authorization**: Admin endpoints are guarded by `get_current_admin`, which verifies administrative identity and prevents privilege escalation.
- **Resource Ownership Checks**: Users can only inspect, modify, cancel, or pay for bookings, listings, and collaborations they participate in.
- **Server-Side Price Calculation**: Payment order amounts are derived server-side from authoritative database models to prevent client-side price tampering.
- **Cryptographic Signature Verification**: Razorpay checkout responses and webhook deliveries are verified against HMAC-SHA256 signatures before modifying payment state.
- **PII & Sensitive Document Protection**: Public DTOs omit private identification numbers (such as Aadhaar, PAN) and private documents.
- **Gated Review Eligibility**: Review submissions require verified participation in a completed booking or collaboration.
- **Rate Limiting Middleware**: Authentication endpoints include rate-limiting defenses against brute-force attacks.
- **Configurable CORS Policies**: Allowed origins are dynamically configured via environment variables with safe defaults for local development.

> *Note*: While these controls enforce strong application security, regular maintenance, dependency updates, and environment monitoring are recommended for production deployments.

---

## 7. Database & Migrations

The platform utilizes **PostgreSQL 15+** with **SQLAlchemy 2.0** models and **Alembic** migration tracking.

### Migration History
- `697cb992086f_init.py`: Initial schema creation.
- `e0fda819dada_modular_refactor.py`: Modular entity refactoring.
- `e489494665c4_add_payment_status.py`: Added explicit payment status tracking to bookings.
- `f1b2c3d4e5f6_fix_schema_mismatches.py`: Schema alignment for verification documents, change requests, and applications.

### Running Migrations

To upgrade the database to the latest schema version:
```bash
cd backend
alembic upgrade head
```

To create a new migration after updating SQLAlchemy models:
```bash
alembic revision --autogenerate -m "describe_schema_changes"
```

---

## 8. Environment Configuration

Create a `.env` file in the `backend/` directory based on `backend/.env.example`.

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/<database_name>

# JWT Authentication
SECRET_KEY=your_secure_random_jwt_secret_key
ALGORITHM=HS256

# CORS Configuration (Optional: comma-separated list of allowed origins)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000

# Google OAuth (Optional: for Google sign-in)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Cloudinary Media Storage (Optional: for image/video uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Razorpay Payments (Optional: for payment processing)
RAZORPAY_KEY=your_razorpay_key_id
RAZORPAY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Resend Transactional Email (Optional: for transactional emails)
RESEND_API_KEY=re_your_resend_api_key
```

> **Warning**: Never commit `.env` files or expose real API secrets in public repositories.

---

## 9. Local Development Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **PostgreSQL 15+** (or Docker for database)

---

### Step 1: Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a Python virtual environment
python -m venv venv

# Windows (Command Prompt / PowerShell):
venv\Scripts\activate

# Unix / macOS:
source venv/bin/activate

# 3. Install backend dependencies
pip install -r requirements.txt

# 4. Configure environment variables
# Copy .env.example to .env and configure your PostgreSQL connection
cp .env.example .env

# 5. Run database migrations
alembic upgrade head

# 6. Start the FastAPI development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
The backend API will be available at [http://localhost:8000](http://localhost:8000), with Swagger documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### Step 2: Frontend Setup

```bash
# 1. Navigate to the React v2 frontend directory
cd frontend/v2

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
The React frontend will be accessible at [http://localhost:5173](http://localhost:5173).

---

### Step 3: Frontend Production Build Verification

```bash
cd frontend/v2
npm run build
```

---

## 10. Testing

The backend includes a comprehensive automated test suite covering authentication, farm listings, bookings, collaborations, payments, reviews, security permissions, and end-to-end workflows.

### Running Backend Tests

```bash
cd backend
python -m pytest -q
```

### Test Coverage Areas
- `tests/test_auth.py`: Registration, JWT login, credential validation, `/auth/me` role computation.
- `tests/test_bookings.py`: Booking creation, status transitions, cancellations, date changes.
- `tests/test_farms.py`: Farm listing creation, retrieval, updates, owner isolation.
- `tests/test_flows.py`: Input validation, mobile format constraints, Aadhaar 12-digit checks, booking conflicts.
- `tests/test_reviews.py`: Verified review gating, rating constraints (1-5), duplicate review blocking.
- `tests/test_security_audit.py`: Role enforcement, admin protection, ownership/cross-tenant isolation, tamper resistance.
- `tests/test_production_readiness.py`: Server-side payment amounts, signature validation, webhook idempotency, application security.
- `tests/test_e2e_workflows.py`: Complete user journey verification (Guest → Tourist → Farmer → Creator → Admin).

*(Current test suite status: 33/33 tests passing).*

---

## 11. Containerization & Deployment

### Docker Compose Local Setup

The repository includes a root `docker-compose.yml` configured to orchestrate the PostgreSQL database, FastAPI backend, and React frontend containers.

```bash
# Start all services with Docker Compose
docker-compose up --build
```

### Services Configured
- **`db`**: PostgreSQL 15 container listening on port `5432`.
- **`backend`**: FastAPI application container built from `backend/Dockerfile`, exposed on port `8000`.
- **`frontend`**: React production container built via multi-stage Node/Nginx build from `frontend/Dockerfile`, exposed on port `5173`.

---

## 12. Repository Structure

```
namma_connect/
├── docker-compose.yml            # Docker orchestration configuration
├── README.md                     # Main repository documentation
├── docs/                         # Specialized module guides
│   ├── ai.md                     # AI recommendation engine documentation
│   ├── backend.md                # Backend architecture guide
│   ├── email.md                  # Resend email notification guide
│   ├── frontend.md               # Frontend structure & state management
│   ├── media.md                  # Cloudinary media upload guide
│   ├── payment.md                # Razorpay payment workflows
│   └── structure.md              # Detailed repository layout
├── backend/                      # FastAPI backend service
│   ├── Dockerfile                # Backend container definition
│   ├── requirements.txt          # Python dependencies
│   ├── alembic.ini               # Alembic configuration
│   ├── alembic/                  # Database migration scripts
│   │   └── versions/             # Migration revisions
│   ├── main.py                   # Root application entry point
│   ├── app/                      # Application source package
│   │   ├── main.py               # FastAPI factory & middleware configuration
│   │   ├── core/                 # Config, database, logger, middleware
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Business logic layer
│   │   ├── routes/               # API route controllers (/api/*)
│   │   ├── dependencies/         # Auth, RBAC, and rate limiting dependencies
│   │   ├── ai/                   # Recommender engine & chatbot
│   │   └── utils/                # Exception handlers & helper utilities
│   └── tests/                    # Pytest automated test suite
└── frontend/                     # React frontend applications
    ├── Dockerfile                # Frontend multi-stage container definition
    └── v2/                       # Active TanStack + React 19 application
        ├── package.json          # Frontend dependencies & scripts
        ├── vite.config.ts        # Vite configuration
        └── src/                  # Frontend source code
            ├── components/       # Reusable UI & layout components
            ├── routes/           # TanStack router page definitions
            ├── services/         # API integration client (api.js)
            └── hooks/            # Custom React hooks
```

---

## 13. Project Status

- **Architecture**: Modular backend with decoupled route, service, schema, and ORM layers.
- **API Coverage**: Unified under canonical `/api` prefix with OpenAPI documentation at `/docs`.
- **Database**: PostgreSQL schema aligned with Alembic migration version `f1b2c3d4e5f6`.
- **Automated Tests**: 33 passing automated backend tests.
- **Frontend**: Clean production compilation via Vite and TanStack Start.
- **Remaining / Ongoing Maintenance**: Production hosting environment setup, continuous integration pipeline configuration, and ongoing third-party API monitoring.

---

## 14. Documentation Links

For deeper technical deep-dives into individual subsystems, refer to the guides in the `docs/` directory:

- [Backend Architecture Guide](docs/backend.md)
- [Frontend Guide](docs/frontend.md)
- [AI Recommender & Chatbot](docs/ai.md)
- [Razorpay Payments Guide](docs/payment.md)
- [Cloudinary Media Guide](docs/media.md)
- [Resend Email Guide](docs/email.md)
- [Repository Structure Reference](docs/structure.md)
