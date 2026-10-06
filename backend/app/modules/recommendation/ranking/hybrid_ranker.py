"""Hybrid Ranker, Candidate Filtering, and Diversity Re-ranking."""

import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Set
from app.modules.recommendation.candidate_generation.candidate_generator import RecommendationCandidate
from app.modules.recommendation.domain.models import UserInterestProfile


class HybridRankingWeights:
    """Configurable scoring weights for hybrid ranking."""
    CONTENT_WEIGHT: float = 0.35
    COLLABORATIVE_WEIGHT: float = 0.25
    PROFILE_AFFINITY_WEIGHT: float = 0.20
    QUALITY_WEIGHT: float = 0.15
    FRESHNESS_WEIGHT: float = 0.05


class HybridRanker:
    """Ranks recommendation candidates using multi-signal hybrid scoring, eligibility gating, and diversity balancing."""

    @classmethod
    def filter_eligible_candidates(
        cls,
        candidates: List[RecommendationCandidate],
        user_id: Optional[uuid.UUID] = None,
        booked_service_ids: Optional[Set[uuid.UUID]] = None,
        dismissed_service_ids: Optional[Set[uuid.UUID]] = None,
    ) -> List[RecommendationCandidate]:
        """Apply strict eligibility gates: active status, verified host, no self-service, not dismissed."""
        booked = booked_service_ids or set()
        dismissed = dismissed_service_ids or set()
        eligible = []

        for cand in candidates:
            svc = cand.service
            # Status check
            if getattr(svc, "status", "PUBLISHED") != "PUBLISHED":
                continue
            # Verification check
            if not getattr(svc, "is_verified", True):
                continue
            # Self-booking prevention guard (provider cannot be recommended their own listing)
            if user_id and getattr(svc, "provider_id", None) == user_id:
                continue
            # Dismissed / hidden check
            if cand.service_id in dismissed:
                continue
            # Already booked check
            if cand.service_id in booked:
                continue

            eligible.append(cand)
        return eligible

    @classmethod
    def rank(
        cls,
        candidates: List[RecommendationCandidate],
        profile: Optional[UserInterestProfile] = None,
        weights: Optional[HybridRankingWeights] = None,
        limit: int = 20,
        enable_diversity: bool = True,
    ) -> List[Dict[str, Any]]:
        """Compute hybrid score, sort candidates, and apply diversity balancing."""
        w = weights or HybridRankingWeights()
        ranked_items = []

        for cand in candidates:
            svc = cand.service

            # 1. Content score (0.0 to 1.0)
            s_content = cand.content_score

            # 2. Collaborative score (0.0 to 1.0)
            s_collab = cand.collaborative_score

            # 3. Profile affinity score (0.0 to 1.0)
            s_profile = 0.0
            if profile and profile.category_affinity_json:
                try:
                    import json
                    aff_map = json.loads(profile.category_affinity_json)
                    cat_key = (svc.category_slug or svc.category or "").lower()
                    s_profile = float(aff_map.get(cat_key, 0.0))
                except Exception:
                    s_profile = 0.0

            # 4. Quality score (Rating / 5.0 scaled with review volume confidence)
            rating = float(svc.rating or 5.0)
            reviews_count = int(svc.reviews_count or 0)
            confidence_multiplier = min(1.0, 0.5 + (reviews_count / 20.0) * 0.5)
            s_quality = (rating / 5.0) * confidence_multiplier

            # 5. Freshness score (new listings get a slight discovery boost)
            s_freshness = 0.5
            created_at = getattr(svc, "created_at", None)
            if created_at:
                age_days = (datetime.utcnow() - created_at).total_seconds() / 86400.0
                if age_days < 30.0:
                    s_freshness = max(0.5, 1.0 - (age_days / 30.0) * 0.5)

            # Combined Hybrid Score (Normalized 0.0 to 1.0)
            raw_score = (
                w.CONTENT_WEIGHT * s_content
                + w.COLLABORATIVE_WEIGHT * s_collab
                + w.PROFILE_AFFINITY_WEIGHT * s_profile
                + w.QUALITY_WEIGHT * s_quality
                + w.FRESHNESS_WEIGHT * s_freshness
            )
            # Final score on 0-100 scale
            final_score = round(min(100.0, max(0.0, raw_score * 100.0)), 2)

            # Determine primary reason and algorithm tag
            primary_source = cand.sources[0] if cand.sources else "PERSONALIZED"
            reason_code = "personalized_match"
            if "COLLABORATIVE" in cand.sources and s_collab > 0.5:
                reason_code = "similar_users"
                explanation = "Popular among travelers with similar tastes"
            elif "CONTENT_BASED" in cand.sources and s_content > 0.6:
                reason_code = "content_match"
                explanation = f"Matches your interest in {svc.category}"
            else:
                reason_code = "top_rated"
                explanation = f"Top rated {svc.category} in {svc.district}"

            ranked_items.append({
                "service_id": svc.id,
                "service": svc,
                "score": final_score,
                "algorithm": primary_source,
                "reason_code": reason_code,
                "explanation": explanation,
                "category_slug": (svc.category_slug or svc.category or "").lower(),
                "provider_id": svc.provider_id,
            })

        # Sort descending by final score
        ranked_items.sort(key=lambda x: x["score"], reverse=True)

        if not enable_diversity:
            return ranked_items[:limit]

        # Apply Diversity Re-ranking (cap max items per category/provider)
        diversified = []
        category_counts: Dict[str, int] = {}
        provider_counts: Dict[Any, int] = {}
        max_per_category = max(2, limit // 3)
        max_per_provider = 2

        deferred = []
        for item in ranked_items:
            cat = item["category_slug"]
            prov = item["provider_id"]

            if category_counts.get(cat, 0) < max_per_category and provider_counts.get(prov, 0) < max_per_provider:
                diversified.append(item)
                category_counts[cat] = category_counts.get(cat, 0) + 1
                provider_counts[prov] = provider_counts.get(prov, 0) + 1
            else:
                deferred.append(item)

            if len(diversified) >= limit:
                break

        # Fill remaining slots from deferred if needed
        if len(diversified) < limit:
            for item in deferred:
                diversified.append(item)
                if len(diversified) >= limit:
                    break

        return diversified[:limit]
