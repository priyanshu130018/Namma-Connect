# Namma Connect V2 — Recommendation Implementation & Behavioral Data Pipeline

**Authoritative Baseline**: Step 4 Implementation Complete  
**Architecture Style**: Multi-Signal Hybrid Recommender (Content-Based + Collaborative Filtering + User Interest Profiles + Popularity/Quality Fallback + Eligibility Gating + Diversity Re-Ranking)  
**Module Path**: `v2/backend/app/modules/recommendation/`  
**API Namespace**: `/api/v2/recommendations`  
**Database**: PostgreSQL 16 + pgvector (`namma_connect_dev`)  

---

## 1. System Topology & Internal Organization

The recommendation engine is organized into modular packages inside the modular monolith:

```
v2/backend/app/modules/recommendation/
├── candidate_generation/
│   ├── __init__.py
│   └── candidate_generator.py        # Multi-source candidate aggregation (Content, Collab, Quality)
├── content_based/
│   ├── __init__.py
│   └── content_recommender.py        # Category, location, budget, and vector embedding cosine similarity
├── collaborative/
│   ├── __init__.py
│   ├── user_similarity_calculator.py # Pairwise cosine similarity matrix batch calculation
│   └── collaborative_recommender.py  # Similar-user candidate retrieval and scoring
├── features/
│   ├── __init__.py
│   └── feature_extractor.py          # 7-day exponential half-life decay, interaction weighting, affinity extraction
├── ranking/
│   ├── __init__.py
│   └── hybrid_ranker.py              # Multi-component deterministic scoring, eligibility gating, diversity re-ranking
├── feedback/
│   ├── __init__.py
│   └── feedback_handler.py           # Raw interaction logging, impression tracking, explicit feedback
├── infrastructure/
│   └── repository.py                 # Bulk database queries for interactions, profiles, similarities, results
├── application/
│   └── service.py                    # High-level use-case orchestration
└── presentation/
    ├── schemas.py                    # Pydantic v2 schemas for requests, responses, profiles, feeds
    └── router.py                     # FastAPI REST API endpoints
```

---

## 2. Behavioral Signal & Interaction Pipeline

Raw customer behavioral interactions are captured in `user_interactions` with normalized weights and exponential time decay:

### 2.1 Event Weights
| Event Type | Base Weight | Description |
|---|---|---|
| `BOOK` / `BOOKING_COMPLETED` | **5.0** | Confirmed reservation transaction |
| `ADD_TO_TRIP` | **3.5** | Added to multi-day itinerary container |
| `SAVE` | **3.0** | Bookmarked / added to wishlist |
| `REVIEW_SUBMIT` / `RATING_5` | **2.5** | High-reputation verified feedback |
| `SHARE` / `SEARCH_CLICK` | **2.0** | Social sharing or explicit search result selection |
| `CLICK` | **1.5** | Card or listing click |
| `DETAIL_OPEN` | **1.2** | Full listing page detail viewed |
| `VIEW` / `SEARCH` | **1.0** | Impression or search execution |
| `DISMISS` | **-2.0** | Explicit dismiss or negative swipe |

### 2.2 Exponential Time Decay
Interaction signals decay continuously with a 7-day half-life:
$$\lambda = \frac{\ln(2)}{7.0} \approx 0.099021$$
$$w_{\text{decayed}}(t) = w_{\text{base}} \times e^{-\lambda \times \Delta t_{\text{days}}}$$

---

## 3. User Interest Profiles

`user_interest_profiles` maintains derived, normalized customer affinities rather than unindexed raw events:
- `category_affinity_json`: Normalized distribution of category engagement (e.g. `{"farm-stays": 0.75, "agro-tours": 0.25}`).
- `destination_affinity_json`: Normalized district interest (e.g. `{"kodagu": 0.8, "chikkamagaluru": 0.2}`).
- `budget_band_json`: Observed price bounds `{"min": 2000, "max": 5000}`.
- `confidence_score`: Bounded metric $\min(1.0, \frac{N_{\text{interactions}}}{10.0})$.
- `interest_score`: Total accumulated decayed activity score.

---

## 4. Candidate Generation Streams

1. **Content-Based Candidate Generator**:
   - Matches candidate listings against target categories, districts, and budget bands.
   - Evaluates cosine similarity against 768-dimensional `Service.embedding` vector columns when present.
   - Gracefully handles missing vector embeddings without fabricating fake coordinates.
2. **Collaborative Filtering Candidate Generator**:
   - Discovers top similar users from precomputed `user_similarities`.
   - Aggregates listings engaged by similar users, weighted by similarity score $\times$ decayed interaction weight.
3. **Quality / Popularity Fallback**:
   - High-rated, highly-reviewed published listings across Karnataka to eliminate cold-start empty feeds.

---

## 5. Hybrid Ranking & Candidate Filtering

### 5.1 Eligibility Gating
Before ranking, candidates pass through strict eligibility gates:
- Status must be `PUBLISHED`
- Host/Service must be `is_verified == True`
- Provider cannot be recommended their own listing (`provider_id != user_id`)
- Already booked or explicitly dismissed listings are excluded

### 5.2 Deterministic Multi-Component Scoring
$$S_{\text{hybrid}} = 0.35 S_{\text{content}} + 0.25 S_{\text{collab}} + 0.20 S_{\text{profile}} + 0.15 S_{\text{quality}} + 0.05 S_{\text{freshness}}$$
Final scores are normalized to a 0.0 – 100.0 scale.

### 5.3 Diversity Re-Ranking
Caps maximum recommendations per category ($\le 2-3$) and per provider ($\le 2$) per viewport to prevent single-host domination.

---

## 6. Impressions & Explicit Feedback

- **`recommendation_impressions`**: Logs actual impressions rendered on surfaces (`HOME`, `EXPLORE`) and sections (`recommended_for_you`, `top_rated`, `near_you`).
- **`recommendation_feedback`**: Captures explicit user feedback (`LIKE`, `DISLIKE`, `NOT_INTERESTED`, `HIDE`). Negative feedback automatically triggers a `DISMISS` signal and excludes the listing from subsequent recommendations.

---

## 7. REST API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v2/recommendations` | Personalized hybrid recommendations for authenticated user |
| `GET` | `/api/v2/recommendations/home` | 5 structured Home page sections (`recommended_for_you`, `top_rated`, `most_visited`, `near_you`, `categories`) |
| `GET` | `/api/v2/recommendations/category/{slug}` | Category-specific personalized recommendations |
| `POST`| `/api/v2/recommendations/interactions` | Record raw user behavioral interaction |
| `POST`| `/api/v2/recommendations/impressions` | Record recommendation impression event |
| `POST`| `/api/v2/recommendations/feedback` | Submit explicit feedback (LIKE / DISLIKE / HIDE) |
| `GET` | `/api/v2/recommendations/profile` | Retrieve user's derived interest profile |
| `POST`| `/api/v2/recommendations/profile/refresh` | Trigger on-demand profile recalculation |

---

## 8. Verification & Test Summary

- **Total Test Cases**: 27 unit & integration tests passing across recommendation and modular service suites.
- **Suite**: `tests/test_v2_recommendation_engine.py` (11/11 tests pass).
- **Compilation**: Verified with `python -m compileall -q app` (0 errors).
