# Namma Connect V2 — Backend Implementation & Modular Architecture

**Authoritative Baseline**: Step 3 Migration Complete  
**Architecture Style**: Modular Monolith with Layered Architecture (`presentation`, `application`, `domain`, `infrastructure`)  
**API Prefix**: `/api/v2`  
**Database**: PostgreSQL 16 + `pgvector` (`namma_connect_dev`) accessed via SQLAlchemy 2 Repositories  

---

## 1. Architectural Architecture & Design Principles

The backend is organized into 15 cohesive business modules following Domain-Driven Design principles within a single modular monolithic codebase. Each module is strictly isolated into 4 distinct architectural layers:

```
app/modules/<module_name>/
├── domain/                  # Domain Models (SQLAlchemy entities, Value Objects, Domain Enums)
├── infrastructure/          # Data Access (SQLAlchemy Repositories, DB transactions)
├── application/             # Business Logic Services, Orchestration, Calculations, Guards
├── presentation/            # FastAPI HTTP Routers, Pydantic Request/Response Schemas, Dependencies
└── tests/                   # Module-specific unit and integration test suites
```

### Core Layer Responsibilities:
1. **Domain Layer (`domain/`)**: Pure entity definitions, relationships, constraints, and domain types without HTTP or framework coupling.
2. **Infrastructure Layer (`infrastructure/repository.py`)**: Encapsulates all query creation, filtering, pagination, and persistence operations.
3. **Application Layer (`application/service.py`)**: Encapsulates business validation, transaction boundaries, pricing formulas, state progression guards, and orchestration.
4. **Presentation Layer (`presentation/router.py`, `presentation/schemas.py`)**: Validates HTTP payloads using Pydantic v2 schemas, handles authentication dependencies, and delegates directly to application services. Routers contain **zero raw database queries or direct business rules**.

---

## 2. Module Inventory & Catalog

| Module | Purpose | Domain Models | Key Services & Repositories | Core Endpoints |
|---|---|---|---|---|
| **`auth`** | Authentication & Token Management | `User` | `AuthService`, `AuthRepository` | `/api/v2/auth/register`, `/api/v2/auth/login`, `/api/v2/auth/refresh`, `/api/v2/auth/logout` |
| **`user`** | Customer & Provider Profiles | `User` | `UserService`, `UserRepository` | `/api/v2/users/me`, `/api/v2/users/{user_id}` |
| **`provider`** | Partner Onboarding & KYC | `PartnerApplication`, `User` | `ProviderService`, `ProviderRepository` | `/api/v2/partner-applications`, `/api/v2/partner-applications/me` |
| **`marketplace`**| Services, Categories & Availability | `MarketplaceCategory`, `Service`, `ServiceAvailability`, `SavedService` | `MarketplaceService`, `MarketplaceRepository` | `/api/v2/categories`, `/api/v2/services`, `/api/v2/search`, `/api/v2/saved` |
| **`booking`** | Reservation Lifecycle & Pricing | `Booking` | `BookingService`, `BookingRepository` | `/api/v2/bookings`, `/api/v2/bookings/{id}`, `/api/v2/bookings/{id}/cancel` |
| **`payment`** | Razorpay Gateway, Escrow & Refunds | `Payment`, `Refund`, `Payout` | `PaymentService`, `PaymentRepository` | `/api/v2/payments/create-order`, `/api/v2/payments/verify`, `/api/v2/payments/refund`, `/api/v2/payments/payouts` |
| **`review`** | Rating & Verified Review Engine | `Review` | `ReviewService`, `ReviewRepository` | `/api/v2/reviews`, `/api/v2/reviews/service/{id}`, `/api/v2/reviews/{id}/helpful` |
| **`notification`** | In-App & Email Event Dispatch | `Notification`, `EmailLog` | `NotificationService`, `NotificationRepository` | `/api/v2/notifications`, `/api/v2/notifications/unread-count`, `/api/v2/notifications/{id}/read` |
| **`messaging`** | Provider-Customer Conversations | `Conversation`, `Message` | `MessagingService`, `MessagingRepository` | `/api/v2/messages`, `/api/v2/messages/conversations`, `/api/v2/messages/conversations/{id}` |
| **`trip`** | Multi-Day AI & Manual Itineraries | `Trip`, `TripDay`, `TripItem`, `AITripPlan` | `TripService`, `TripRepository` | `/api/v2/trips`, `/api/v2/trips/{id}`, `/api/v2/trips/{id}/items` |
| **`recommendation`**| Collaborative & Content Filtering | `UserInteraction`, `UserInterestProfile`, `RecommendationResult` | `RecommendationService`, `RecommendationRepository` | `/api/v2/recommendations`, `/api/v2/recommendations/interactions` |
| **`ai`** | Trip Advisor Chat & Suggestions | `AIConversation`, `AIMessage` | `AIService`, `AIRepository` | `/api/v2/ai/conversations`, `/api/v2/ai/conversations/{id}/messages` |
| **`analytics`** | Provider Intelligence & NC Scores | `NCScoreSnapshot`, `ProviderDailyMetrics`, `ProviderActionRecommendation` | `AnalyticsService`, `AnalyticsRepository` | `/api/v2/analytics/provider/summary`, `/api/v2/analytics/provider/nc-score` |
| **`support`** | Help Desk & Dispute Tickets | `SupportTicket` | `SupportService`, `SupportRepository` | `/api/v2/support/tickets`, `/api/v2/support/tickets/{id}` |
| **`admin`** | Platform Governance & Settings | `PlatformSetting`, `User` | `AdminService`, `AdminRepository` | `/api/v2/admin/overview`, `/api/v2/admin/users`, `/api/v2/admin/settings` |

