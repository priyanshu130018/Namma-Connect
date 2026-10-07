# Namma Connect V2 — API Reference

All API routes in Namma Connect V2 are mounted under the base path `/api/v2` (with `/health` exposed at the root).

---

## 1. Global Conventions & Standards

### 1.1 Base URL & Content Negotiation
- **Base Route**: `http://localhost:8000/api/v2` (or configured `API_V2_PREFIX`)
- **Content-Type**: `application/json`
- **Authentication Header**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`

### 1.2 Standard Success Envelope (`APIResponse[T]`)
Most operational endpoints return data wrapped in the standard response envelope:
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

### 1.5 HTTP Status Code Standards
| Status Code | Meaning | Typical Usage |
|---|---|---|
| `200 OK` | Success | Successful GET, PUT, or stateful POST |
| `201 Created` | Created | Successful entity creation (Register, Booking, Trip, Day) |
| `400 Bad Request` | Client Error | Invalid parameters, booking date collisions, bad signature |
| `401 Unauthorized` | Authentication Required | Missing, invalid, or expired JWT token |
| `403 Forbidden` | Access Denied | Role mismatch (e.g., non-admin accessing admin routes) or cross-user data access |
| `404 Not Found` | Not Found | Requested service, booking, or trip does not exist |
| `422 Unprocessable Entity`| Schema Validation Failed | Pydantic validation errors (missing required field, wrong type) |
| `429 Too Many Requests`| Rate Limited | Exceeded endpoint rate limit window |
| `500 Internal Error` | Server Error | Unhandled server-side exception |

---

## 2. Authentication Endpoints (`/api/v2/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/status` | Public | Check authentication gateway health |
| `POST` | `/auth/register` | Public | Register a new user account |
| `POST` | `/auth/login` | Public | Authenticate with email/mobile and password |
| `POST` | `/auth/refresh` | Public | Exchange refresh token for new access token |
| `POST` | `/auth/google` | Public | Authenticate via Google OAuth ID token |
| `GET` | `/auth/me` | Bearer | Retrieve authenticated user profile |
| `POST` | `/auth/logout` | Public | Client-side session termination |
| `POST` | `/auth/forgot-password` | Public | Dispatch password reset email link |
| `POST` | `/auth/reset-password` | Public | Reset password using verified reset token |
| `POST` | `/auth/change-password/request-otp` | Bearer | Request OTP for password change |
| `POST` | `/auth/change-password/verify-otp` | Bearer | Verify OTP for password change |
| `POST` | `/auth/change-password` | Bearer | Change password using current password |
| `POST` | `/auth/change-password/confirm` | Bearer | Change password using verified OTP token |
| `POST` | `/auth/verify-email` | Public | Verify email address via token |
| `POST` | `/auth/verify-phone` | Public | Verify phone number via OTP |
| `POST` | `/auth/resend-verification` | Optional | Resend verification email |

### Detailed Auth Payloads

#### `POST /auth/register`
**Request Body**:
```json
{
  "email": "traveler@example.com",
  "password": "SecurePassword123!",
  "full_name": "Rohan Gowda",
  "mobile": "+919876543210",
  "role": "customer"
}
```
**Response (201 Created)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "user": {
    "id": "c71e89ef-51a8-45e6-a0de-4414f4e7240c",
    "email": "traveler@example.com",
    "full_name": "Rohan Gowda",
    "mobile": "+919876543210",
    "role": "user",
    "is_active": true,
    "is_verified": false,
    "phone_verified": false,
    "auth_provider": "local",
    "avatar_url": null,
    "created_at": "2026-10-08T01:30:00Z"
  }
}
```

#### `POST /auth/login`
**Request Body**:
```json
{
  "email": "traveler@example.com",
  "password": "SecurePassword123!"
}
```

#### `POST /auth/refresh`
**Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

---

## 3. Search & Marketplace Catalog Endpoints (`/api/v2`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/search` | Public | Unified semantic vector & faceted keyword search |
| `GET` | `/services` | Public | List published service listings with pagination |
| `GET` | `/services/{id}` | Public | Retrieve detailed service listing by ID or slug |
| `GET` | `/services/{id}/availability` | Public | Check date availability and capacity slots |
| `POST` | `/services` | Partner / Admin | Create a new service listing (`PENDING` moderation) |
| `PUT` | `/services/{id}` | Owner / Admin | Update existing service listing |
| `GET` | `/categories` | Public | Retrieve active experience taxonomy categories |
| `GET` | `/recommendations/explore` | Public / Optional | Personalized or cold-start explore feed |

### Detailed Search Payloads

#### `GET /search`
**Query Parameters**:
- `q` (string): Natural language or keyword query (e.g., `"organic coffee estate Coorg"`).
- `category` (string): Category slug (`farm-stays`, `agro-tours`, `cultural-heritage`, `culinary`).
- `district` (string): Karnataka district (`Kodagu`, `Chikmagalur`, `Shivamogga`, `Mysuru`).
- `min_price` (float): Minimum price in INR.
- `max_price` (float): Maximum price in INR.
- `min_rating` (float): Minimum average star rating (e.g., `4.0`).
- `page` (int, default: 1): Page number.
- `page_size` (int, default: 20): Results per page.

