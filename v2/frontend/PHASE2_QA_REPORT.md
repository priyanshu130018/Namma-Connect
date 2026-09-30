# Namma Connect V2 — Customer App Phase 2 QA Report

**Date:** 2026-09-28
**Scope:** QA, UX polish, AI-planner reliability, My-Trip integration, responsive behavior, and error/loading/empty states for the customer-facing app. **Phase 1 was not rebuilt** — this pass only inspected and refined existing implementation.

---

## Verification methodology (read this first — it bounds every claim below)

**Environment blocker:** `v2/frontend` has **no `node_modules`** installed and the npm registry returns **403 Forbidden** in this sandbox. Therefore the project's real gates — `npm run typecheck` (`tsc`) and `npm run build` (`tsc && vite build`) — **could not be run**, and no dependency versions were changed to force a pass (per spec §16).

**What was run instead:** a global TypeScript compiler (`tsc` v7.0.2) against two hand-built type-check harnesses that compile the *real* source files with ambient shims for third-party/UI modules. Both return **EXIT 0**:

| Harness | Real files compiled | Result |
|---|---|---|
| `outputs/tscheck/` | `AITripPlanner.tsx` + `@/components/ai-planner` barrel (ChatPanel, TripPreview, AgentProgress, plannerShared) with **real** `aiService` type stubs | ✅ EXIT 0 |
| `outputs/tscheck2/` | `@/components/marketplace` barrel (ListingPage, ServiceGrid, CategoryFilter, SortControl, Pagination, SearchBar, SearchPopover), shared `cards/ServiceCard.tsx`, `layout/CustomerSidebar.tsx`, `routes/customer/Discover.tsx` | ✅ EXIT 0 |

**What this proves:** no syntax errors, no unused locals/params, exhaustive-switch safety, correct React hook usage (state/ref/effect/callback/memo), and correct prop-passing/field-access **between our own components** and against the **real** `aiService` contract.

**What this does NOT prove (honest limits):** it cannot check prop types of real third-party libraries (React, react-router, lucide) because those are shimmed as `any`; and it cannot catch runtime/visual/layout issues. **No browser/visual rendering was possible**, so all responsive and visual-consistency claims below are from **static code review**, not from rendering at real breakpoints.

---

## §1 — Inspect before editing

Done. Read each target before changing it; no components were duplicated. All edits extend existing components in place (`ListingPage`, `ServiceGrid`, `ServiceCard`, `CategoryFilter`, `SortControl`, `SearchBar`, `SearchPopover`, `Pagination`, `CustomerSidebar`, `ChatPanel`, `TripPreview`, `AITripPlanner`) and reuse the single `listingConfig`-driven listing engine.

## §2 — AI Trip Planner UX

Two-panel layout retained (desktop: left = conversation, right = live trip state). Header reads **"Namma AI / AI Trip Planner"** with subtitle **"Plan, customize and book your trip with Namma AI."** Verified in `AITripPlanner.tsx` / `ChatPanel.tsx` (static).

## §3 — Empty state + quick-start prompts

Empty state shows the "🤖 Namma AI / Where would you like to go?" hero with an explanation instead of a blank itinerary panel. Quick-start prompts are exactly: **Plan a weekend trip · Plan a family trip · Plan under ₹20,000 · Plan a nature trip** (`WELCOME_PROMPTS`). The right panel does not render empty/confusing fields before a plan exists.

## §4 — Chat states + AgentProgress

`AgentProgress` reflects the **real** backend outcome: because the server runs the whole agent pipeline in one synchronous call (intermediate statuses never stream), the checklist animates on a short timer and then **snaps to the true final status** (`READY_FOR_REVIEW` / `FAILED`). This is the honest option given the backend — progress is not fabricated beyond a brief visual affordance, and this limitation is documented.

## §5 — AI response design

Responses are concise: short confirmation first, then structured trip info. Modifications post a one-line "what changed" summary (see §6) rather than a wall of text.

## §6 — Quick actions

Quick actions map to real backend endpoints (no silent regenerate):

- **Make it cheaper** → `refineTripPlan` with `REDUCE_BUDGET`.
- **Remove trekking** → mutates constraints (removes trekking/adventure) + regenerates.
- **Add one day** → increments duration constraint + regenerates.
- **Add more food** → adds food-culture interest + regenerates.

