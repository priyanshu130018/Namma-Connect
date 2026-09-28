# Namma Connect V2: Security & Authorization Audit Report

**Date**: September 15, 2026  
**Status**: `PASSED`  
**Scope**: Complete Authentication, RBAC, Data Isolation, Secret Handling, LLM Anti-Fabrication, and Financial Safeguards.

---

## 1. Authentication & Session Security

- **Password Hashing**: Industry-standard Argon2id / Bcrypt via `PassLib` with dynamic salt generation.
- **Token Model**: Ephemeral JSON Web Tokens (JWT) signed using HMAC-SHA256 (`HS256`) with strict expiration (Access: 15–60 mins, Refresh: 30 days).
- **Session Revocation**: Stateless token validation paired with user active flag checks (`User.is_active`).

---

## 2. Role-Based Access Control (RBAC) & Boundary Matrix

| Module / Endpoint Scope | Customer | Provider / Partner | Admin | Verification Result |
| :--- | :---: | :---: | :---: | :--- |
| `/api/v2/users/me` | Own profile only | Own profile only | Full access | `ENFORCED` |
| `/api/v2/services` (POST/PUT/DELETE) | Denied (403) | Own listings only | Full access | `ENFORCED` |
| `/api/v2/bookings` (POST) | Can book (except self) | Can book (except self) | Full access | `ENFORCED` |
| `/api/v2/bookings/{id}/status` | Denied (403) | Own service bookings only | Full access | `ENFORCED` |
| `/api/v2/payments/refund` | Own paid booking only | Denied (403) | Full access | `ENFORCED` |
| `/api/v2/payouts` (POST) | Denied (403) | Denied (403) | Admin Only | `ENFORCED` |
| `/api/v2/ai/conversations/*` | Own threads only | Own threads only | Full access | `ENFORCED` |
| `/api/v2/ai/trip-plans/*` | Own plans only | Own plans only | Full access | `ENFORCED` |
| `/api/v2/admin/*` | Denied (403) | Denied (403) | Admin Only | `ENFORCED` |

---

## 3. Financial & Transaction Integrity Controls

- **Authoritative Backend Pricing**: Client-supplied prices and totals are strictly ignored. All order subtotals, GST (5%), and platform fees (3%) are calculated server-side using fixed-point `Decimal` arithmetic.
- **Max Refund Invariant**: Refund amounts are validated: $0 < 	ext{refund\_amount} \le 	ext{original\_payment\_amount}$. Refunding pending or already-refunded transactions raises HTTP 400.
- **Concurrency & Slot Locking**: Simultaneous booking requests against limited slot capacity are protected via row-level locks (`SELECT FOR UPDATE`), completely preventing overselling.
- **Self-Booking Protection**: Providers attempting to book their own service listings are rejected with HTTP 400.

---

## 4. AI Grounding & Anti-Fabrication Safeguards

- **Controlled Tool Execution**: Assistant and Trip Planner tools (`search_services`, `get_service_details`, `check_availability`, `get_user_context`) execute deterministic backend queries.
- **No LLM Data Mutation**: The LLM cannot directly modify database tables, bypass payment gateways, or create unauthorized bookings.
- **Strict Grounding Invariant**: Pricing, capacity limits, and provider names in trip proposals are populated exclusively from verified database records.
- **Boundary Separation**: Planning $
e$ Booking $
e$ Payment. Handoffs remain strictly pre-booking (`bookings_created: false`, `payment_created: false`).

---

## 5. Network, Error, and Secret Hygiene

- **Secret Sanitization**: Zero committed production secrets; all external credentials (`GEMINI_API_KEY`, `RAZORPAY_KEY_SECRET`, `CLOUDINARY_API_SECRET`) are loaded from environment settings.
- **Error Shielding**: Production responses (`DEBUG=False`) suppress internal tracebacks, SQL statements, and filesystem paths.
- **Rate Limiting**: Sliding-window rate limiters with Redis and in-memory fallback protect authentication, AI, and search endpoints against abuse.
- **Security Headers Middleware**: Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and strict CORS policies.