**Response (200 OK)**:
```json
{
  "items": [
    {
      "id": "e3a89045-312a-4315-bbbc-877402a4659f",
      "title": "Heritage Coffee Plantation Stay & Cupping",
      "slug": "heritage-coffee-plantation-stay-coorg",
      "category": "Farm Stays",
      "district": "Kodagu",
      "location": "Madikeri",
      "price": 2800.00,
      "unit": "night",
      "rating": 4.9,
      "reviews_count": 42,
      "primary_image": "https://images.unsplash.com/...",
      "is_verified": true,
      "similarity_score": 0.91
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

---

## 4. Bookings Endpoints (`/api/v2/bookings`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/bookings` | Bearer (Customer) | Create a new reservation request |
| `GET` | `/bookings/me` | Bearer (Customer) | List current user's reservations |
| `GET` | `/bookings/{id}` | Bearer (Customer/Admin) | Retrieve single booking details |
| `POST` | `/bookings/{id}/cancel` | Bearer (Customer) | Cancel an active reservation |
| `GET` | `/bookings/partner` | Bearer (Partner/Admin) | List reservations for partner's hosted services |
| `GET` | `/bookings/partner/{id}` | Bearer (Partner/Admin) | Retrieve single guest booking manifest |
| `POST` | `/bookings/partner/{id}/status` | Bearer (Partner/Admin) | Update status (`CONFIRMED`, `COMPLETED`, `CANCELLED`) |

### Detailed Booking Payloads

#### `POST /bookings`
**Request Body**:
```json
{
  "service_id": "e3a89045-312a-4315-bbbc-877402a4659f",
  "start_date": "2026-11-15",
  "end_date": "2026-11-17",
  "guests": 2,
  "special_requests": "Vegetarian Kodava breakfast requested"
}
```
**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Booking request successfully created and queued in pending state.",
  "data": {
    "id": "b1990145-812a-4815-b77c-911402a46500",
    "booking_code": "BK-2026-89412",
    "service_id": "e3a89045-312a-4315-bbbc-877402a4659f",
    "customer_id": "c71e89ef-51a8-45e6-a0de-4414f4e7240c",
    "provider_id": "d82f9100-62b9-46f7-b1ef-552505f8351d",
    "start_date": "2026-11-15",
    "end_date": "2026-11-17",
    "guests": 2,
    "total_price": 5600.00,
    "platform_fee": 168.00,
    "status": "PENDING",
    "payment_status": "PENDING",
    "created_at": "2026-10-08T01:35:00Z"
  }
}
```

---

## 5. Payments & Settlements (`/api/v2/payments`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/payments/create-order` | Bearer (Customer) | Create Razorpay order for pending booking |
| `POST` | `/payments/verify` | Bearer (Customer) | Verify Razorpay HMAC-SHA256 signature |
| `POST` | `/payments/webhook` | Public (HMAC Verified)| Asynchronous Razorpay gateway webhook |
| `GET` | `/payments/history` | Bearer (Customer) | Retrieve transaction receipts for user |
| `POST` | `/payments/refund` | Bearer (Admin) | Initiate refund for cancelled reservation |

### Detailed Payment Payloads

#### `POST /payments/create-order`
**Request Body**:
```json
{
  "booking_id": "b1990145-812a-4815-b77c-911402a46500"
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Payment order successfully created",
  "data": {
    "order_id": "order_NC894123x90",
    "key_id": "rzp_test_51bH...",
    "amount": 576800,
    "currency": "INR",
    "booking_id": "b1990145-812a-4815-b77c-911402a46500"
  }
}
```

#### `POST /payments/verify`
**Request Body**:
```json
{
  "razorpay_order_id": "order_NC894123x90",
  "razorpay_payment_id": "pay_NC894123p01",
  "razorpay_signature": "4a719c80d507b9e02..."
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Payment signature verified successfully. Booking confirmed.",
  "data": {
    "booking_id": "b1990145-812a-4815-b77c-911402a46500",
    "payment_id": "pay_NC894123p01",
    "status": "PAID",
    "booking_status": "CONFIRMED"
  }
}
```

---

## 6. Trips & Itineraries (`/api/v2/trips`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/trips` | Bearer | List user's saved and planned trips |
| `POST` | `/trips` | Bearer | Create a new trip with optional days and items |
| `GET` | `/trips/{trip_id}` | Bearer | Retrieve full trip itinerary with days and items |
| `DELETE` | `/trips/{trip_id}` | Bearer | Delete a user trip |
| `POST` | `/trips/{trip_id}/days` | Bearer | Add a day schedule to a trip |
| `POST` | `/trips/days/{day_id}/items` | Bearer | Add a service or custom activity to a day |
| `POST` | `/trips/generate` | Bearer | Quick AI itinerary generation grounded in catalog |

