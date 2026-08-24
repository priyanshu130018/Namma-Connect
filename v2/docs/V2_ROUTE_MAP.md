# Namma Connect V2 — Application Route Map

This document establishes the authoritative URL map, access constraints, and required layouts across the four Namma Connect V2 application surfaces.

---

## 1. Public Website Shell (`PublicLayout`)
*Unauthenticated public access for marketing, informational copy, legal disclosures, and authentication entry.*

| Route Path | Access | Required Role | Primary Purpose / Page Function |
| :--- | :--- | :--- | :--- |
| `/` | **Public** | None (Guest) | Brand marketing, value proposition, service categories overview, partner/creator invitation CTA |
| `/about` | **Public** | None (Guest) | Mission, founding agricultural vision, milestone statistics, and sustainability pledge |
| `/contact` | **Public** | None (Guest) | Support channels, emergency host helpline, and general contact form |
| `/faq` | **Public** | None (Guest) | Frequently Asked Questions across Travelers, Hosts, and Creators |
| `/terms` | **Public** | None (Guest) | Terms of Service, cancellation rules, and authoritative pricing disclosure |
| `/privacy` | **Public** | None (Guest) | Privacy policy, Aadhaar KYC vault security, and user data rights |
| `/login` | **Public** | None (Guest) | Universal authentication entry point with email/password and Google OAuth |
| `/register` | **Public** | None (Guest) | User registration with multi-role selector (`customer`, `partner`, `creator`) |

---

## 2. Customer Application Shell (`CustomerLayout`)
*Authenticated traveler and marketplace explorer interface beginning at `/app`.*

| Route Path | Access | Required Role | Primary Purpose / Page Function |
| :--- | :--- | :--- | :--- |
| `/app` | **Protected** | `customer` / `user` | Customer Home & Personalized Activity Hub (Upcoming trips, recommendations, quick rebook) |
| `/app/explore` | **Protected** | `customer` / `user` | Main marketplace catalog with category pills, date availability filter, price range slider |
| `/app/services/[service_id]` | **Protected** | `customer` / `user` | Service details view (Photos, host bio, amenities, itinerary, reviews, live booking calendar widget) |
| `/app/creators` | **Protected** | `customer` / `user` | Creator discovery directory (Agri-storytellers, photographers, regional guides) |
| `/app/creators/[creator_id]` | **Protected** | `customer` / `user` | Creator profile, media kit, past farm campaigns, and collaboration booking packages |
| `/app/my-trip` | **Protected** | `customer` / `user` | Active trip itinerary, weather advisory, route directions, host contact details |
| `/app/bookings` | **Protected** | `customer` / `user` | Historical and upcoming booking ledger with status tags (`pending`, `confirmed`, `completed`, `cancelled`) |
| `/app/bookings/[booking_id]` | **Protected** | `customer` / `user` | Single booking management (Check-in QR, invoice receipt, cancellation/refund request) |
| `/app/saved` | **Protected** | `customer` / `user` | Customer saved wishlist collections for farm stays and workshops |
| `/app/messages` | **Protected** | `customer` / `user` | Real-time chat with farm hosts and customer support representatives |
| `/app/notifications` | **Protected** | `customer` / `user` | Notification center (Booking confirmations, host updates, special harvest season alerts) |
| `/app/profile` | **Protected** | `customer` / `user` | Customer profile management (Avatar, verified phone, emergency contact, travel preferences) |
| `/app/settings` | **Protected** | `customer` / `user` | Account security, password update, notification preferences, and privacy controls |

---

## 3. Partner & Creator Application Shell (`PartnerLayout`)
*Authenticated host studio and creator media management beginning at `/partner`.*

| Route Path | Access | Required Role | Primary Purpose / Page Function |
| :--- | :--- | :--- | :--- |
| `/partner` | **Protected** | `partner` / `farmer` | Host Operations Dashboard (Occupancy rate, upcoming check-ins today, pending requests, net revenue) |
| `/partner/services` | **Protected** | `partner` / `farmer` | Farm listings and experiences management table with status toggles (`draft`, `published`, `archived`) |
| `/partner/services/new` | **Protected** | `partner` / `farmer` | Multi-step listing creation wizard (Farm details, category, pricing, photos, capacity, rules) |
| `/partner/services/[service_id]` | **Protected** | `partner` / `farmer` | Edit existing service listing, update seasonal pricing, and upload updated estate photos |
| `/partner/bookings` | **Protected** | `partner` / `farmer` | Reservation manager (Accept/Decline pending bookings, guest manifest, check-in verification) |
| `/partner/earnings` | **Protected** | `partner` / `farmer` | Financial dashboard (Gross revenue, platform commission deduction, net payout history, bank account details) |
| `/partner/collaborations` | **Protected** | `partner` / `farmer` | Creator collaboration proposals (Browse creator requests, offer complimentary stays for content) |
| `/partner/profile` | **Protected** | `partner` / `farmer` | Farm host profile, farm ownership verification documents, Aadhaar KYC status, host story |
| `/partner/creator` | **Protected** | `creator` | Creator Studio Dashboard (Active collaboration campaigns, media kit metrics, portfolio views) |
| `/partner/creator/services` | **Protected** | `creator` | Creator service packages (Reel creation, drone photography, agro-branding packages) |
| `/partner/creator/portfolio` | **Protected** | `creator` | Portfolio showcase gallery (High-res media, published YouTube/Instagram campaigns, case studies) |
| `/partner/creator/collaborations` | **Protected** | `creator` | Inbound host campaign invitations, negotiation chat, deliverable submission tracker |

---

## 4. Admin Application Shell (`AdminLayout`)
*Protected management console for platform administrators beginning at `/admin`.*

| Route Path | Access | Required Role | Primary Purpose / Page Function |
| :--- | :--- | :--- | :--- |
| `/admin` | **Protected** | `admin` | Platform Overview (Active GMV, user growth, pending verification queue, dispute count) |
| `/admin/users` | **Protected** | `admin` | User management directory (View users, role assignment, account status suspension) |
| `/admin/partners` | **Protected** | `admin` | Partner directory (List of verified and unverified farm hosts and organizations) |
| `/admin/partners/verification` | **Protected** | `admin` | Host KYC Verification Queue (Inspect land deeds, government ID proofs, approve/reject hosts) |
| `/admin/services` | **Protected** | `admin` | Service moderation queue (Review newly created farm listings before publishing) |
| `/admin/bookings` | **Protected** | `admin` | Global bookings overview and dispute mediation |
| `/admin/payments` | **Protected** | `admin` | Payment transaction log (Razorpay payment statuses, refund processing) |
| `/admin/payouts` | **Protected** | `admin` | Host payout ledger (Approve and trigger automated Razorpay host disbursements) |
| `/admin/support` | **Protected** | `admin` | Customer support ticket queue and grievance resolution |
| `/admin/settings` | **Protected** | `admin` | Global platform settings (Platform fee percentage, maintenance toggles, API key status) |
