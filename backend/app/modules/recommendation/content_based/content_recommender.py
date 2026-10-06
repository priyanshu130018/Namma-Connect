"""Content-Based Candidate Generator & Matcher."""

import math
from typing import Dict, Any, List, Optional
from app.modules.marketplace.domain.models import Service
from app.modules.recommendation.domain.models import UserInterestProfile


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity between two vector lists."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a <= 0.0 or norm_b <= 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


class ContentBasedRecommender:
    """Generates candidate recommendations using content attributes and semantic embeddings."""

    @classmethod
    def score_service_content(
        cls,
        service: Service,
        profile: Optional[UserInterestProfile] = None,
        context: Optional[Dict[str, Any]] = None,
        user_vector: Optional[List[float]] = None,
    ) -> Dict[str, Any]:
        """Compute content match score (0.0 to 1.0) and match reason."""
        scores = []
        reasons = []

        ctx = context or {}
        target_category = ctx.get("category_slug") or ctx.get("category")
        target_district = ctx.get("district") or ctx.get("location")
        target_max_price = ctx.get("max_price")

        # 1. Category Match
        category_affinity_map = {}
        if profile and profile.category_affinity_json:
            try:
                import json
                category_affinity_map = json.loads(profile.category_affinity_json)
            except Exception:
                category_affinity_map = {}

        svc_cat = (service.category_slug or service.category or "").lower()
        if target_category and target_category.lower() == svc_cat:
            scores.append(1.0)
            reasons.append(f"Matches category {service.category}")
        elif svc_cat in category_affinity_map:
            cat_score = category_affinity_map[svc_cat]
            scores.append(cat_score)
            reasons.append(f"Matches your interest in {service.category}")

        # 2. Destination / Location Match
        dest_affinity_map = {}
        if profile and profile.destination_affinity_json:
            try:
                import json
                dest_affinity_map = json.loads(profile.destination_affinity_json)
            except Exception:
                dest_affinity_map = {}

        svc_dist = (service.district or "").lower()
        if target_district and target_district.lower() == svc_dist:
            scores.append(1.0)
            reasons.append(f"Located in {service.district}")
        elif svc_dist in dest_affinity_map:
            dest_score = dest_affinity_map[svc_dist]
            scores.append(dest_score)
            reasons.append(f"Popular in {service.district}")

        # 3. Budget / Price Fit
        svc_price = float(service.price) if service.price is not None else 0.0
        if target_max_price and target_max_price > 0:
            if svc_price <= target_max_price:
                scores.append(1.0)
            else:
                price_ratio = target_max_price / max(1.0, svc_price)
                scores.append(max(0.0, min(1.0, price_ratio)))
        elif profile and profile.budget_band_json:
            try:
                import json
                band = json.loads(profile.budget_band_json)
                b_min = band.get("min", 0)
                b_max = band.get("max", 100000)
                if b_min <= svc_price <= b_max:
                    scores.append(1.0)
                elif svc_price < b_min:
                    scores.append(0.9)
                else:
                    scores.append(max(0.2, min(1.0, b_max / max(1.0, svc_price))))
            except Exception:
                pass

        # 4. Vector Embedding Semantic Match (when present)
        # Note: Handled explicitly; does NOT synthesize fake vectors
        svc_embedding = getattr(service, "embedding", None)
        if user_vector and svc_embedding is not None:
            # If embedding is a numpy array or list
            vector_list = list(svc_embedding) if hasattr(svc_embedding, "__iter__") else None
            if vector_list and len(vector_list) == len(user_vector):
                sim = cosine_similarity(user_vector, vector_list)
                scores.append(sim)
                if sim > 0.7:
                    reasons.append("High semantic alignment with your travel preferences")

        # Aggregate content score
        if scores:
            final_content_score = sum(scores) / len(scores)
        else:
            final_content_score = 0.5  # Neutral baseline when sparse

        primary_reason = reasons[0] if reasons else f"Top experience in {service.district or 'Karnataka'}"

        return {
            "score": round(final_content_score, 4),
            "reason": primary_reason,
            "reasons": reasons,
        }

    @classmethod
    def generate_candidates(
        cls,
        services: List[Service],
        profile: Optional[UserInterestProfile] = None,
        context: Optional[Dict[str, Any]] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Filter and rank candidate services based on content alignment."""
        scored_candidates = []
        for svc in services:
            # Active service filter
            if getattr(svc, "status", "PUBLISHED") != "PUBLISHED":
                continue
            if not getattr(svc, "is_verified", True):
                continue

            content_res = cls.score_service_content(svc, profile=profile, context=context)
            scored_candidates.append({
                "service": svc,
                "service_id": svc.id,
                "content_score": content_res["score"],
                "reason": content_res["reason"],
                "source": "CONTENT_BASED",
            })

        # Sort descending by content score
        scored_candidates.sort(key=lambda x: x["content_score"], reverse=True)
        return scored_candidates[:limit]
