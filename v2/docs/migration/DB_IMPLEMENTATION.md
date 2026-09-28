# Namma Connect V2 — Database Implementation & Model Architecture

**Authoritative Baseline Revision**: `0001_initial_namma_connect_v2`  
**Database Engine**: PostgreSQL 16 with `pgvector` extension  
**Target Database Name**: `namma_connect_dev`  
**Schema Governance**: Solely via Alembic migrations (`alembic upgrade head`). Runtime startup table creation (`Base.metadata.create_all()`) is strictly prohibited.

---

## 1. Modular Model Organization

All domain models are structured according to the Domain-Driven Modular Monolith pattern under `v2/backend/app/modules/`:

```
v2/backend/app/
├── core/
│   ├── database.py                   # Authoritative Declarative Base and Engine
│   └── enums.py                      # Centralized Domain Enums
├── models/
│   ├── base.py                       # GUID TypeDecorator and TimestampMixin
│   └── __init__.py                   # Central metadata registry re-exporting all modular models
└── modules/
    ├── user/domain/models.py         # User entity & authentication credentials
    ├── provider/domain/models.py     # PartnerApplication (Host onboarding & KYC)
    ├── marketplace/domain/models.py  # MarketplaceCategory, Service, ServiceAvailability,
    │                                 # SavedService, ContentTranslation
    ├── booking/domain/models.py      # Booking (Authoritative customer transactions)
    ├── payment/domain/models.py      # Payment, Refund, Payout
    ├── review/domain/models.py       # Review (Verified post-trip customer feedback)
    ├── notification/domain/models.py # Notification, EmailLog
    ├── messaging/domain/models.py    # Conversation, Message
    ├── trip/domain/models.py         # Trip, TripDay, TripItem, AITripPlan
    ├── recommendation/domain/models.py # UserInteraction, UserInterestProfile, UserSimilarity,
    │                                 # RecommendationResult, Impression, Feedback
    ├── ai/domain/models.py           # AIConversation, AIMessage
    ├── analytics/domain/models.py    # NCScoreSnapshot, ProviderDailyMetrics, ServiceDailyMetrics,
    │                                 # ProviderResponseMetrics, ProviderActionRecommendation
    ├── support/domain/models.py      # SupportTicket
    └── admin/domain/models.py        # PlatformSetting
```

---

## 2. Authoritative Metadata Registry

1. **Single Source of Declarative Base**: `app.core.database.Base` (and `app.models.base.Base`) serves as the single Declarative Base instance across the entire application.
2. **Registry Discovery**: `app/models/__init__.py` imports and re-exports all domain models from their respective modules. When Alembic runs `env.py`, importing `app.models` registers all 35 tables against `target_metadata = Base.metadata`.
3. **Compatibility Layer**: Legacy imports from `app.models.*` transparently proxy to `app.modules.*.domain.models`, ensuring zero broken references or circular dependencies.

---

## 3. Major Table Groups

### 3.1 Identity & Access
- `users`: User identity, hashed passwords, Argon2id/Bcrypt hashes, phone verification, canonical roles (`CUSTOMER`, `PARTNER`, `ADMIN`).

### 3.2 Provider & Host Management
- `partner_applications`: Progressive KYC verification (Aadhaar, PAN, RTC, business details) and moderation review state.
- `payouts`: Host financial disbursement requests and bank account references.

### 3.3 Marketplace Catalog & Availability
- `marketplace_categories`: Permanent taxonomy entities (10 pre-seeded categories: Farm Tours, Adventure, Heritage, Culinary, Nature, Wellness, Eco Resorts, Dining, Transport, Media Creators). Can exist with zero listings.
- `services`: Published and pending marketplace listings with 768-dim `pgvector` embeddings, provider metadata, and `Numeric(12, 2)` pricing.
- `service_availabilities`: Real-time calendar slot capacity, pricing overrides, and blackout locks.
- `saved_services`: Customer wishlists and bookmarked listings.
- `content_translations`: Multilingual translation cache for Kannada and Hindi localization.

### 3.4 Transactions & Ledger
- `bookings`: Normalized booking transactions (`unit_price` and `total_amount` in `Numeric(12, 2)`).
- `payments`: Razorpay test mode orders, cryptographic HMAC signatures, and transaction states.
- `refunds`: Refund ledgers with Razorpay gateway identifiers.

### 3.5 Trips & Itineraries (Strict Boundary)
- `trips`: High-level itinerary containers (`My Trips`).
- `trip_days`: Sequential schedule days.
- `trip_items`: Scheduled milestones linking to services, stays, or custom notes.
- `ai_trip_plans`: Gemini-generated trip plans preserving prompt, constraints, and preferences.