Each shows a loading state, then updates the itinerary, budget, and `TripPreview` together and posts a concise "what changed" line with the new estimated total. Actions are disabled while an agent call is in flight to prevent double-submits.

**Honest limit:** `refineTripPlan` only supports `REPLACE` / `REMOVE` / `REDUCE_BUDGET`; "add day" and "add more food" are implemented as constraint-mutation + full regenerate, not a targeted diff, because the backend has no additive-refine verb.

## §7 — TripPreview

Header shows trip name + "N Days · M Travelers" and the "₹… estimated" total. Days render as compact cards; each activity shows Name / Time / Type / Price / status. Long itineraries use collapsible day cards so the panel stays scannable.

## §8 — Trip actions

Actions are **Save Trip · Share · Continue to Booking**. When the plan is incomplete or the agent status is not `READY_FOR_REVIEW`, **Continue to Booking is disabled with an explanation**, so an incomplete generated plan cannot be accidentally booked.

## §9 — My Trip → Modify with AI

Each booking in `MyTrip.tsx` has **View Details** and **Modify with AI**. "Modify with AI" navigates to `/ai-trip-planner` carrying the full trip via `location.state.modifyTrip`; `ChatPanel` then shows a context banner ("Modifying your existing … trip") instead of starting from an empty new-trip state. The old `TripPlannerModal` usage was removed from MyTrip (the component file is kept, unused).

## §10 — Error handling

User-facing errors are friendly and never expose raw backend text. `ChatPanel` renders a `role="alert"` surface with the message and, when a retry handler is provided, a **Try again** button (`onRetry`). Covered cases: API/network failure, agent failure (`FAILED` status), no-results, and empty-itinerary. Invalid-dates / budget-conflict / availability are surfaced as the agent's returned message when the backend provides one.

**Honest limit:** the exhaustiveness of backend error *types* mapped to friendly copy could not be exercised at runtime (no live backend in this sandbox); verification is static only.

## §11 — Loading states

The chat pane stays visible while `TripPreview` updates. `AgentProgress` provides the working affordance in the conversation; a lightweight "Namma AI is typing…" indicator shows for non-agent sends. Marketplace grids use existing skeleton components during fetch.

## §12 — Responsive behavior

From **static code review only** (no browser was available to render at real breakpoints):

- Desktop: two-panel side-by-side (`lg:` grid) for the planner.
- Mobile: single column; source order is Header → Chat → Trip summary → Itinerary → Actions, matching the spec.
- Horizontal-scroll rails (category chips) use the now-real `.scrollbar-none` utility and `overflow-x-auto`, not page-level overflow.

**Not verified:** actual layout at 1440 / 1024 / 768 / 390 px, and absence of horizontal overflow, require a browser and were **not** checkable here.

## §13 — Explore / Experience / Discover QA

No new categories were added. Explore keeps its 4 categories and Experience its chip set, both driven by the one `ListingPage` + `listingConfig` engine. Search, filters, sort, pagination, card navigation, favorite toggle, and empty/loading states all route through the existing shared marketplace components (reused, not reimplemented). Static type-check of the whole marketplace barrel + `ServiceCard` + `Discover` passes (tscheck2, EXIT 0). Interactive behavior (actual clicks/filtering) was **not** runtime-tested.

## §14 — Visual consistency

One design system retained (emerald primary + a deliberate harvest secondary accent). No second design system introduced. See the design-system decision under Known issues below for the harvest→emerald unification and what was intentionally left as-is.

## §15 — Accessibility

Applied consistently across touched components:

- Icon-only controls got `aria-label`s (send button, collapse toggle, sort select, search input, pagination arrows, card "View", Become Partner).
- Decorative icons got `aria-hidden="true"` throughout (lucide glyphs inside labeled controls).
- Visible keyboard focus: consistent `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500` on interactive controls (harvest-ring on the Become-Partner CTA).
- Active state uses `aria-current` (nav `"page"`, category filter `"true"`) — **not color alone**.
- Labeled inputs; `role="group"` on the category filter, `<nav aria-label>` on pagination and sidebar nav.
- Mobile sidebar drawer: `role="dialog"` + `aria-modal="true"`, Escape-to-close, focus moved into the drawer on open and restored on close, and body scroll-lock while open.

**Not verified:** screen-reader announcement quality and full tab-order were reviewed statically, not with an actual AT/browser.

## §16 — Build / type check (honest status)

