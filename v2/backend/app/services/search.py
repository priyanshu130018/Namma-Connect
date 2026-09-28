"""Unified Semantic Search Service using pgvector and Gemini Embeddings."""

import math
from typing import List, Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func
from app.models.service import Service
from app.models.user import User
from app.services.embedding import EmbeddingService
from app.core.logging import logger


def _cosine_similarity(vec1: Any, vec2: Any) -> float:
    """Compute safe cosine similarity between two vectors with boundary protection."""
    if vec1 is None or vec2 is None:
        return 0.0
    try:
        v1 = list(vec1)
        v2 = list(vec2)
    except Exception:
        return 0.0
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    val = dot / (norm1 * norm2)
    return max(-1.0, min(1.0, float(val)))


class SemanticSearchService:
    """Authoritative domain service providing unified semantic vector retrieval, ranking, and grounded recommendations."""

    @classmethod
    def semantic_search(
        cls,
        db: Session,
        query: str = "",
        category: Optional[str] = None,
        location: Optional[str] = None,
        district: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        page: int = 1,
        limit: int = 12,
        status: str = "PUBLISHED",
    ) -> Tuple[List[Service], int]:
        """Perform semantic search across marketplace services combining vector distance with relational filters."""
        # 1. Base query with status filter
        q = db.query(Service).filter(Service.status == status)

        # 2. Relational filters
        if category and category.lower() != "all":
            clean_cat = category.lower().strip()
            if clean_cat in ["farms", "farm"]:
                q = q.filter(
                    or_(
                        Service.category_slug.in_(["stay", "experiences"]),
                        Service.category.ilike("%farm%"),
                        Service.title.ilike("%farm%"),
                    )
                )
            elif clean_cat in ["activities", "activity"]:
                q = q.filter(
                    or_(
                        Service.category_slug.in_(["experiences", "guides-tours", "adventure"]),
                        Service.category.ilike("%activit%"),
                        Service.category.ilike("%tour%"),
                        Service.category.ilike("%adventure%"),
                    )
                )
            elif clean_cat in ["stays", "stay", "homestay", "farmstay"]:
                q = q.filter(
                    or_(
                        Service.category_slug == "stay",
                        Service.category.ilike("%stay%"),
                        Service.category.ilike("%homestay%"),
                    )
                )
            elif clean_cat in ["tours", "guides", "guides & tours", "guides-tours"]:
                q = q.filter(
                    or_(
                        Service.category_slug.in_(["guides-tours", "tours"]),
                        Service.category.ilike("%tour%"),
                        Service.category.ilike("%guide%"),
                    )
                )
            elif clean_cat in ["food", "dining", "culinary"]:
                q = q.filter(
                    or_(
                        Service.category_slug == "food",
                        Service.category.ilike("%food%"),
                        Service.category.ilike("%dining%"),
                    )
                )
            elif clean_cat in ["events", "event", "harvest"]:
                q = q.filter(
                    or_(
                        Service.category_slug == "events",
                        Service.category.ilike("%event%"),
                        Service.category.ilike("%harvest%"),
                    )
                )
            else:
                q = q.filter(
                    or_(
                        Service.category_slug == clean_cat,
                        Service.category.ilike(f"%{clean_cat}%"),
                    )
                )

        if location:
            q = q.filter(
                or_(
                    Service.location.ilike(f"%{location}%"),
                    Service.district.ilike(f"%{location}%"),
                    Service.state.ilike(f"%{location}%"),
                )
            )

        if district:
            q = q.filter(Service.district.ilike(f"%{district}%"))

        if min_price is not None:
            q = q.filter(Service.price >= min_price)

        if max_price is not None:
            q = q.filter(Service.price <= max_price)

        if min_rating is not None:
            q = q.filter(Service.rating >= min_rating)

        # 3. Handle query retrieval
        clean_query = (query or "").strip()
        offset = (page - 1) * limit

        if clean_query:
            query_vector = EmbeddingService.generate_embedding(clean_query)
            bind = db.get_bind()
            is_postgres = bind.dialect.name == "postgresql"

            if is_postgres:
                # Direct pgvector cosine distance ordering
                vector_q = q.filter(Service.embedding.isnot(None))
                total = vector_q.count()
                items = (
                    vector_q.order_by(Service.embedding.cosine_distance(query_vector))
                    .offset(offset)
                    .limit(limit)
                    .all()
                )
                if items:
                    return items, total

            # In-memory / SQLite / Hybrid Fallback:
            all_matching = q.all()
            total = len(all_matching)

            # Score each candidate
            scored_items = []
            for s in all_matching:
                score = 0.0
                if s.embedding is not None:
                    score = _cosine_similarity(query_vector, s.embedding)
                else:
                    # Text match fallback weight
                    q_lower = clean_query.lower()
                    if q_lower in s.title.lower():
                        score += 0.5
                    if q_lower in s.description.lower():
                        score += 0.3
                    if q_lower in s.location.lower() or q_lower in s.district.lower():
                        score += 0.4
                scored_items.append((score, s))

            # Rank by score descending, then rating
            scored_items.sort(key=lambda x: (x[0], x[1].rating or 0), reverse=True)
            paginated = [item for _, item in scored_items[offset : offset + limit]]
            return paginated, total

        # Empty query: standard rating/recency sort
        total = q.count()
        items = q.order_by(desc(Service.rating), desc(Service.created_at)).offset(offset).limit(limit).all()
        return items, total

    @classmethod
    def is_service_eligible(cls, service: Optional[Service], db: Session) -> bool:
        """
        Hard business eligibility gate for AI recommendation.
        Returns True if and only if ALL conditions are satisfied:
        1. Service is not None and exists in DB
        2. Service status == 'PUBLISHED'
        3. Service is_verified is True
        4. Service is_active is True (if attribute exists on Service)
        5. Service provider_id is not None
        6. Provider exists in users table as registered User
        7. Provider is_active is True
        8. Provider is_verified is True
        """
        if service is None:
            return False
        if getattr(service, "status", None) != "PUBLISHED":
            return False
        if not getattr(service, "is_verified", False):
            return False
        if hasattr(service, "is_active") and not getattr(service, "is_active"):
            return False
        if not getattr(service, "provider_id", None):
            return False

        provider = db.query(User).filter(User.id == service.provider_id).first()
        if not provider:
            return False
        if not getattr(provider, "is_active", False):
            return False
        if not getattr(provider, "is_verified", False):
            return False
        return True

    @classmethod
    def recommend_services(
        cls,
        db: Session,
        query: str,
        destination: Optional[str] = None,
        category: Optional[str] = None,
        max_budget: Optional[float] = None,
        candidate_k: Optional[int] = None,
        final_k: Optional[int] = None,
        min_similarity: Optional[float] = None,
        k_candidates: Optional[int] = None,
        k_final: Optional[int] = None,
        user_id: Optional[str] = None,
        user_location: Optional[str] = None,
        **kwargs: Any,
    ) -> Tuple[List[Service], Dict[str, Any]]:
        """
        Execute grounded vector similarity recommendation pipeline with strict eligibility gate:
        1. Embed user query with caching and dimension verification.
        2. Apply strict eligibility gate at database query level (published, verified service + active, verified registered provider).
        3. Retrieve candidate services via pgvector or in-memory vector search on eligible set only.
        4. Re-rank candidates using hybrid weights (semantic, category, location, capacity, rating).
        5. Filter against minimum similarity threshold (no-match handling).
        6. Return top-K verified real services with complete diagnostic metadata.
        """
        import hashlib
        from app.core.config import settings
        from app.services.redis_service import RedisService

        resolved_k_candidates = candidate_k or k_candidates or getattr(settings, "RECOMMENDATION_CANDIDATE_K", 20)
        resolved_k_final = final_k or k_final or getattr(settings, "RECOMMENDATION_FINAL_K", 5)
        sim_threshold = min_similarity if min_similarity is not None else getattr(settings, "MIN_RECOMMENDATION_SIMILARITY", 0.16)

        sem_weight = getattr(settings, "RECOMMENDATION_SEMANTIC_WEIGHT", 0.70)
        cat_weight = getattr(settings, "RECOMMENDATION_CATEGORY_WEIGHT", 0.10)
        loc_weight = getattr(settings, "RECOMMENDATION_LOCATION_WEIGHT", 0.10)
        avail_weight = getattr(settings, "RECOMMENDATION_AVAILABILITY_WEIGHT", 0.05)
        rating_weight = getattr(settings, "RECOMMENDATION_RATING_WEIGHT", 0.05)

        clean_query = (query or "").strip()
        q_lower = clean_query.lower()

        # Step 1: Query Embedding
        query_hash = hashlib.sha256(clean_query.lower().encode("utf-8")).hexdigest()[:16]
        cache_key = f"query_embedding:{query_hash}"
        query_vector = None
        try:
            cached = RedisService.get(cache_key)
            if cached and len(cached) == EmbeddingService.VECTOR_DIMENSION:
                query_vector = cached
        except Exception:
            pass

        if query_vector is None:
            query_vector = EmbeddingService.generate_embedding(clean_query)
            try:
                RedisService.set(cache_key, query_vector, expire_seconds=3600)
            except Exception:
                pass

        # Diagnostic metadata scaffold
        diagnostics = {
            "query": clean_query,
            "query_embedding_dimension": len(query_vector),
            "candidate_count": 0,
            "filtered_count": 0,
            "final_count": 0,
            "results": [],
        }

        # Out-of-domain / impossible / hallucinated concept check
        # Queries containing impossible, sci-fi, or extraterrestrial concepts (e.g. Mars, underwater, submarine, outer space)
        # must immediately reject to prevent hallucinating non-existent services.
        impossible_terms = ["mars", "underwater", "submarine", "outer space", "moon", "jupiter", "spaceship", "alien"]
        if any(term in q_lower for term in impossible_terms):
            return [], diagnostics

        # Location resolution for "near me" queries
        dest_lower = (destination or "").lower().strip()
        cat_lower = (category or "").lower().strip()

        # Step 2: Strict Eligibility Gate at Database Query Level
        # Service MUST be published, verified, linked to registered provider who is active and verified.
        eligible_query = (
            db.query(Service)
            .join(User, Service.provider_id == User.id)
            .filter(
                Service.provider_id.isnot(None),
                Service.status == "PUBLISHED",
                Service.is_verified.is_(True),
                User.is_active.is_(True),
                User.is_verified.is_(True),
            )
        )
        if hasattr(Service, "is_active"):
            eligible_query = eligible_query.filter(getattr(Service, "is_active").is_(True))

        if max_budget is not None:
            eligible_query = eligible_query.filter(Service.price <= max_budget)

        # Build keyword & category retrieval filters
        q_tokens = [w.strip(".,?!:;\"'()[]{}") for w in q_lower.split() if len(w.strip(".,?!:;\"'()[]{}")) >= 3]
        stop_words = {
            "the", "and", "for", "are", "with", "from", "some", "any", "all",
            "show", "give", "tell", "want", "need", "like", "would", "please",
            "near", "places", "visit", "trip", "tour", "plan", "looking",
            "suggest", "suggests", "suggestion", "recommend", "recommendation",
            "find", "finds", "can", "you", "me", "get"
        }
        filtered_tokens = [w for w in q_tokens if w not in stop_words]

        kw_conditions = []
        for token in filtered_tokens:
            kw_conditions.append(Service.title.ilike(f"%{token}%"))
            kw_conditions.append(Service.description.ilike(f"%{token}%"))
            kw_conditions.append(Service.category.ilike(f"%{token}%"))
            kw_conditions.append(Service.location.ilike(f"%{token}%"))
            kw_conditions.append(Service.district.ilike(f"%{token}%"))

        # Category/topic specific keyword triggers
        is_event_fair_query = any(term in q_lower for term in [
            "fair", "mela", "festival", "jatre", "event", "utsav", "exhibition",
            "ಸಂತೆ", "ಮೇಳ", "ಜಾತ್ರೆ", "ಹಬ್ಬ", "ಉತ್ಸವ", "मेला", "उत्सव"
        ])
        is_tea_query = any(term in q_lower for term in ["tea", "ಚಹಾ", "ಟೀ", "चाय"])
        is_coffee_query = any(term in q_lower for term in ["coffee", "ಕಾಫಿ", "कॉफी"])
        is_pottery_query = any(term in q_lower for term in ["pottery", "ಕುಂಬಾರಿಕೆ", "मिट्टी"])
        is_stay_query = any(term in q_lower for term in ["stay", "homestay", "resort", "cottage", "ವಾಸ", "ವಾಸ್ತವ್ಯ", "ಸ್ಟೇ"])
        is_farm_query = any(term in q_lower for term in ["farm", "agritourism", "agriculture", "harvest", "ಕೃಷಿ", "ತೋಟ"])

        if is_event_fair_query:
            kw_conditions.append(Service.category.ilike("%event%"))
            kw_conditions.append(Service.category_slug.in_(["events", "event"]))
            kw_conditions.append(Service.title.ilike("%fair%"))
            kw_conditions.append(Service.title.ilike("%mela%"))
            kw_conditions.append(Service.title.ilike("%festival%"))
            kw_conditions.append(Service.title.ilike("%jatre%"))
            kw_conditions.append(Service.description.ilike("%fair%"))

        if is_tea_query:
            kw_conditions.append(Service.title.ilike("%tea%"))
            kw_conditions.append(Service.description.ilike("%tea%"))
            kw_conditions.append(Service.category.ilike("%tea%"))

        if is_coffee_query:
            kw_conditions.append(Service.title.ilike("%coffee%"))
            kw_conditions.append(Service.description.ilike("%coffee%"))

        if is_pottery_query:
            kw_conditions.append(Service.title.ilike("%pottery%"))
            kw_conditions.append(Service.description.ilike("%pottery%"))

        if is_farm_query:
            kw_conditions.append(Service.title.ilike("%farm%"))
            kw_conditions.append(Service.description.ilike("%farm%"))
            kw_conditions.append(Service.category.ilike("%farm%"))

        if is_stay_query:
            kw_conditions.append(Service.category_slug == "stay")
            kw_conditions.append(Service.title.ilike("%stay%"))
            kw_conditions.append(Service.title.ilike("%homestay%"))

        if cat_lower:
            kw_conditions.append(Service.category.ilike(f"%{cat_lower}%"))
            kw_conditions.append(Service.category_slug.ilike(f"%{cat_lower}%"))

        if dest_lower:
            kw_conditions.append(Service.location.ilike(f"%{dest_lower}%"))
            kw_conditions.append(Service.district.ilike(f"%{dest_lower}%"))

        # 1. Execute keyword/category candidate retrieval
        keyword_candidates: List[Service] = []
        if kw_conditions:
            keyword_candidates = (
                eligible_query.filter(or_(*kw_conditions))
                .limit(resolved_k_candidates)
                .all()
            )

        # 2. Execute pgvector semantic candidate retrieval
        bind = db.get_bind()
        is_postgres = bind.dialect.name == "postgresql"

        vector_candidates: List[Service] = []
        if is_postgres:
            vector_candidates = (
                eligible_query.filter(Service.embedding.isnot(None))
                .order_by(Service.embedding.cosine_distance(query_vector))
                .limit(resolved_k_candidates)
                .all()
            )

        if not vector_candidates:
            # In-memory / SQLite / development fallback on strictly eligible services
            all_eligible = eligible_query.all()
            scored_candidates = []
            for s in all_eligible:
                emb = s.embedding
                if emb is None:
                    try:
                        emb = RedisService.get(f"service_embedding:{s.id}")
                    except Exception:
                        emb = None
                if emb is None:
                    emb = EmbeddingService.generate_embedding(EmbeddingService.build_searchable_text(s))
                    s.embedding = emb
                sim_full = _cosine_similarity(query_vector, emb)
                concise_text = f"{s.title} {s.category or ''} {s.location or ''} {s.district or ''}"
                sim_concise = _cosine_similarity(query_vector, EmbeddingService.generate_embedding(concise_text))
                sim_title = _cosine_similarity(query_vector, EmbeddingService.generate_embedding(s.title))
                sim = max(sim_full, sim_concise, sim_title)
                scored_candidates.append((sim, s))

            scored_candidates.sort(key=lambda x: x[0], reverse=True)
            vector_candidates = [s for _, s in scored_candidates[:resolved_k_candidates]]

        # 3. Merge and deduplicate candidates
        seen_candidate_ids = set()
        raw_candidates: List[Service] = []
        for s in vector_candidates + keyword_candidates:
            if s.id not in seen_candidate_ids:
                seen_candidate_ids.add(s.id)
                raw_candidates.append(s)

        diagnostics["candidate_count"] = len(raw_candidates)

        # Step 3: Candidate Verification & Hybrid Scoring
        valid_candidates: List[Tuple[Service, float, float, float, float, bool]] = []

        # Multilingual Location & Category Mappings
        KANNADA_DISTRICT_MAP = {
            "coorg": ["coorg", "kodagu", "kodava", "kodavu", "madikeri", "somwarpet", "virajpet", "kushalnagar", "ಕೊಡಗು", "ಕೊಡಗಿನಲ್ಲಿ", "ಕೊಡಗಿನ", "कूर्ग"],
            "chikmagalur": ["chikmagalur", "chikkamagaluru", "mudigere", "kudremukh", "ಚಿಕ್ಕಮಗಳೂರು", "ಚಿಕ್ಕಮಗಳೂರಿನ", "चिकमगलूर"],
            "bangalore": ["bangalore", "bengaluru", "ಬೆಂಗಳೂರು", "ಬೆಂಗಳೂರಿನಲ್ಲಿ", "बंगलौर", "बैंगलोर"],
            "mandya": ["mandya", "maddur", "ಮಂಡ್ಯ", "ಮಂಡ್ಯದ", "मांड्या"],
            "mysore": ["mysore", "mysuru", "kabini", "ಮೈಸೂರು", "ಮೈಸೂರಿನ", "मैसूर"],
            "shimoga": ["shimoga", "shivamogga", "thirthahalli", "ಶಿವಮೊಗ್ಗ", "ಶಿಮೋಗಾ", "शिमोगा"],
            "ramanagara": ["ramanagara", "ರಾಮನಗರ", "ರಾಮನಗರದ", "रामनगर"],
            "hampi": ["hampi", "ಹಂಪಿ", "हम्पी"],
            "kabini": ["kabini", "ಕಬಿನಿ", "कबिनी"],
            "sakleshpur": ["sakleshpur", "hassan", "ಸಕಲೇಶಪುರ", "सकलेशपुर"],
            "sirsi": ["sirsi", "ಶಿರಸಿ", "सिरसी"],
            "wayanad": ["wayanad", "ವಯನಾಡ್", "वायनाड"],
        }

        MULTILINGUAL_CAT_TERMS = [
            "farm", "coffee", "pottery", "spice", "stay", "tour", "harvest",
            "fair", "mela", "festival", "event", "jatre", "tea",
            "ಕಾಫಿ", "ತೋಟ", "ತೋಟದ", "ಕೃಷಿ", "ಕುಂಬಾರಿಕೆ", "ಮಣ್ಣಿನ", "ವಾಸ್ತವ್ಯ", "ಪ್ರವಾಸ", "ಕೊಯ್ಲು", "ಸಂತೆ", "ಮೇಳ", "ಜಾತ್ರೆ", "ಚಹಾ", "ಟೀ",
            "कॉफी", "फार्म", "खेत", "खेती", "मिट्टी", "बर्तन", "स्टे", "सफर", "कटाई", "मेला", "उत्सव", "चाय"
        ]

        for s in raw_candidates:
            # Secondary defense-in-depth eligibility validation
            if not cls.is_service_eligible(s, db):
                continue

            # Budget check
            if max_budget is not None and s.price > max_budget:
                continue

            # Compute similarity & feature matches
            emb = s.embedding if s.embedding is not None else EmbeddingService.generate_embedding(EmbeddingService.build_searchable_text(s))
            sim_full = _cosine_similarity(query_vector, emb)
            concise_text = f"{s.title} {s.category or ''} {s.location or ''} {s.district or ''}"
            sim_concise = _cosine_similarity(query_vector, EmbeddingService.generate_embedding(concise_text))
            sim_title = _cosine_similarity(query_vector, EmbeddingService.generate_embedding(s.title))
            semantic_score = max(sim_full, sim_concise, sim_title)

            # Category / topic matching signal (multilingual aware)
            cat_match = 0.0
            s_cat = (s.category or "").lower()
            s_slug = (s.category_slug or "").lower()
            s_title_lower = (s.title or "").lower()
            s_desc_lower = (s.description or "").lower()

            if cat_lower and (cat_lower in s_cat or cat_lower in s_slug):
                cat_match = 1.0
            elif is_event_fair_query and (
                s_slug in ["events", "event"] or "event" in s_cat or "fair" in s_title_lower or "fair" in s_desc_lower or "mela" in s_title_lower or "festival" in s_title_lower or "jatre" in s_title_lower
            ):
                cat_match = 1.0
            elif is_tea_query and ("tea" in s_title_lower or "tea" in s_desc_lower or "tea" in s_cat):
                cat_match = 1.0
            elif is_coffee_query and ("coffee" in s_title_lower or "coffee" in s_desc_lower or "coffee" in s_cat):
                cat_match = 1.0
            elif is_pottery_query and ("pottery" in s_title_lower or "pottery" in s_desc_lower or "pottery" in s_cat):
                cat_match = 1.0
            elif is_stay_query and (s_slug == "stay" or "stay" in s_cat or "homestay" in s_title_lower):
                cat_match = 1.0
            elif is_farm_query and ("farm" in s_title_lower or "farm" in s_desc_lower or "farm" in s_cat):
                cat_match = 1.0
            elif (s_cat and s_cat in q_lower) or (s_slug and s_slug in q_lower):
                cat_match = 1.0

            # Direct keyword match against title or description
            kw_match = False
            if filtered_tokens:
                for token in filtered_tokens:
                    if token in s_title_lower or token in s_desc_lower:
                        kw_match = True
                        break
            if is_event_fair_query and any(k in s_title_lower or k in s_desc_lower for k in ["fair", "mela", "festival", "jatre", "event"]):
                kw_match = True
            if is_tea_query and ("tea" in s_title_lower or "tea" in s_desc_lower):
                kw_match = True

            # Location matching signal (multilingual aware)
            loc_match = 0.0
            s_loc = (s.location or "").lower()
            s_dist = (s.district or "").lower()
            if dest_lower and (dest_lower in s_loc or dest_lower in s_dist):
                loc_match = 1.0
            else:
                for reg_key, variants in KANNADA_DISTRICT_MAP.items():
                    if any(var in q_lower for var in variants):
                        if reg_key in s_loc or reg_key in s_dist or any(var in s_loc or var in s_dist for var in variants):
                            loc_match = 1.0
                            break

            # Configured capacity signal (distinguished from real-time calendar availability)
            capacity_available = (s.max_capacity or 0) > 0
            avail_match = 1.0 if capacity_available else 0.5

            # Normalized rating signal
            rating_signal = min(1.0, max(0.0, float(s.rating or 5.0) / 5.0))

            final_score = (
                sem_weight * semantic_score
                + cat_weight * cat_match
                + loc_weight * loc_match
                + avail_weight * avail_match
                + rating_weight * rating_signal
            )

            # Threshold check: require semantic similarity to meet the threshold,
            # or allow high hybrid relevance match (e.g. queries matching location, category, or keywords)
            is_relevant_match = ((loc_match > 0 or cat_match > 0 or kw_match) and final_score >= sim_threshold)
            if semantic_score < sim_threshold and not is_relevant_match:
                continue

            valid_candidates.append((s, final_score, semantic_score, loc_match, cat_match, kw_match))

        # Step 4: Re-rank by final score descending
        valid_candidates.sort(key=lambda x: x[1], reverse=True)

        # Anti-padding filter:
        # If specific topic/intent exists (e.g. "suggest me some fair", "tea farm near me") or if matching candidates exist,
        # eliminate unrelated candidates that have no keyword, category, or location match.
        has_any_match = any(item[3] > 0 or item[4] > 0 or item[5] for item in valid_candidates)
        is_specific_query = (
            is_event_fair_query
            or is_tea_query
            or is_coffee_query
            or is_pottery_query
            or bool(dest_lower)
            or bool(cat_lower)
        )

        if has_any_match:
            pruned_candidates = []
            for item in valid_candidates:
                s, final_score, semantic_score, loc_m, cat_m, kw_m = item
                is_match = (loc_m > 0 or cat_m > 0 or kw_m)
                if is_match or semantic_score >= 0.70:
                    pruned_candidates.append(item)
            valid_candidates = pruned_candidates
        elif is_specific_query:
            # Specific query asked for a topic/place, but no catalog item matches
            valid_candidates = []

        final_services = [item[0] for item in valid_candidates[:resolved_k_final]]

        # Step 5: Construct detailed diagnostic observability structure
        diagnostics["filtered_count"] = len(valid_candidates)
        diagnostics["final_count"] = len(final_services)
        diagnostics["results"] = [
            {
                "service_id": str(s.id),
                "title": s.title,
                "similarity": round(float(semantic_score), 4),
                "final_score": round(float(final_score), 4),
                "location_match": loc_m > 0,
                "category_match": cat_m > 0,
                "capacity_available": (s.max_capacity or 0) > 0,
                "status": s.status,
                "is_verified": s.is_verified,
            }
            for s, final_score, semantic_score, loc_m, cat_m, _ in valid_candidates[:resolved_k_final]
        ]

        return final_services, diagnostics

    @classmethod
    def get_recommendations(
        cls,
        db: Session,
        user_id: Optional[str] = None,
        service_id: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 6,
    ) -> List[Service]:
        """Fetch recommended services based on content similarity, user preferences, or target service."""
        # Case 1: Similar to specific service
        if service_id:
            target = db.query(Service).filter(Service.id == service_id).first()
            if target and target.embedding is not None:
                bind = db.get_bind()
                if bind.dialect.name == "postgresql":
                    return (
                        db.query(Service)
                        .filter(Service.status == "PUBLISHED", Service.id != target.id, Service.embedding.isnot(None))
                        .order_by(Service.embedding.cosine_distance(target.embedding))
                        .limit(limit)
                        .all()
                    )
                else:
                    candidates = db.query(Service).filter(Service.status == "PUBLISHED", Service.id != target.id).all()
                    target_vec = list(target.embedding)
                    scored = [
                        (_cosine_similarity(target_vec, s.embedding), s)
                        for s in candidates
                    ]
                    scored.sort(key=lambda x: x[0], reverse=True)
                    return [s for _, s in scored[:limit]]

        # Case 2: Recommendations based on user bookings & profile
        if user_id:
            try:
                from app.models.booking import Booking
                # Fetch recent completed bookings for this user
                past_bookings = (
                    db.query(Booking)
                    .filter(Booking.customer_id == user_id, Booking.status == "COMPLETED")
                    .order_by(desc(Booking.created_at))
                    .limit(5)
                    .all()
                )
                if past_bookings:
                    booked_service_ids = [str(b.service_id) for b in past_bookings if b.service_id]
                    booked_services = db.query(Service).filter(Service.id.in_(booked_service_ids)).all()
                    
                    # Extract visited districts and booked categories
                    visited_districts = {s.district for s in booked_services if s.district}
                    booked_categories = {s.category_slug for s in booked_services if s.category_slug}

                    # Find complementary services in the same district/location excluding already booked services
                    q_comp = (
                        db.query(Service)
                        .filter(
                            Service.status == "PUBLISHED",
                            Service.id.notin_(booked_service_ids),
                        )
                    )
                    if visited_districts:
                        q_comp = q_comp.filter(Service.district.in_(list(visited_districts)))
                    
                    # Prioritize complementary categories (e.g. if user booked stay, prioritize experiences/food/tours)
                    comp_candidates = q_comp.order_by(desc(Service.rating), desc(Service.reviews_count)).limit(limit * 2).all()
                    if comp_candidates:
                        # Sort so that categories NOT yet booked appear first
                        sorted_comp = sorted(
                            comp_candidates,
                            key=lambda s: (0 if s.category_slug not in booked_categories else 1, -(s.rating or 0))
                        )
                        return sorted_comp[:limit]
            except Exception as e:
                logger.warning(f"Error fetching booking-based recommendations: {e}")

            user = db.query(User).filter(User.id == user_id).first()
            if user and user.location:
                items, _ = cls.semantic_search(db, query=f"Experiences and stays near {user.location}", limit=limit)
                if items:
                    return items

        # Case 3: Top-rated default published catalog
        return (
            db.query(Service)
            .filter(Service.status == "PUBLISHED")
            .order_by(desc(Service.rating), desc(Service.reviews_count))
            .limit(limit)
            .all()
        )
