# Namma Connect V2 — AI Conversational Assistant Implementation

**Authoritative Baseline**: Step 5 Implementation Complete  
**Architecture Style**: Conversational Travel Advisor with LLM Provider Abstraction, Controlled Authorized Backend Tools, Strict Anti-Fabrication Grounding, and Trip Planner Handoff Boundary  
**Module Path**: `v2/backend/app/modules/ai/`  
**API Namespace**: `/api/v2/ai/conversations`  

---

## 1. System Topology & Internal Organization

The AI Assistant is structured into modular subsystems inside `app/modules/ai/`:

```
v2/backend/app/modules/ai/
├── llm/
│   ├── __init__.py
│   ├── base.py                   # LLMProvider abstract interface, ToolDeclaration, LLMMessage, LLMResponse
│   ├── gemini_provider.py        # Google Gemini API adapter with temperature/token bounds and offline handling
│   └── mock_provider.py          # Deterministic Mock LLM Provider for offline CI testing & tool simulation
├── tools/
│   ├── __init__.py
│   ├── base.py                   # BaseAITool interface
│   ├── marketplace_tools.py      # search_services, get_service_details, get_service_availability, get_categories
│   ├── recommendation_tools.py   # get_user_recommendations
│   ├── user_context_tools.py     # get_user_saved_services, get_user_trips
│   └── registry.py               # AIToolRegistry with typed schema validation and user authorization
├── prompts/
│   ├── __init__.py
│   └── system_prompts.py         # Versioned system prompts, anti-fabrication rules, intent extraction prompt
├── assistant/
│   ├── __init__.py
│   ├── intent_router.py          # Fast intent extraction and entity parsing
│   ├── context_builder.py        # Bounded conversation memory and structured user context
│   └── orchestrator.py           # Turn orchestration, tool execution, grounding enforcement
├── trip_planner/
│   ├── __init__.py
│   └── handoff.py                # Structured boundary contract for Step 6 agentic Trip Planner
├── infrastructure/
│   ├── __init__.py
│   └── repository.py             # AIRepository for AIConversation and AIMessage persistence
├── application/
│   ├── __init__.py
│   └── service.py                # AIService orchestrating session management and API workflows
└── presentation/
    ├── __init__.py
    ├── schemas.py                # Pydantic v2 schemas for requests, responses, tool calls, and handoffs
    └── router.py                 # FastAPI REST API endpoints
```

---

## 2. LLM Provider Abstraction

- **`LLMProvider`**: Abstract interface decoupling the application layer from vendor SDKs.
- **`GeminiProvider`**: Adapts to Google Gemini (`gemini-1.5-flash` / configured model) with structured function declarations, timeouts, and error handling.
- **`MockLLMProvider`**: Deterministic mock provider enabling full unit/integration test coverage in offline environments without external network or API key dependencies.

---

## 3. Controlled Backend Tools & Security

The LLM is strictly prohibited from executing raw database queries. All interactions flow through authorized tool implementations:

| Tool | Backend Application Service | Function |
|---|---|---|
| `search_services` | `MarketplaceRepository.search_services()` | Filter listings by district, category, max price, and query keywords |
| `get_service_details` | `MarketplaceRepository.get_service_by_id()` | Factual listing details, inclusions, provider info |
| `get_service_availability` | `MarketplaceRepository.get_availabilities()` | Real-time booking capacity and open slots |
| `get_categories` | `MarketplaceRepository.list_active_categories()` | Active taxonomy categories |
| `get_user_recommendations`| `RecommendationService.get_personalized_recommendations()` | Personalized hybrid recommendations |
| `get_user_saved_services` | `MarketplaceRepository.list_saved_services()` | Authenticated customer's saved wishlist |
| `get_user_trips` | `TripRepository.list_user_trips()` | Authenticated customer's planned itineraries |

### Security Guarantees:
- Tools execute on behalf of `current_user` and enforce ownership boundaries.
- Cross-user conversation access is blocked with HTTP 403 Forbidden.

---

## 4. Grounding & Anti-Fabrication Principles

1. **Zero Hallucination**: The assistant never invents listings, hosts, prices, availability dates, or discounts.
2. **Backend is Authoritative**: All factual marketplace claims must match backend tool outputs.
3. **Honest Uncertainty**: If a tool returns zero matching listings, the assistant clearly informs the traveler and suggests alternative districts or categories.
4. **Verified Personalization**: Recommendations are explained only using real signals (matching category, location proximity, stated budget).

---

## 5. Intent Routing & Step 6 Trip Planner Boundary

The assistant classifies messages into 6 distinct intents:
1. `GENERAL_CHAT`: General travel advice about Karnataka.
2. `MARKETPLACE_SEARCH`: Stays, activities, or tours in specific districts.
3. `RECOMMENDATION`: Personalized suggestions.
4. `SERVICE_DETAILS`: Inquiries about a specific listing.
5. `AVAILABILITY_CHECK`: Date and slot capacity checks.
6. `TRIP_PLANNER_HANDOFF`: Multi-day itinerary requests.

> [!IMPORTANT]
> **Scope Boundary**: The conversational assistant does not build autonomous multi-day schedules in Step 5. It constructs a structured `TripPlannerHandoffRequest` containing extracted destination, budget, party size, and dates ready for the Step 6 Trip Planner.

---

## 6. REST API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v2/ai/conversations` | Create a new AI conversation session |
| `GET` | `/api/v2/ai/conversations` | List authenticated user's conversation sessions |
| `GET` | `/api/v2/ai/conversations/{id}/messages` | Retrieve chronological message history |
| `POST` | `/api/v2/ai/conversations/{id}/messages` | Send message, execute tools, return grounded recommendations |

---

## 7. Verification Summary

- **Total Test Cases**: **46 tests** passing across the full modular backend test suite.
- **AI Assistant Suite**: `tests/test_v2_ai_assistant.py` (9/9 passed).
- **Python Compilation**: `python -m compileall -q app` (0 errors).
