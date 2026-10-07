# Namma Connect V2 — API Reference

All API routes in Namma Connect V2 are mounted under the base path `/api/v2` (with `/health` exposed at the root).

---

## 1. Global Conventions & Standards

### 1.1 Base URL & Content Negotiation
- **Base Route**: `http://localhost:8000/api/v2` (or configured `API_V2_PREFIX`)
- **Content-Type**: `application/json`
- **Authentication Header**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`

### 1.2 Standard Success Envelope (`APIResponse[T]`)
Operational endpoints return data wrapped in the standard response envelope:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### 1.3 Simple Message Envelope (`MessageResponse`)
Utility or acknowledgement endpoints return:
```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

### 1.4 Standard Error Response Format
When an exception or validation error occurs:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid booking date range: start_date must precede end_date.",
    "request_id": "req-8f4b23a1-c34d-4889",
    "details": {}
  }
}
```

### 1.5 Role Requirements
- **`Public`**: No authentication required.
- **`USER`**: Authenticated traveler / explorer (`get_current_user`).
- **`PROVIDER`**: Authenticated host / provider (`require_partner` / `require_provider`).

---

## 2. Authentication Endpoints (`/api/v2/auth`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/auth/status` | Public | Check authentication gateway health |
| `POST` | `/auth/register` | Public | Register a new user or provider account |
| `POST` | `/auth/login` | Public | Authenticate with email/mobile and password |
| `POST` | `/auth/refresh` | Public | Exchange refresh token for new access token |
| `POST` | `/auth/google` | Public | Authenticate via Google OAuth ID token |
| `GET` | `/auth/me` | USER / PROVIDER | Retrieve authenticated user profile |
| `POST` | `/auth/logout` | Public | Client-side session termination |
| `POST` | `/auth/forgot-password` | Public | Dispatch password reset email link |
| `POST` | `/auth/reset-password` | Public | Reset password using verified reset token |
| `POST` | `/auth/change-password/request-otp` | USER / PROVIDER | Request OTP for password change |
| `POST` | `/auth/change-password/verify-otp` | USER / PROVIDER | Verify OTP for password change |
| `POST` | `/auth/change-password` | USER / PROVIDER | Change password using current password |
| `POST` | `/auth/change-password/confirm` | USER / PROVIDER | Change password using verified OTP token |
| `POST` | `/auth/verify-email` | Public | Verify email address via token |
| `POST` | `/auth/verify-phone` | Public | Verify phone number via OTP |
| `POST` | `/auth/resend-verification` | Public / Optional | Resend verification email |

---

## 3. Marketplace & Search Endpoints (`/api/v2`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/search` | Public | Unified semantic vector & faceted keyword search |
| `GET` | `/services` | Public | List published service listings with pagination |
| `GET` | `/services/{id}` | Public | Retrieve detailed service listing by ID or slug |
| `GET` | `/services/{id}/availability` | Public | Check date availability and capacity slots |
| `POST` | `/services` | PROVIDER | Create a new service listing |
| `PUT` | `/services/{id}` | PROVIDER | Update existing service listing owned by provider |
| `GET` | `/categories` | Public | Retrieve active experience taxonomy categories |
| `GET` | `/recommendations/explore` | Public / Optional | Personalized or cold-start explore feed |

### Search Parameters (`GET /search`)
- `q` (string): Natural language or keyword query (e.g., `"organic coffee estate Coorg"`).
- `category` (string): Category slug (`farm-stays`, `agro-tours`, `cultural-heritage`, `culinary`).
- `district` (string): Karnataka district (`Kodagu`, `Chikmagalur`, `Shivamogga`, `Mysuru`).
- `min_price` (float): Minimum price in INR.
- `max_price` (float): Maximum price in INR.
- `min_rating` (float): Minimum average star rating.
- `page` (int, default: 1): Page number.
- `page_size` (int, default: 20): Results per page.

---

## 4. Bookings Endpoints (`/api/v2/bookings`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/bookings` | USER | Create a new reservation request |
| `GET` | `/bookings/me` | USER | List current user's reservations |
| `GET` | `/bookings/{id}` | USER | Retrieve single booking details for the user |
| `POST` | `/bookings/{id}/cancel` | USER | Cancel an active reservation |
| `GET` | `/bookings/partner` | PROVIDER | List guest reservations for provider's services |
| `GET` | `/bookings/partner/{id}` | PROVIDER | Retrieve single guest booking manifest |
| `POST` | `/bookings/partner/{id}/status` | PROVIDER | Update status (`CONFIRMED`, `COMPLETED`, `CANCELLED`) |

---

## 5. Payments & Settlements (`/api/v2/payments`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/payments/create-order` | USER | Create Razorpay order for pending booking (in paise) |
| `POST` | `/payments/verify` | USER | Verify Razorpay HMAC-SHA256 signature |
| `POST` | `/payments/webhook` | Public (HMAC Verified) | Asynchronous Razorpay gateway webhook |
| `GET` | `/payments/history` | USER | Retrieve transaction receipts for user |

---

## 6. Trips & Itineraries (`/api/v2/trips`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/trips` | USER | List user's saved and planned trips |
| `POST` | `/trips` | USER | Create a new trip with optional days and items |
| `GET` | `/trips/{trip_id}` | USER | Retrieve full trip itinerary with days and items |
| `DELETE` | `/trips/{trip_id}` | USER | Delete a user trip |
| `POST` | `/trips/{trip_id}/days` | USER | Add a day schedule to a trip |
| `POST` | `/trips/days/{day_id}/items` | USER | Add a service or custom activity to a day |
| `POST` | `/trips/generate` | USER | Quick AI itinerary generation grounded in catalog |

---

## 7. AI, Conversations & LangGraph Agent (`/api/v2/ai`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/ai/conversations` | USER | Start a new AI assistant conversation session |
| `GET` | `/ai/conversations` | USER | List user's conversation sessions |
| `GET` | `/ai/conversations/{id}/messages` | USER | Get chronological message history |
| `POST` | `/ai/conversations/{id}/messages` | USER | Send message and receive grounded recommendations |
| `POST` | `/ai/trip-plans/generate` | USER | Run multi-step agentic trip synthesis |
| `POST` | `/ai/trip-plans/{id}/refine` | USER | Refine itinerary (replace, remove, reduce budget) |
| `POST` | `/ai/trip-plans/{id}/confirm` | USER | Confirm proposal, persist to DB, generate handoff |
| `GET` | `/ai/trip-plans/{id}` | USER | Retrieve active trip plan draft state |
| `GET` | `/ai/trip-plans/{id}/booking-handoff` | USER | Retrieve pre-booking checkout handoff payload |
| `POST` | `/ai/agent/run` | USER | Unified LangGraph agent invocation |
| `GET` | `/ai/agent/state/{conversation_id}` | USER | Retrieve LangGraph agent checkpoint state |

---

## 8. Provider Financials & Intelligence (`/api/v2`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/earnings` | PROVIDER | Retrieve gross volume, net earnings & commission |
| `GET` | `/payouts` | PROVIDER | List provider payout requests and status |
| `POST` | `/payouts` | PROVIDER | Request a payout disbursement |
| `GET` | `/provider/analytics` | PROVIDER | Retrieve service view counts and conversion metrics |

---

## 9. System Health (`/health`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Deep health check (PostgreSQL, Redis, pgvector) |

**Response (200 OK)**:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "environment": "production",
  "checks": {
    "database": "connected",
    "pgvector": "available",
    "redis": "connected"
  }
}
```
