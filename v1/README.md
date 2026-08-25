# NammaConnect V1 — Developer Guide & Architecture Documentation

NammaConnect V1 (initially built as *Namma Gig*) is an agricultural tourism and rural experience marketplace platform designed to bridge the gap between **Farmers**, **Tourists**, and **Content Creators** across India (with a focus on Karnataka).

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [What V1 Provides](#2-what-v1-provides)
3. [How V1 Works](#3-how-v1-works)
4. [Complete User Workflows](#4-complete-user-workflows)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Booking Architecture](#6-booking-architecture)
7. [Payment Architecture](#7-payment-architecture)
8. [AI / Namma AI & Recommendation Engine](#8-ai--namma-ai--recommendation-engine)
9. [Notification System](#9-notification-system)
10. [Partner / Provider System](#10-partner--provider-system)
11. [Admin System](#11-admin-system)
12. [Collaboration System](#12-collaboration-system)
13. [Database Architecture](#13-database-architecture)
14. [API Architecture](#14-api-architecture)
15. [Technology Stack](#15-technology-stack)
16. [Project Structure](#16-project-structure)
17. [Development Setup](#17-development-setup)
18. [Environment Variables](#18-environment-variables)
19. [Running the Application](#19-running-the-application)
20. [Testing](#20-testing)
21. [Security Considerations](#21-security-considerations)
22. [V1 Design Approach](#22-v1-design-approach)
23. [Known Limitations & Unfinished Areas](#23-known-limitations--unfinished-areas)
24. [V1 vs Future Versions](#24-v1-vs-future-versions)

---

## 1. Overview

### What is NammaConnect V1?
NammaConnect V1 is an agro-tourism web application that enables travelers to discover and book authentic farm stays, agricultural workshops, and rural experiences. It also allows local farmers to monetize their land and agricultural practices through hospitality, while offering content creators a platform to discover rural destinations and collaborate with hosts.

### Target Users
- **Tourists**: Travelers looking for authentic farm experiences, rural retreats, and cultural stays.
- **Farmers (Hosts/Providers)**: Landowners and agriculturalists offering farm visits, overnight stays, and workshops.
- **Content Creators**: Influencers, vloggers, and photographers seeking farm experiences to promote or review.
- **Administrators**: Platform managers overseeing user verification, farm listings, bookings, and inquiry tickets.

### Primary Purpose & V1 Role
V1 serves as the foundational MVP (Minimum Viable Product). It establishes the core relational schema, user authentication, role-based dashboard experiences, dual-entity booking engine (Farms & Creators), and an embedded AI recommendation assistant based on local sentence embeddings.

---

## 2. What V1 Provides

### 🧑‍🌾 Farmer / Host Features
- **Profile Management**: Profile creation and update with personal details, location, mobile, and Aadhaar/identity proof.
- **Farm Listing Management**: Create, edit, list, and delete farm listings with pricing, photos, crop types, accommodation availability, and transport flags.
- **Received Bookings**: Dashboard to review incoming tourist reservations, view guest counts and dates, and update reservation status (`pending`, `confirmed`, `cancelled`, `completed`).
- **Availability Engine**: Automated date collision checking preventing overlapping reservations.
- **Hosting Settings**: Toggle booking preferences and availability.

### 🧳 Tourist / Customer Features
- **Catalog Exploration**: Browse farm listings and content creators with search filters (keyword, state, area, crop types).
- **Service Details**: View dedicated cards and detail pages for farms (`/farmercard/:slug`) and creators (`/creatorcard/:slug`).
- **Direct Booking**: Reserve farm stays or book creators with guest counters, date pickers, and price calculations.
- **Trip Management**: Track personal booking history with status filters in the Tourist Dashboard (`/tourist/bookings`).
- **Wishlist**: Save favorite destinations to a personal wishlist.
- **AI Trip Planner**: Interactive conversational trip assistant (`/AI-trip-planner`) suggesting farms and creators matching user prompts.

### 🎬 Content Creator Features
- **Creator Profile & Portfolio**: Showcase portfolio links, YouTube/Instagram handles, rates, experience status, and primary niche.
- **Collaboration Bookings**: Receive collaboration requests from tourists or farmers with custom collaboration notes.
- **Status Updates**: Accept, decline, or complete collaboration engagements.

### 🛡️ Admin Features
- **Platform Analytics**: Total counts of users, farmers, creators, tourists, active farms, and bookings (`/api/admin/stats`).
- **User Management**: Paginated user listing with search, filtering, detailed profile inspection, and cascading account deletion.
- **Host Verification**: One-click toggling of `is_verified` status for farmers, creators, and tourists.
- **Booking Oversight**: Global audit table of all bookings across farms and creators with status indicators.

### 💬 Contact & Support
- Public inquiry form (`/contact`) storing messages in the `contact_us` table.

---

## 3. How V1 Works

NammaConnect V1 follows a clean client-server architecture with a React Single-Page Application (SPA) communicating with a FastAPI REST API backed by a relational database.

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 19 + Vite)"]
        UI["React SPA UI / Tailwind CSS"]
        Router["AppRoutes / React Router DOM"]
        AxiosClient["Axios HTTP Client (services/api.js)"]
        LocalStorage["Local Storage (JWT & User Session)"]
    end

    subgraph Server ["Backend (FastAPI)"]
        API["FastAPI App (api/api.py)"]
        AuthRouter["/api/auth (JWT & Google OAuth)"]
        FarmerRouter["/api/farmer & /api/services/farmer"]
        TouristRouter["/api/tourist & /api/tourists"]
        CreatorRouter["/api/creator & /api/services/creator"]
        AdminRouter["/api/admin"]
        AIRouter["/api/ai & AI Agents"]
        ContactRouter["/api/contact"]
    end

    subgraph Intelligence ["AI Layer"]
        SentenceTransformers["sentence-transformers (all-MiniLM-L6-v2)"]
        LexicalFallback["Lexical Token-Overlap Fallback Engine"]
    end

    subgraph Storage ["Database Layer"]
        SQLAlchemy["SQLAlchemy ORM"]
        MySQL_SQLite["MySQL / SQLite Relational DB"]
    end

    UI --> Router
    Router --> AxiosClient
    AxiosClient <--> LocalStorage
    AxiosClient -->|JSON REST over HTTP| API

    API --> AuthRouter
    API --> FarmerRouter
    API --> TouristRouter
    API --> CreatorRouter
    API --> AdminRouter
    API --> AIRouter
    API --> ContactRouter

    AIRouter --> SentenceTransformers
    AIRouter --> LexicalFallback

    AuthRouter & FarmerRouter & TouristRouter & CreatorRouter & AdminRouter & ContactRouter --> SQLAlchemy
    SQLAlchemy --> MySQL_SQLite
```

### Layer Responsibilities
- **Frontend Layer (`v1/frontend`)**: Handles client rendering, routing guards (`ProtectedRoute`), interactive forms, date pickers, dashboards, and local token storage (`localStorage.getItem("ng_user")`).
- **API Routing Layer (`v1/Backend/api/endpoints`)**: Validates Pydantic payloads, extracts user parameters, enforces availability constraints, and orchestrates database transactions.
- **AI Recommendation Layer (`v1/Backend/ai_agent`)**: Combines semantic embeddings (via `sentence-transformers`) with popularity weights to score and rank farm and creator recommendations.
- **Database / ORM Layer (`v1/Backend/db`)**: Manages relational entities, foreign key cascades, and check constraints using SQLAlchemy.

---

## 4. Complete User Workflows

### 1. Tourist Discovery & Booking Workflow
```mermaid
sequenceDiagram
    autonumber
    actor Tourist
    participant SPA as React Frontend
    participant API as FastAPI Backend
    participant DB as Database

    Tourist->>SPA: Browse /services or /home
    SPA->>API: GET /api/farmer/farm-listing
    API->>DB: Query farm_listing joined with farmer
    DB-->>API: Active farm listings
    API-->>SPA: List of farm objects with ratings
    Tourist->>SPA: Select farm -> Open /farmercard/:slug
    Tourist->>SPA: Select check-in, check-out, guests -> Click Book
    SPA->>API: GET /api/farmer/check-availability/{id}?date_start&date_end
    API->>DB: Query overlapping active bookings
    DB-->>API: No overlap (available: true)
    API-->>SPA: Availability Confirmed
    Tourist->>SPA: Confirm Booking
    SPA->>API: POST /api/tourist/booking/{user_id}
    API->>DB: Check self-booking & insert Booking (status='pending')
    DB-->>API: Created Booking record
    API-->>SPA: Booking details (status='pending')
    SPA-->>Tourist: Display confirmation in /tourist/bookings
```

### 2. Farmer Onboarding & Listing Workflow
1. User registers or logs in as a tourist.
2. Visits `/services/farmer/register` and submits KYC details (Farm name, address, Aadhaar number, contact info).
3. Backend elevates user role to `farmer` and creates a linked `Farmer` profile in the database.
4. Farmer navigates to `/farmer/listings` -> `/farmer/listing/new` to create a farm listing (photos, crop details, price per night, amenities).
5. Listing immediately becomes searchable in the global farm catalog (`/services` and `/farmer/farm-listing`).
6. When tourists book the farm, the farmer reviews incoming requests in `/farmer/bookings` and updates status to `confirmed` or `cancelled`.

### 3. Creator Collaboration Workflow
1. User registers via `/services/creator/register` specifying niche, portfolio, rate, and social media handles.
2. Backend assigns `role='creator'` and establishes a `Creator` profile record.
3. Tourists or Farmers discover creators on `/services` or `/creatorcard/:slug`.
4. Requester books the creator with a `collab_note` via `POST /api/tourist/booking/{user_id}` (`booking_type='creator'`).
5. Creator views incoming collaboration proposals in `/creator/bookings` and accepts or rejects them.

### 4. Admin Management Workflow
1. Administrator logs in with admin credentials.
2. Accesses `/admin/home` to view system statistics (`/api/admin/stats`).
3. Audits user accounts (`/api/admin/users`), toggles host verification badges (`/api/admin/user/{id}/verify`), or executes hard deletes on violating accounts.
4. Monitors global reservations and booking fulfillment across all farms and creators.

---

## 5. Authentication & Authorization

### Authentication Mechanism
- **JWT (JSON Web Tokens)**: Generated on login/registration with `HS256` algorithm and a 7-day expiration (`ACCESS_TOKEN_EXPIRE_DAYS = 7`).
- **Token Payload**: Contains `sub` (user's primary key ID) and `role` (`tourist`, `farmer`, `creator`, `admin`).
- **Password Hashing**: Implemented using `bcrypt` (`bcrypt.hashpw` with unique salt).
- **Google OAuth 2.0**: Implemented via `POST /api/auth/google` using Google's `id_token.verify_oauth2_token` against `GOOGLE_CLIENT_ID`. Automatic user registration and tourist profile creation on first Google sign-in.

### Role-Based Access Control (RBAC)
Role separation is enforced both in the frontend router and backend endpoints:

| Role | Permitted Routes & Capabilities |
|---|---|
| `tourist` | Browse catalog, book farms/creators, manage personal bookings, update profile, use AI planner. |
| `farmer` | All tourist actions + host farm listings, manage received bookings, update farm availability. |
| `creator` | All tourist actions + manage creator portfolio, receive and update collaboration bookings. |
| `admin` | Full platform access: user management, global booking audit, profile verification toggle, platform stats. |

### Frontend Route Protection
Protected routes in `frontend/src/routes/AppRoutes.jsx` utilize the `ProtectedRoute` wrapper component:
- Non-authenticated requests are redirected to `/login`.
- Authenticated users attempting to access unauthorized role paths are automatically rerouted to their respective home dashboard (`/farmer/home`, `/creator/home`, `/home`).
- Admins bypass all role filters and can access every dashboard.

---

## 6. Booking Architecture

### Booking Model & Constraints
Bookings are persisted in the `booking` table with database-level integrity enforced via a SQLAlchemy `CheckConstraint`:
```sql
CHECK (
    (booking_type = 'farm' AND farm_id IS NOT NULL AND creator_id IS NULL) OR
    (booking_type = 'creator' AND creator_id IS NOT NULL AND farm_id IS NULL)
)
```

### Booking Status Lifecycle
```mermaid
stateDiagram-v2
    [*] --> pending: Tourist submits booking
    pending --> confirmed: Host/Creator accepts booking
    pending --> cancelled: Tourist or Host cancels
    confirmed --> completed: Stay/Service concluded
    confirmed --> cancelled: Cancellation requested
    cancelled --> [*]
    completed --> [*]
```

### Backend Validations
1. **Self-Booking Prevention**: A farmer cannot book their own farm, and a creator cannot book their own services (`HTTP 400`).
2. **Date Collision / Overlap Check**:
   ```python
   overlap_filter = [
       Booking.booking_type == data.booking_type,
       Booking.status != "cancelled",
       Booking.check_in <= data.check_out,
       Booking.check_out >= data.check_in
   ]
   ```
   If overlapping reservations exist, the request is rejected with `HTTP 400`.
3. **Alternative Date Suggestion**: When checking availability via `GET /api/farmer/check-availability/{listing_id}`, if the selected date range is unavailable, the backend automatically calculates and returns the next 3 available non-conflicting date intervals.

---

## 7. Payment Architecture

> [!IMPORTANT]
> **Actual V1 Implementation Status: Mock / Unintegrated**
> NammaConnect V1 does **NOT** include an integrated payment gateway SDK (such as Razorpay or Stripe).

- In V1, bookings calculate `total_price` based on duration and unit price and store the numeric amount in `booking.total_price`.
- Booking status transitions from `pending` directly to `confirmed` through manual host approval or status update endpoints (`/api/farmer/booking/{id}/status/{user_id}`).
- Payment gateway integration is scheduled for V2.

---

## 8. AI / Namma AI & Recommendation Engine

NammaConnect V1 includes an AI recommendation and trip planning subsystem in `v1/Backend/ai_agent/`.

```mermaid
flowchart LR
    UserQuery["User Search / Chat Prompt"] --> RecAgent["RecommendationAgent"]
    RecAgent --> CheckModel{"sentence-transformers Available?"}
    CheckModel -->|Yes| ST["Compute Cosine Similarity (all-MiniLM-L6-v2)"]
    CheckModel -->|No / Offline| Lexical["Token Overlap Scorer (Lexical Fallback)"]
    ST --> Weighting["Weighted Score = 70% Semantic + 30% Popularity"]
    Lexical --> Weighting
    Weighting --> Ranked["Top Ranked Recommendations (0-100 Match Score)"]
```

### Key AI Components
1. **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2`. Configured to use local offline files by default (`NAMMAGIG_ALLOW_HF_DOWNLOAD=0`) to prevent startup latency or network failures.
2. **Lexical Fallback**: If PyTorch or `sentence-transformers` is absent, the engine falls back to regex-based token-overlap scoring without crashing the server.
3. **Popularity & Trust Weighting**:
   - Verified owners: +20% score.
   - Farm stays available: +10% score.
   - New listings (< 90 days): +10% score.
4. **Endpoints**:
   - `POST /api/ai/chat`: Unified conversational endpoint for searching farms and creators.
   - `GET /api/farmer/search/{userId}`: Semantic farm search with match scores.
   - `GET /api/creator/search/{userId}`: Semantic creator search with match scores.
   - `POST /api/farmer/trip-planner/{userId}`: Multi-day itinerary planner generator.

---

## 9. Notification System

### V1 Notification Status
- V1 does not have a standalone background notification service or WebSocket push engine.
- Notification state is pulled synchronously through dashboard queries:
  - Farmers see new pending reservations in `/farmer/bookings`.
  - Creators see new collaboration requests in `/creator/bookings`.
  - Tourists track status updates (`confirmed`, `cancelled`) in `/tourist/bookings`.

---

## 10. Partner / Provider System

### Farmer / Partner Operations
- **Registration**: `POST /api/services/farmer/register/{user_id}`
- **Fetch Profile**: `GET /api/farmer/profile/{user_id}` & `GET /api/farmer/by-profile/{farmer_id}`
- **Update Profile**: `PUT /api/farmer/profile/{user_id}`
- **Create Listing**: `POST /api/farmer/list/{user_id}`
- **Update Listing**: `PUT /api/farmer/listing/{listing_id}`
- **Delete Listing**: `DELETE /api/farmer/listing/{listing_id}/{user_id}`
- **Manage Bookings**: `GET /api/farmer/bookings/{user_id}` (returns both received and made bookings)
- **Update Booking Status**: `PUT /api/farmer/booking/{booking_id}/status/{user_id}`

---

## 11. Admin System

The admin subsystem is located in `v1/Backend/api/endpoints/admin.py`.

### Admin Endpoints
- `GET /api/admin/stats`: Returns platform aggregates (total users, counts by role, total farms, bookings by status).
- `GET /api/admin/users`: Paginated, searchable, and role-filterable list of all registered users with expanded profile details.
- `GET /api/admin/user/{user_id}`: Full profile information for a specific user.
- `PUT /api/admin/user/{user_id}/verify`: Toggles `is_verified` boolean on the user's role profile.
- `DELETE /api/admin/user/{user_id}`: Hard-deletes the user and cascades across listings and bookings.
- `GET /api/admin/bookings`: Paginated audit log of all bookings with joined tourist, farm, and creator names.

---

## 12. Collaboration System

Content creators and hosts collaborate through the creator booking mechanism:
- Farmers or tourists send collaboration invitations via `POST /api/tourist/booking/{user_id}` with `booking_type='creator'` and a custom `collab_note`.
- Creators view pending collaborations in `/creator/bookings` and update the status via `PUT /api/creator/booking/{booking_id}/status/{user_id}`.

---

## 13. Database Architecture

### Engine & ORM
- **Database**: MySQL (default via PyMySQL) or SQLite for testing.
- **ORM**: SQLAlchemy declarative models (`Base.metadata.create_all` executed on server startup in `main.py`).

### Schema & Tables

```mermaid
erDiagram
    users ||--o| tourist : has
    users ||--o| farmer : has
    users ||--o| creator : has
    farmer ||--o{ farm_listing : owns
    tourist ||--o{ booking : makes
    farm_listing ||--o{ booking : receives
    creator ||--o{ booking : receives
    contact_us

    users {
        int id PK
        string full_name
        string email UK
        string password
        enum role "tourist, farmer, creator, admin"
        string mobile
        boolean is_active
        timestamp created_at
    }

    tourist {
        int id PK
        int user_id FK
        string name
        int age
        string city
        string state
        string aadhaar_no
        boolean is_verified
        text wishlist
    }

    farmer {
        int id PK
        int user_id FK
        string name
        int age
        string city
        string state
        string aadhaar_no
        text identity_proof
        boolean is_verified
    }

    creator {
        int id PK
        int user_id FK
        string name
        string niche
        string portfolio
        string instagram
        string youtube
        decimal rate
        boolean is_verified
    }

    farm_listing {
        int id PK
        int farmer_id FK
        string farm_name
        text description
        string address
        string city
        string state
        string crop_types
        string farm_photo
        string stay_available
        string transport_available
        decimal price_per_night
        boolean is_active
    }

    booking {
        int id PK
        int tourist_id FK
        enum booking_type "farm, creator"
        int farm_id FK
        int creator_id FK
        date check_in
        date check_out
        int adults
        int children
        int guests
        decimal total_price
        text collab_note
        enum status "pending, confirmed, cancelled, completed"
    }

    contact_us {
        int id PK
        string name
        string email
        string topic
        text message
        timestamp created_at
    }
```

---

## 14. API Architecture

All endpoints are mounted under the `/api` prefix in `main.py`.

### Major Endpoint Reference

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `POST` | `/api/register` | Register new user as tourist | Public |
| `POST` | `/api/login` | Authenticate with email/mobile and password | Public |
| `POST` | `/api/google` | Authenticate via Google OAuth token | Public |
| `GET` | `/api/me` | Fetch authenticated user info by token | Authenticated |
| `POST` | `/api/change-password` | Reset password using email/mobile identifier | Public |
| `POST` | `/api/change-password/{user_id}` | Update password for logged in user | Authenticated |
| `DELETE` | `/api/delete-account/{user_id}` | Delete user account and linked data | Authenticated |
| `GET` | `/api/farmer/farm-listing` | List all farm listings with ratings | Public |
| `GET` | `/api/farmer/listing/{id}` | Get specific farm listing details | Public |
| `GET` | `/api/farmer/check-availability/{id}` | Check date availability and get suggestions | Public |
| `POST` | `/api/services/farmer/register/{id}` | Register/upgrade profile as farmer | Authenticated |
| `POST` | `/api/farmer/list/{id}` | Create new farm listing | Farmer |
| `PUT` | `/api/farmer/listing/{id}` | Update existing farm listing | Farmer |
| `DELETE` | `/api/farmer/listing/{id}/{user_id}` | Delete farm listing | Farmer |
| `GET` | `/api/farmer/bookings/{id}` | Get received and made bookings for farmer | Farmer |
| `PUT` | `/api/farmer/booking/{id}/status/{user_id}` | Update booking status for farmer listing | Farmer |
| `GET` | `/api/tourists/profile/{id}` | Get tourist profile details | Tourist |
| `PUT` | `/api/tourists/profile/{id}` | Update tourist profile | Tourist |
| `POST` | `/api/tourist/booking/{id}` | Create a booking for farm or creator | Tourist |
| `GET` | `/api/tourists/bookings/{id}` | Get tourist booking history | Tourist |
| `DELETE` | `/api/tourist/booking/{booking_id}/{user_id}` | Cancel booking | Tourist |
| `GET` | `/api/creator/listing` | List all creators | Public |
| `GET` | `/api/creator/{id}` | Get creator profile by creator ID | Public |
| `POST` | `/api/services/creator/register/{id}` | Register/upgrade profile as creator | Authenticated |
| `GET` | `/api/creator/bookings/{id}` | Get creator collaboration bookings | Creator |
| `PUT` | `/api/creator/booking/{id}/status/{user_id}` | Update collaboration booking status | Creator |
| `POST` | `/api/ai/chat` | AI Chatbot for farm/creator recommendations | Public |
| `GET` | `/api/farmer/search/{userId}` | AI semantic search for farms | Public |
| `GET` | `/api/admin/stats` | Admin platform statistics | Admin |
| `GET` | `/api/admin/users` | Admin paginated user list | Admin |
| `PUT` | `/api/admin/user/{id}/verify` | Admin toggle verification status | Admin |
| `GET` | `/api/admin/bookings` | Admin global bookings overview | Admin |
| `POST` | `/api/contact` | Submit contact/support message | Public |

---

## 15. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 19 (`react`, `react-dom`) | Single Page Application UI |
| **Build Tool** | Vite 7 (`vite`, `@vitejs/plugin-react`) | Development server and bundle compiler |
| **Routing** | React Router DOM 7 | Client-side routing & route guards |
| **Styling** | Tailwind CSS 3, PostCSS, Autoprefixer | Utility-first responsive styling |
| **Animation & Icons** | Framer Motion, React Icons | UI animations and icons |
| **HTTP Client** | Axios | API communication with backend |
| **Backend Framework** | FastAPI (Python 3.8+) | High-performance REST API |
| **ASGI Server** | Uvicorn | Async web server |
| **ORM** | SQLAlchemy 2.0 | Relational database mapping |
| **Database Driver** | PyMySQL | MySQL database connector |
| **Data Validation** | Pydantic & Pydantic-Settings | Request/response schema validation |
| **Authentication** | `python-jose`, `passlib`, `bcrypt`, `google-auth` | JWT tokens, password hashing, Google OAuth |
| **Machine Learning / AI** | `sentence-transformers`, `scikit-learn`, `numpy` | Semantic embedding recommendations |
| **Testing** | Pytest, FastAPI TestClient | Automated backend test suite |

---

## 16. Project Structure

```text
v1/
├── README.md                      # V1 Developer Documentation
├── Backend/                       # FastAPI Backend
│   ├── main.py                    # Server entry point & CORS configuration
│   ├── requirements.txt           # Python backend dependencies
│   ├── ai_agent/                  # Semantic search & recommendation engine
│   │   ├── __init__.py
│   │   ├── recommendations.py     # SentenceTransformers cosine similarity agent
│   │   └── trip_planner.py        # Rule-based itinerary generator
│   ├── api/                       # API router definitions
│   │   ├── __init__.py
│   │   ├── api.py                 # Central router mounting all endpoints
│   │   └── endpoints/             # Endpoint route handlers
│   │       ├── __init__.py
│   │       ├── admin.py           # Admin dashboards and moderation
│   │       ├── ai.py              # Conversational AI chat endpoint
│   │       ├── auth.py            # Registration, login, Google OAuth, password reset
│   │       ├── config.py          # Environment settings and safe DB URL builder
│   │       ├── contact.py         # Contact us message submission
│   │       ├── creator.py         # Creator profile & collaboration endpoints
│   │       ├── farmer.py          # Farmer listings, bookings, and availability
│   │       └── tourist.py         # Tourist bookings and wishlist
│   ├── db/                        # Database layer
│   │   ├── __init__.py
│   │   ├── database.py            # SQLAlchemy engine, session maker, get_db
│   │   ├── models.py              # SQLAlchemy ORM models (Login, Farmer, Tourist, etc.)
│   │   └── schemas.py             # Pydantic request/response schemas
│   └── tests/                     # Test suite
│       ├── __init__.py
│       └── test_flows.py          # Pytest integration tests for auth and bookings
└── frontend/                      # React SPA Frontend
    ├── package.json               # Frontend dependencies & scripts
    ├── vite.config.js             # Vite configuration with @ path aliases
    ├── tailwind.config.js         # Tailwind styling configuration
    ├── postcss.config.js          # PostCSS configuration
    ├── jsconfig.json              # Path mapping configuration
    ├── index.html                 # HTML application template
    ├── public/                    # Static public assets
    └── src/
        ├── main.jsx               # React application entry point
        ├── App.jsx                # Root React component
        ├── App.css / index.css    # Global stylesheet rules
        ├── auth/                  # Authentication views
        │   ├── login.jsx          # Login & registration modal / view
        │   └── changePassword.jsx # Password reset view
        ├── pages/                 # Public marketing & content pages
        │   ├── landing.jsx        # Landing hero page
        │   ├── home.jsx           # Home exploration page
        │   ├── services.jsx       # Farm and Creator marketplace catalog
        │   ├── about.jsx          # About page
        │   ├── contact.jsx        # Contact form page
        │   ├── blog.jsx           # Blog listing & detail view
        │   └── AIChatbot.jsx      # AI trip planner interface
        ├── dashboard/             # Role-specific dashboard views
        │   ├── admin/             # Admin management console
        │   │   └── adminHome.jsx
        │   ├── farmers/           # Farmer portal
        │   │   ├── FarmerHome.jsx
        │   │   ├── FarmerCard.jsx
        │   │   ├── FarmerProfile.jsx
        │   │   ├── FarmerBookings.jsx
        │   │   ├── FarmerListings.jsx
        │   │   ├── FarmerListingForm.jsx
        │   │   ├── FarmerRegister.jsx
        │   │   └── FarmerSetting.jsx
        │   ├── creators/          # Creator portal
        │   │   ├── CreatorHome.jsx
        │   │   ├── CreatorCard.jsx
        │   │   ├── CreatorProfile.jsx
        │   │   ├── CreatorBookings.jsx
        │   │   ├── CreatorRegister.jsx
        │   │   └── CreatorSetting.jsx
        │   └── tourists/          # Tourist portal
        │       ├── TouristHome.jsx
        │       ├── TouristProfile.jsx
        │       ├── TouristBookings.jsx
        │       └── TouristSetting.jsx
        ├── components/            # Reusable UI elements
        │   ├── layout/            # Navbar, footer
        │   └── ui/                # Cards, search bar, modals, wishlist
        ├── routes/                # Client routing configuration
        │   └── AppRoutes.jsx      # React Router routes and ProtectedRoute guard
        └── services/              # API connector
            └── api.js             # Axios instance with auth interceptors
```

---

## 17. Development Setup

### Prerequisites
- **Python 3.8+** (Python 3.10+ recommended)
- **Node.js 18+** & **npm**
- **MySQL 8.0+** or **SQLite** (SQLite works out-of-the-box for local development)

### Step-by-Step Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/priyanshu130018/Namma-Connect.git
cd Namma-Connect/v1
```

#### 2. Backend Setup
```bash
cd Backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 3. Configure Backend Environment
Create a `.env` file in `v1/Backend/.env`:
```env
DATABASE_URL=sqlite:///./test.db
SECRET_KEY=development-secret-key-change-in-production-v1
GOOGLE_CLIENT_ID=
NAMMAGIG_ALLOW_HF_DOWNLOAD=0
```

#### 4. Frontend Setup
```bash
cd ../frontend

# Install node dependencies
npm install
```

#### 5. Configure Frontend Environment
Create a `.env.local` file in `v1/frontend/.env.local`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
```

---

## 18. Environment Variables

### Backend Variables (`v1/Backend/.env`)

| Variable | Type | Description | Default / Example |
|---|---|---|---|
| `DATABASE_URL` | String | Full SQLAlchemy connection string | `sqlite:///./test.db` or `mysql+pymysql://root:pass@localhost:3306/namma_gig` |
| `DB_USERNAME` | String | MySQL username (if DATABASE_URL is not set) | `root` |
| `DB_PASSWORD` | String | MySQL password (auto URL-encoded) | `password` |
| `DB_HOST` | String | MySQL hostname | `localhost` |
| `DB_PORT` | String | MySQL port | `3306` |
| `DB_NAME` | String | MySQL database name | `namma_gig` |
| `SECRET_KEY` | String | Secret key used for signing JWT tokens | `your-secret-key-here` |
| `GOOGLE_CLIENT_ID` | String | Google OAuth 2.0 Web Client ID | `your-google-client-id` |
| `NAMMAGIG_ALLOW_HF_DOWNLOAD` | String | Toggle downloading Hugging Face models (`1`/`0`) | `0` (offline mode) |

### Frontend Variables (`v1/frontend/.env.local`)

| Variable | Type | Description | Default / Example |
|---|---|---|---|
| `VITE_API_BASE_URL` | String | Base URL of the FastAPI backend | `http://localhost:8000` |
| `VITE_API_TIMEOUT` | Number | Request timeout in milliseconds | `30000` |

---

## 19. Running the Application

### 1. Start the Backend API Server
```bash
cd v1/Backend
# Ensure virtual environment is activated
uvicorn main:app --reload --port 8000
```
- **Backend API**: `http://localhost:8000`
- **Swagger Interactive Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

### 2. Start the Frontend Development Server
```bash
cd v1/frontend
npm run dev
```
- **Frontend Application**: `http://localhost:5173`

---

## 20. Testing

### Run Backend Automated Tests
V1 includes unit and integration tests covering user registration, login, role redirection, availability checks, and booking validation:

```bash
cd v1/Backend
pytest tests/test_flows.py -v
```

---

## 21. Security Considerations

- **Password Hashing**: Passwords are never stored in plaintext; they are hashed using `bcrypt` before storage.
- **JWT Verification**: Protected endpoints decode and validate JWT expiration and user identity using `python-jose`.
- **SQL Injection Protection**: All queries are constructed using SQLAlchemy ORM parameterized statements.
- **Special Character Password Handling**: Database passwords containing `@`, `:`, or other special characters are safely escaped via `urllib.parse.quote_plus` in `config.py`.
- **CORS Protection**: CORS middleware in `main.py` explicitly whitelists frontend origins (`http://localhost:5173`, `http://127.0.0.1:5173`).
- **Client Route Guards**: Protected routes verify localStorage session before rendering authenticated dashboards.

---

## 22. V1 Design Approach

V1 was designed with rapid development and functional separation in mind:
- **Dedicated Profile Entities**: Rather than storing polymorphic attributes on a single user table, V1 splits profiles into `Tourist`, `Farmer`, and `Creator` tables linked via one-to-one foreign keys with cascade deletion.
- **Auto Table Creation**: Tables are generated on application startup via `Base.metadata.create_all` for frictionless initial setup.
- **Hybrid AI Engine**: Combines lightweight semantic matching (`all-MiniLM-L6-v2`) with regex lexical fallbacks to guarantee uptime even in offline or air-gapped environments.

---

## 23. Known Limitations & Unfinished Areas

1. **No Live Payment Gateway**: Payments are not connected to Razorpay or Stripe; booking amounts are tracked numerically and confirmed via host status updates.
2. **Synchronous Schema Generation**: Does not use database migration tooling (e.g., Alembic); schema changes require manual SQL alteration or database recreation.
3. **No Real-Time Push Notifications**: Users must refresh or navigate dashboards to pull new bookings or status updates.
4. **Single-Language UI**: The frontend is built exclusively in English.
5. **Light Mode Only**: The UI does not support system or manual dark mode theming.
6. **In-Memory AI Context**: Conversational AI context is stateless across application restarts.

---

## 24. V1 vs Future Versions

| Dimension | NammaConnect V1 | NammaConnect V2 |
|---|---|---|
| **Database Engine** | MySQL / SQLite | PostgreSQL 16 + `pgvector` |
| **Database Migrations** | `Base.metadata.create_all` | Alembic Versioned Migrations (0001–0004) |
| **Payment Gateway** | Unintegrated / Mock | Authoritative Razorpay Test Mode with HMAC Signature Verification |
| **AI Integration** | Local `sentence-transformers` | Cloud Google Gemini API + pgvector 768-dim embeddings |
| **Internationalization** | English Only | Multi-Language (English, Kannada, Hindi) |
| **Theme Support** | Light Only | Full Dark / Light Theme System |
| **Notifications** | Dashboard query pull | Database-backed notification center with read states |
| **Synthetic Dev Data** | Manual insertion | Environment-guarded seeder (`500+` users, `1000+` services) |