### Detailed Trip Payloads

#### `POST /trips`
**Request Body**:
```json
{
  "title": "Chikmagalur Coffee & Waterfall Trail",
  "destination": "Chikkamagaluru, Karnataka",
  "description": "3-day family exploration in the Western Ghats",
  "start_date": "2026-11-20",
  "end_date": "2026-11-22",
  "origin": "Bengaluru",
  "days": [
    {
      "day_number": 1,
      "date": "2026-11-20",
      "title": "Arrival & Spice Farm Walk",
      "items": [
        {
          "title": "Mullayanagiri Peak Morning Walk",
          "item_type": "SERVICE",
          "service_id": "e3a89045-312a-4315-bbbc-877402a4659f",
          "start_time": "09:00",
          "end_time": "12:00",
          "sequence_order": 1
        }
      ]
    }
  ]
}
```

---

## 7. AI, Conversations & LangGraph Agent (`/api/v2/ai`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/ai/conversations` | Bearer | Start a new AI assistant conversation session |
| `GET` | `/ai/conversations` | Bearer | List user's conversation sessions |
| `GET` | `/ai/conversations/{id}/messages` | Bearer | Get chronological message history |
| `POST` | `/ai/conversations/{id}/messages` | Bearer | Send message and receive grounded recommendations |
| `POST` | `/ai/trip-plans/generate` | Bearer | Run multi-step agentic trip synthesis |
| `POST` | `/ai/trip-plans/{id}/refine` | Bearer | Refine itinerary (replace, remove, reduce budget) |
| `POST` | `/ai/trip-plans/{id}/confirm` | Bearer | Confirm proposal, persist to DB, generate handoff |
| `GET` | `/ai/trip-plans/{id}` | Bearer | Retrieve active trip plan draft state |
| `GET` | `/ai/trip-plans/{id}/booking-handoff` | Bearer | Retrieve pre-booking checkout handoff payload |
| `POST` | `/ai/agent/run` | Bearer | Unified LangGraph agent invocation |
| `GET` | `/ai/agent/state/{conversation_id}` | Bearer | Retrieve LangGraph agent checkpoint state |

### Detailed AI Payloads

#### `POST /ai/trip-plans/generate`
**Request Body**:
```json
{
  "destination": "Kodagu, Karnataka",
  "duration_days": 2,
  "start_date": "2026-12-01",
  "party_size": 2,
  "max_budget": 8000.0,
  "interests": ["coffee", "nature", "local food"],
  "language": "en"
}
```

#### `POST /ai/agent/run`
**Request Body**:
```json
{
  "conversation_id": "conv-a109-4412-88ef",
  "message": "Can you book the morning coffee trail for 2 people on Saturday?",
  "approval_granted": true
}
```
**Response (200 OK)**:
```json
{
  "conversation_id": "conv-a109-4412-88ef",
  "response": "I've checked availability for the Coorg Heritage Coffee Trail for 2 guests on Saturday. Ready for booking.",
  "intent": "BOOKING",
  "approval_required": false,
  "booking_ready": true,
  "handoff_payload": {
    "service_id": "e3a89045-312a-4315-bbbc-877402a4659f",
    "date": "2026-12-05",
    "guests": 2,
    "total_estimated": 5600.00
  }
}
```

---

## 8. Provider Onboarding & KYC (`/api/v2/partner-applications`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/partner-applications` | Bearer | Submit partner KYC verification application |
| `GET` | `/partner-applications/me` | Bearer | Check status of user's partner application |
| `GET` | `/admin/partner-applications` | Bearer (Admin) | List pending partner applications |
| `PUT` | `/admin/partner-applications/{id}/approve` | Bearer (Admin) | Approve application & upgrade role to `PARTNER` |
| `PUT` | `/admin/partner-applications/{id}/reject` | Bearer (Admin) | Reject application with reviewer notes |

---

## 9. Platform Administration (`/api/v2/admin`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/stats` | Bearer (Admin) | Platform KPIs (Volume, Users, Services, Bookings) |
| `GET` | `/admin/users` | Bearer (Admin) | Search, inspect, and manage user accounts |
| `PUT` | `/admin/users/{id}/role` | Bearer (Admin) | Update user role (`CUSTOMER`, `PARTNER`, `ADMIN`) |
| `PUT` | `/admin/services/{id}/moderate`| Bearer (Admin) | Approve or reject service listing |
| `GET` | `/admin/payouts` | Bearer (Admin) | Audit provider payout requests |
| `PUT` | `/admin/payouts/{id}/approve` | Bearer (Admin) | Approve provider payout disbursement |

---

## 10. System Health (`/health`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Comprehensive health check (PostgreSQL, Redis, pgvector) |

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