---

## 3. Central Router Aggregation

All modular presentation routers are mounted under the unified API v2 router (`app/api/v2/router.py`) and wired into the top-level FastAPI application:

```python
# app/api/v2/router.py
from fastapi import APIRouter

api_v2_router = APIRouter()

# Mounted Modular Routers
api_v2_router.include_router(auth_router)
api_v2_router.include_router(user_router)
api_v2_router.include_router(provider_router)
api_v2_router.include_router(marketplace_router)
api_v2_router.include_router(booking_router)
api_v2_router.include_router(payment_router)
api_v2_router.include_router(review_router)
api_v2_router.include_router(notification_router)
api_v2_router.include_router(messaging_router)
api_v2_router.include_router(trip_router)
api_v2_router.include_router(recommendation_router)
api_v2_router.include_router(ai_router)
api_v2_router.include_router(analytics_router)
api_v2_router.include_router(support_router)
api_v2_router.include_router(admin_router)
```

---

## 4. Key Implementation Rules Enforced

1. **Deprecated Entity Elimination**:
   - Creator and collaboration models (`creator_profiles`, `collaborations`) have been completely decoupled and removed from all active V2 routers, services, and schemas.
2. **Financial Precision**:
   - All currency fields (`price`, `total_amount`, `unit_price`, `payout_amount`, `revenue`, `gross`, `net`) use `Numeric(12, 2)` / Python `Decimal` / `float` rounding guards to eliminate floating-point drift.
3. **Domain Safety Guards**:
   - Self-booking guard: Hosts are prohibited from booking their own listings.
   - Verified Review guard: Reviews require verification flags or confirmed bookings.
   - Escrow workflow: Booking confirmation automatically triggers upon successful payment verification.
4. **Clean Serialization**:
   - Explicit Pydantic response models and standardized error response payloads across all HTTP handlers.

---

## 5. Verification & Test Suite Summary

- **Total Modular Test Cases**: 16 comprehensive end-to-end tests covering all service lifecycles and domain relationships.
- **Test Suites**:
  - `tests/test_v2_modular_services.py`: Auth & User lifecycle, Provider KYC onboarding, Marketplace & Booking flow, Payment & Refund flow, Review & Rating aggregation, Messaging & Notifications, Trip planning, Admin settings & Analytics, and API v2 router mounting.
  - `tests/test_v2_models_and_schema.py`: Metadata registry integrity, elimination of deprecated models, foreign key relationships, Numeric precision validation, and trip item cascade rules.
- **Python Bytecode Compilation**: Verified with `python -m compileall -q app` with 0 syntax or import errors.
