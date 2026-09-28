"""Candidate generation and aggregation coordinator."""

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.modules.marketplace.domain.models import Service
from app.modules.recommendation.domain.models import UserInterestProfile
from app.modules.recommendation.content_based.content_recommender import ContentBasedRecommender
from app.modules.recommendation.collaborative.collaborative_recommender import CollaborativeRecommender


@dataclass
class RecommendationCandidate:
    service_id: uuid.UUID
    service: Service
    content_score: float = 0.0
    collaborative_score: float = 0.0
    profile_score: float = 0.0
    quality_score: float = 0.0
    freshness_score: float = 0.0
    sources: List[str] = field(default_factory=list)
    reason: str = "Recommended for you"


class CandidateGenerator:
    """Generates and combines candidates from multiple complementary recommendation streams."""

    @classmethod
    def generate_all_candidates(
        cls,
        db: Session,
        user_id: Optional[uuid.UUID] = None,
        profile: Optional[UserInterestProfile] = None,
        context: Optional[Dict[str, Any]] = None,
        exclude_service_ids: Optional[Set[uuid.UUID]] = None,
        candidate_pool_limit: int = 100,
    ) -> List[RecommendationCandidate]:
        """Aggregate candidates from Content-Based, Collaborative, and Marketplace Quality pools."""
        excluded = set(exclude_service_ids or [])
        candidate_map: Dict[uuid.UUID, RecommendationCandidate] = {}

        # 1. Fetch active marketplace services pool (bulk query)
        base_query = (
            db.query(Service)
            .filter(
                Service.status == "PUBLISHED",
                Service.is_verified.is_(True),
            )
        )
        if excluded:
            base_query = base_query.filter(~Service.id.in_(excluded))

        all_active_services = base_query.order_by(desc(Service.rating), desc(Service.reviews_count)).limit(candidate_pool_limit).all()

        # 2. Content-Based Candidate Generation
        content_candidates = ContentBasedRecommender.generate_candidates(
            services=all_active_services,
            profile=profile,
            context=context,
            limit=50,
        )
        for cc in content_candidates:
            sid = cc["service_id"]
            svc = cc["service"]
            if sid not in candidate_map:
                candidate_map[sid] = RecommendationCandidate(
                    service_id=sid,
                    service=svc,
                    content_score=cc["content_score"],
                    sources=["CONTENT_BASED"],
                    reason=cc["reason"],
                )
            else:
                candidate_map[sid].content_score = cc["content_score"]
                if "CONTENT_BASED" not in candidate_map[sid].sources:
                    candidate_map[sid].sources.append("CONTENT_BASED")

        # 3. Collaborative Filtering Candidates (if user_id provided)
        if user_id:
            collab_candidates = CollaborativeRecommender.generate_candidates(
                db=db,
                user_id=user_id,
                exclude_service_ids=excluded,
                limit=30,
            )
            for col in collab_candidates:
                sid = col["service_id"]
                svc = col["service"]
                if sid not in candidate_map:
                    candidate_map[sid] = RecommendationCandidate(
                        service_id=sid,
                        service=svc,
                        collaborative_score=col["collaborative_score"],
                        sources=["COLLABORATIVE"],
                        reason=col["reason"],
                    )
                else:
                    candidate_map[sid].collaborative_score = col["collaborative_score"]
                    if "COLLABORATIVE" not in candidate_map[sid].sources:
                        candidate_map[sid].sources.append("COLLABORATIVE")

        # 4. Fallback / Quality Candidates (for cold-start or low count)
        for svc in all_active_services:
            if svc.id not in candidate_map:
                # Rating quality score (0.0 to 1.0, e.g. 4.8 / 5.0 = 0.96)
                q_score = min(1.0, float(svc.rating or 5.0) / 5.0)
                candidate_map[svc.id] = RecommendationCandidate(
                    service_id=svc.id,
                    service=svc,
                    quality_score=q_score,
                    sources=["POPULARITY_QUALITY"],
                    reason=f"Highly rated {svc.category} in {svc.district}",
                )

        return list(candidate_map.values())