- `npm install` — **not possible** (registry 403).
- `npm run typecheck` (`tsc`) — **not runnable** as the project script (no `node_modules`/local `tsc`).
- `npm run build` (`tsc && vite build`) — **not runnable** (same reason).
- **No dependency versions were changed** to force any result.
- **Substitute performed:** global `tsc` v7.0.2 against two harnesses compiling the real source with ambient shims → both **EXIT 0** (see methodology). This catches syntax, unused code, exhaustive switches, hook usage, and our own inter-component prop/field contracts; it does **not** validate real third-party prop types or any runtime/visual behavior.

**Recommended real gate when a registry is available:** `npm ci && npm run build` in `v2/frontend`, then a manual browser pass of the planner + Explore/Experience/Discover at 1440/1024/768/390 px.

## §17 — Final QA checklist

| # | Item | Status |
|---|---|---|
| 1 | Inspected before editing; no duplication | ✅ |
| 2 | Planner two-panel + header/subtitle | ✅ static |
| 3 | Empty state + 4 quick prompts; no blank panel | ✅ static |
| 4 | Chat states; AgentProgress reflects real final status | ✅ static (backend can't stream — documented) |
| 5 | Concise AI responses | ✅ static |
| 6 | 4 quick actions wired to real endpoints + "what changed" | ✅ static (additive verbs = regenerate — documented) |
| 7 | TripPreview header/day cards/collapsible | ✅ static |
| 8 | Trip actions; booking disabled when incomplete | ✅ static |
| 9 | Modify with AI passes full context + banner | ✅ static |
| 10 | Friendly errors + Try Again; no raw errors | ✅ static (no live backend) |
| 11 | Loading states; chat stays visible | ✅ static |
| 12 | Responsive order + no overflow | ⚠️ code-review only (no browser) |
| 13 | Explore/Experience/Discover reuse; no new categories | ✅ static (not click-tested) |
| 14 | Single design system | ✅ (see decision below) |
| 15 | A11y: labels, focus, keyboard, non-color state | ✅ static (no AT) |
| 16 | Build/type check reported honestly; no version hacks | ✅ (real build blocked) |
| 17 | No new major features added | ✅ |---

## Known issues, decisions & follow-ups

**Design-system decision (may need product sign-off).** The app primary is **emerald**; a warm **harvest** (amber/gold) ramp is a deliberate secondary accent. This pass unified the **shared marketplace listing surfaces** — SearchBar, SortControl, CategoryFilter, shared `cards/ServiceCard`, ListingPage filters, Discover — and the sidebar active state from harvest → **emerald**, to match the primary. Harvest was left **intentionally** in `MyTrip.tsx`, `ServiceDetail.tsx`, `PlatformInfoCard.tsx`, the sidebar "Become Partner" CTA, and the legacy `/app` routes (Activities, Creators, Profile, Settings, ChangePassword, UnderProcessPage).

**Open inconsistency to resolve.** An emerald `ServiceCard` now links to a still-harvest-themed `ServiceDetail.tsx` (a 580+-line page outside the Phase 2 file list). Deferred deliberately rather than risk a large out-of-scope change. Product decision needed: either unify `ServiceDetail` to emerald, or treat harvest as the commerce accent and revert the listing components.

**Broken utilities fixed.** `harvest-800` / `harvest-950` are undefined in the ramp (only 50/100/200/500/600/700 exist), so the old ServiceCard dark-mode CTA used no-op colors — resolved by the harvest→emerald move. `scrollbar-none` was never defined (no plugin, not in CSS) and `shadow-xs` is Tailwind-v4-only; a real `.scrollbar-none` was added to `index.css @layer utilities` (fixes every usage app-wide), and `shadow-xs`→`shadow-sm` was swapped **only** within touched files.

**Remaining out-of-scope `shadow-xs` (still no-op; not touched this phase):** `TravelAIFloating.tsx`, partner `ProviderAvailabilitySection.tsx`, `CustomerHome.tsx` (×3), `LeaveReviewModal.tsx`, `Saved.tsx` (×2), `Profile.tsx`, `Settings.tsx`. Recommend a follow-up sweep to `shadow-sm`.

**Backend-shaped limits (not bugs):** intermediate agent progress can't stream (single synchronous call), and `refineTripPlan` supports only `REPLACE` / `REMOVE` / `REDUCE_BUDGET` — both documented above where relevant.

