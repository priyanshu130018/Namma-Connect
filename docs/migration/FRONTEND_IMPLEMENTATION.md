# Namma Connect V2 — Step 7: Frontend Integration

## Overview
Step 7 connects the React 18 + Vite frontend application with the V2 backend REST architecture (`/api/v2`), specifically integrating the Conversational AI Assistant and the 9-state Agentic Trip Planner with deterministic constraint verification and pre-booking checkout handoff.

---

## Architecture & Integration

```mermaid
graph TD
    User["Customer Browser / UI"] --> AIChat["TravelAIFloating & AI Chat Window"]
    User --> PlannerModal["TripPlannerModal Component"]
    User --> MyTripView["CustomerMyTripPage (/app/my-trip)"]

    AIChat --> AIService["aiService.ts (Axios Client)"]
    PlannerModal --> AIService
    MyTripView --> AIService

    AIService -->|POST /ai/conversations| ConvAPI["AI Conversations API"]
    AIService -->|POST /ai/conversations/{id}/messages| MsgAPI["AI Messages API"]
    AIService -->|POST /ai/trip-plans/generate| GenerateAPI["Trip Planner Generate API"]
    AIService -->|POST /ai/trip-plans/{id}/refine| RefineAPI["Trip Planner Refinement API"]
    AIService -->|POST /ai/trip-plans/{id}/confirm| ConfirmAPI["Trip Planner Confirmation API"]
    AIService -->|GET /ai/trip-plans/{id}/booking-handoff| HandoffAPI["Pre-Booking Handoff API"]
```

---

## Key Frontend Components & Services

### 1. `aiService.ts` (`src/services/aiService.ts`)
- Implements full TypeScript contracts matching backend Pydantic V2 schemas.
- Methods:
  - `createAIConversation(data)`
  - `listAIConversations(params)`
  - `getConversationMessages(convId)`
  - `sendMessageToAI(convId, data)`
  - `generateTripPlan(data)`
  - `refineTripPlan(planId, data)`
  - `confirmTripPlan(planId, data)`
  - `getTripPlan(planId)`
  - `getBookingHandoff(planId)`

### 2. `TripPlannerModal.tsx` (`src/components/customer/TripPlannerModal.tsx`)
- Reflects the authoritative 9-state planner state machine:
  `DRAFT` $\to$ `COLLECTING_REQUIREMENTS` $\to$ `SEARCHING` $\to$ `BUILDING_ITINERARY` $\to$ `VALIDATING` $\to$ `REFINING` $\to$ `READY_FOR_REVIEW` $\to$ `CONFIRMED` $\to$ `HANDED_OFF`
- **Requirement Collection**: Karnataka district selectors, duration slider (1–7 days), party size, budget limit in INR, travel pace (`RELAXED`, `MODERATE`, `INTENSE`), category pills (`Stays`, `Activities`, `Workshops`, `Tours`, `Food`), and special notes.
- **Itinerary Timeline**: Visual multi-day itinerary broken down into Morning, Afternoon, and Evening slots with host names, verified badges, time windows, and price tags.
- **Validation Alerts**: Highlights constraint reports, validation score, and conflict warnings (e.g., budget warnings, scheduling overlaps).
- **Interactive Refinement**: Inline actions for swapping activities (`REPLACE`), removing slots (`REMOVE`), and adjusting target budget (`REDUCE_BUDGET`).
- **Confirmation & Pre-Booking Handoff**: Confirms and persists the itinerary into `Trip` $\to$ `TripDay` $\to$ `TripItem` + `AITripPlan`, and presents the itemized pre-booking summary (`bookings_created: false`, `payment_created: false`) without premature transactional side-effects.

### 3. `TravelAIFloating.tsx` (`src/components/customer/TravelAIFloating.tsx`)
- Replaces the under-construction placeholder with a real-time conversational travel assistant.
- Features grounding service cards with live links and an inline launcher for the Agentic Trip Planner when complex multi-day planning is requested.

### 4. `MyTrip.tsx` (`src/routes/customer/MyTrip.tsx`)
- Added direct header entry point ("Plan Trip with AI") launching the Agentic Trip Planner modal and linking customer reservations to AI-generated itineraries.

---

## Testing & Verification
- **Automated Frontend Tests**: `tests/components/trip_planner_v2.test.tsx` (5/5 tests passing).
- **TypeScript Compilation**: `npm run typecheck` passed with 0 errors.
- **Vite Production Build**: `npm run build` successfully bundled without errors in 4.71s.