### 3.6 Recommendation Subsystem (Strict Entity Separation)
- `user_interactions`: Raw clickstream/event telemetry (`VIEW`, `DETAIL_OPEN`, `SAVE`, `BOOK`, etc.).
- `user_interest_profiles`: Aggregated category, destination, and budget affinities.
- `user_similarities`: User-to-user similarity matrix for collaborative filtering.
- `recommendation_results`: Precomputed candidate rankings with explainability codes.
- `recommendation_impressions`: Surface and section impression tracking.
- `recommendation_feedback`: Explicit feedback (`LIKE`, `DISLIKE`, `NOT_INTERESTED`).

### 3.7 AI & Communications
- `ai_conversations` & `ai_messages`: Multi-turn conversational AI sessions.
- `conversations` & `messages`: Direct guest-to-host chat.
- `notifications` & `email_logs`: In-app notification hub and Resend email audit logs.

### 3.8 Intelligence, Governance & Support
- `nc_score_snapshots`: Provider and service quality score tracking.
- `provider_daily_metrics` & `service_daily_metrics`: Daily aggregated conversion, revenue, and occupancy.
- `provider_response_metrics`: Response latency and booking acceptance rates.
- `provider_action_recommendations`: Actionable intelligence recommendations for hosts.
- `support_tickets`: Grievance and dispute tickets.
- `platform_settings`: Dynamic feature toggles and platform commission rates.

---

## 4. Key Architectural Decisions

1. **Elimination of Deprecated Creator Profiles**:
   - `creator_profiles` and `collaborations` tables are completely eliminated.
   - Content creators, photographers, and guides are modeled as standard **Service Providers** offering bookable services in the marketplace under the `Content Creators & Media` category.
2. **Strict Boundary between Trips, Bookings, and Saved**:
   - **My Trips** = Itinerary planning container (`trips`, `trip_days`, `trip_items`).
   - **Bookings** = Actual financial transactions and reserved availability slots (`bookings`, `payments`).
   - **Saved** = Wishlist bookmarks (`saved_services`).
3. **Monetary Precision**:
   - All financial columns (`price`, `unit_price`, `total_amount`, `amount`, `revenue`, `gross`, `net`) use `Numeric(12, 2)` instead of floating-point numbers.
4. **Vector Storage**:
   - Service embeddings use native `Vector(768)` from `pgvector` for Google Gemini embeddings.

---

## 5. Centralized Enum Strategy

Domain statuses are defined in `app/core/enums.py`:
- `UserRole`: `CUSTOMER`, `PARTNER`, `ADMIN`
- `ApplicationStatus`: `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `CHANGES_REQUESTED`
- `ServiceStatus`: `DRAFT`, `PENDING`, `APPROVED`, `PUBLISHED`, `REJECTED`, `SUSPENDED`
- `BookingStatus`: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`
- `PaymentStatus`: `PENDING`, `ORDER_CREATED`, `PAID`, `FAILED`, `REFUNDED`
- `TripStatus`: `DRAFT`, `PLANNED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`
- `InteractionEventType`: `VIEW`, `DETAIL_OPEN`, `CLICK`, `SAVE`, `UNSAVE`, `BOOK`, `SEARCH`, `SHARE`, `DISMISS`, `ADD_TO_TRIP`

---

## 6. Indexing Strategy

Targeted composite and single-column indexes are added for hot query paths:
- `idx_service_search` on `services(category_slug, status, price)`
- `idx_service_location` on `services(district, state)`
- `idx_service_avail_date` on `service_availabilities(service_id, date)`
- `idx_customer_bookings` on `bookings(customer_id, status, created_at)`
- `idx_booking_payments` on `payments(booking_id, status)`
- `idx_service_reviews` on `reviews(service_id, status, rating)`
- `idx_user_interaction_event` on `user_interactions(user_id, event_type, created_at)`
- `idx_user_rec_section` on `recommendation_results(user_id, section, score)`
- `idx_trips_user_start` on `trips(user_id, start_date)`
- `idx_provider_action_priority` on `provider_action_recommendations(provider_id, priority_score)`

---

## 7. Applying the Schema Migration

To apply the complete V2 schema on a fresh PostgreSQL database (`namma_connect_dev`):

```bash
# Navigate to backend directory
cd v2/backend

# Run Alembic upgrade to head
python -m alembic upgrade head
```

To generate SQL output offline:
```bash
python -m alembic upgrade head --sql
```

To roll back the baseline schema:
```bash
python -m alembic downgrade base
```
