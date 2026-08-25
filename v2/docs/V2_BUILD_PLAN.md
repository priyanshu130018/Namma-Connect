# Namma Connect V2 — Master Build Plan

This roadmap outlines the sequential, milestone-driven execution plan for building Namma Connect V2 from ground up.

---

## 24-Step Implementation Roadmap

```
  [01. Foundation]  ──►  [02. Authentication]  ──►  [03. Public Website]  ──►  [04. Customer App Shell]
         │
         ▼
  [05. Search & Discovery]  ──►  [06. Services & Details]  ──►  [07. Real-Time Availability]
         │
         ▼
  [08. Booking Engine]  ──►  [09. Razorpay Payments]  ──►  [10. Trips & Itineraries]
         │
         ▼
  [11. Partner Onboarding]  ──►  [12. Partner Listings Wizard]  ──►  [13. Host Bookings Queue]
         │
         ▼
  [14. Earnings & Payouts]  ──►  [15. Creator System & Media Kit]  ──►  [16. Host-Creator Collabs]
         │
         ▼
  [17. Notification Hub]  ──►  [18. Messaging Engine]  ──►  [19. Admin Operations Console]
         │
         ▼
  [20. Recommendations]  ──►  [21. Travel AI Chatbot]  ──►  [22. Support AI Agent]
         │
         ▼
  [23. RAG Knowledge Base]  ──►  [24. Security Audit, Load Testing & Polish]
```

### Detailed Phase Milestones

1. **Foundation (Current Phase)**: Clean project scaffold, core design tokens, UI primitives, 4 distinct layout shells (`Public`, `Customer`, `Partner`, `Admin`), route placeholders, API client, FastAPI `/health` & `/api/v2`, database Base, Alembic setup, and automated smoke tests.
2. **Authentication**: Argon2id password hashing, JWT Access & Refresh token rotation, Google OAuth 2.0 verification, OTP email/phone fallback, and Role-Based Access Control (RBAC).
3. **Public Website**: Marketing landing page (`/`), About (`/about`), Contact (`/contact`), FAQ (`/faq`), Terms (`/terms`), Privacy (`/privacy`), Login (`/login`), Register (`/register`).
4. **Customer Application**: Authenticated customer workspace at `/app`, persistent top header, customer navigation, profile, and settings.
5. **Search & Discovery**: `GET /api/v2/search`, `GET /api/v2/search/suggestions`, faceted filtering (dates, location, capacity, agro-category, budget), and geo-distance queries.
6. **Services & Details**: Service details view (`/app/services/[service_id]`), high-res photo gallery, crop seasonal calendar, amenities list, verified host badge, and customer reviews.
7. **Availability**: Live slot calendar, reservation hold lock, date collision prevention engine, and capacity validation.
8. **Booking**: Authoritative server-side price calculation (base rate + service tax + platform fee), self-booking prevention guard, and booking status state-machine (`pending` $\to$ `confirmed` $\to$ `completed` $\to$ `cancelled`).
9. **Payments**: Razorpay order generation (`/api/v2/payments/create-order`), webhook signature validation (`/api/v2/payments/webhook`), idempotency protection, and automated refund processing.
10. **Trips**: Customer trip management (`/app/my-trip`, `/app/bookings`), QR check-in generation, offline PDF invoice download, and cancellation workflows.
11. **Partner Onboarding**: Farm host KYC registration flow, land ownership document upload to secure Cloudinary vault, and Aadhaar/PAN compliance.
12. **Partner Services**: Host listing builder (`/partner/services/new`), photo upload, seasonal pricing matrix, capacity limits, and farm rules management.
13. **Partner Bookings**: Host reservation management queue (`/partner/bookings`), guest check-in scanner, and booking acceptance/declination controls.
14. **Earnings & Payouts**: Automated Razorpay Route / Fund Account bank payouts (`/partner/earnings`), commission ledger, and TDS deduction reporting.
15. **Creator System**: Creator studio (`/partner/creator`), media kit builder, Instagram/YouTube API reach metrics, and collaboration packages.
16. **Collaboration**: Host-to-creator campaign proposals (`/partner/collaborations`), deliverable verification, and content licensing agreements.
17. **Notifications**: Multi-channel notification center (`/app/notifications`), WebSockets for live push, and transactional SMS/Email workers.
18. **Messaging**: In-app encrypted messaging channel between guests and hosts (`/app/messages`), pre-booking inquiries, and media attachments.
19. **Admin**: Platform operations console (`/admin`), host KYC verification queue, listing moderation, dispute management, and financial audit logs.
20. **Recommendations**: Collaborative filtering and seasonal agro-recommendation engine based on crop harvest cycles and traveler preferences.
21. **Travel AI**: Intelligent conversational assistant (`POST /api/v2/ai/travel/chat`) for finding farm stays, drafting itineraries, and checking availability.
22. **Support AI**: Automated customer & host grievance resolution agent with escalation triggers.
23. **RAG**: Retrieval-Augmented Generation indexing local agricultural knowledge, host guidelines, and regional travel advisories with LangChain & Gemini.
24. **Testing, Security & Polish**: Full end-to-end integration tests, OWASP vulnerability audit, rate limiting, and performance optimization.
