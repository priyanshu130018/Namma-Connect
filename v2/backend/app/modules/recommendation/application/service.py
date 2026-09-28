"""Recommendation Application Service."""

import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.modules.recommendation.infrastructure.repository import RecommendationRepository
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.marketplace.domain.models import Service, MarketplaceCategory
from app.modules.recommendation.domain.models import (
    UserInteraction,
    UserInterestProfile,
    RecommendationResult,
)
from app.modules.recommendation.features.feature_extractor import FeatureExtractor
from app.modules.recommendation.candidate_generation.candidate_generator import CandidateGenerator
from app.modules.recommendation.ranking.hybrid_ranker import HybridRanker
from app.modules.recommendation.feedback.feedback_handler import FeedbackHandler
from app.modules.recommendation.collaborative.user_similarity_calculator import UserSimilarityCalculator
from app.modules.recommendation.presentation.schemas import (
    RecordInteractionRequest,
    RecordImpressionRequest,
    RecommendationFeedbackRequest,
)


class RecommendationService:
    """Orchestrates candidate generation, hybrid ranking, profile derivation, and feedback."""

    def __init__(
        self,
        rec_repo: RecommendationRepository,
        marketplace_repo: MarketplaceRepository,
    ):
        self.rec_repo = rec_repo
        self.marketplace_repo = marketplace_repo
        self.db: Session = rec_repo.db

    # 1. Behavioral Signal Tracking
    def track_interaction(
        self,
        user_id: Any,
        payload: RecordInteractionRequest,
    ) -> Dict[str, Any]:
        """Record raw behavioral interaction and trigger incremental profile refresh."""
        u_id = uuid.UUID(str(user_id)) if isinstance(user_id, (str, uuid.UUID)) else user_id
        s_id = uuid.UUID(payload.service_id) if payload.service_id else None

        # Fetch provider_id and category_id if service_id is available
        provider_id = None
        category_id = None
        if s_id:
            svc = self.marketplace_repo.get_service_by_id(s_id)
            if svc:
                provider_id = svc.provider_id
                category_id = svc.category_id

        interaction = FeedbackHandler.record_interaction(
            db=self.db,
            user_id=u_id,
            event_type=payload.event_type,
            service_id=s_id,
            provider_id=provider_id,
            category_id=category_id,
            duration_seconds=payload.duration_seconds,
            session_id=payload.session_id,
            source=payload.source,
            weight=payload.weight,
            metadata=payload.metadata,
        )

        # Incremental profile refresh
        self.update_user_interest_profile(u_id)

        return {
            "success": True,
            "interaction_id": str(interaction.id),
            "event_type": interaction.event_type,
            "weight": interaction.weight,
        }

    # 2. User Interest Profile Management
    def update_user_interest_profile(self, user_id: Any) -> UserInterestProfile:
        """Derive and persist aggregate interest profile from user interaction history."""
        u_id = uuid.UUID(str(user_id)) if isinstance(user_id, (str, uuid.UUID)) else user_id
        interactions = self.rec_repo.get_user_interactions(u_id, limit=200)

        affinities = FeatureExtractor.extract_affinities_from_interactions(interactions)
        profile = self.rec_repo.get_user_profile(u_id)

        if not profile:
            profile = UserInterestProfile(
                id=uuid.uuid4(),
                user_id=u_id,
            )

        profile.interest_score = affinities["interest_score"]
        profile.confidence_score = affinities["confidence_score"]
        profile.interaction_count = affinities["interaction_count"]
        profile.category_affinity_json = json.dumps(affinities["category_affinity"])
        profile.destination_affinity_json = json.dumps(affinities["destination_affinity"])
        profile.topic_affinity_json = json.dumps(affinities["topic_affinity"])
        profile.budget_band_json = json.dumps(affinities["budget_band"])
        profile.last_updated = datetime.utcnow()
        if interactions:
            profile.last_interaction_at = interactions[0].created_at

        return self.rec_repo.save_user_profile(profile)

    def get_user_interest_profile(self, user_id: Any) -> Dict[str, Any]:
        """Retrieve structured user interest profile."""
        u_id = uuid.UUID(str(user_id)) if isinstance(user_id, (str, uuid.UUID)) else user_id
        profile = self.rec_repo.get_user_profile(u_id)
        if not profile:
            return {
                "user_id": str(u_id),
                "interest_score": 0.0,
                "confidence_score": 0.0,
                "interaction_count": 0,
                "category_affinity": {},
                "destination_affinity": {},
                "topic_affinity": {},
                "budget_band": {"min": 500, "max": 10000},
                "last_updated": None,
            }

        def parse_json(val, default):
            if not val:
                return default
            try:
                return json.loads(val)
            except Exception:
                return default

        return {
            "user_id": str(profile.user_id),
            "interest_score": float(profile.interest_score or 0.0),
            "confidence_score": float(profile.confidence_score or 0.0),
            "interaction_count": int(profile.interaction_count or 0),
            "category_affinity": parse_json(profile.category_affinity_json, {}),
            "destination_affinity": parse_json(profile.destination_affinity_json, {}),
            "topic_affinity": parse_json(profile.topic_affinity_json, {}),
            "budget_band": parse_json(profile.budget_band_json, {"min": 500, "max": 10000}),
            "last_updated": profile.last_updated.isoformat() if profile.last_updated else None,
        }

    # 3. Candidate Generation & Personalized Ranking
    def get_personalized_recommendations(
        self,
        user_id: Optional[Any] = None,
        limit: int = 10,
        context: Optional[Dict[str, Any]] = None,
        persist: bool = False,
        section: str = "recommended_for_you",
    ) -> List[Dict[str, Any]]:
        """Generate personalized recommendations using hybrid ranking and candidate gating."""
        u_id = uuid.UUID(str(user_id)) if user_id and isinstance(user_id, (str, uuid.UUID)) else user_id
        profile = self.rec_repo.get_user_profile(u_id) if u_id else None

        # Exclusions
        dismissed_ids = self.rec_repo.get_user_dismissed_service_ids(u_id) if u_id else set()
        booked_ids = self.rec_repo.get_user_booked_service_ids(u_id) if u_id else set()
        excluded_ids = dismissed_ids.union(booked_ids)

        # 1. Generate Candidates
        candidates = CandidateGenerator.generate_all_candidates(
            db=self.db,
            user_id=u_id,
            profile=profile,
            context=context,
            exclude_service_ids=excluded_ids,
        )

        # 2. Eligibility Gating
        eligible = HybridRanker.filter_eligible_candidates(
            candidates=candidates,
            user_id=u_id,
            booked_service_ids=booked_ids,
            dismissed_service_ids=dismissed_ids,
        )

        # 3. Hybrid Ranking with Diversity
        ranked = HybridRanker.rank(
            candidates=eligible,
            profile=profile,
            limit=limit,
            enable_diversity=True,
        )

        # Format items
        formatted = []
        rec_results_to_save = []
        now = datetime.utcnow()

        for idx, item in enumerate(ranked):
            svc = item["service"]
            svc_dict = {
                "id": str(svc.id),
                "title": svc.title,
                "category": svc.category,
                "category_slug": svc.category_slug,
                "district": svc.district,
                "price": float(svc.price),
                "rating": float(svc.rating),
                "reviews_count": svc.reviews_count,
                "primary_image": svc.primary_image,
            }
            formatted.append({
                "service_id": str(svc.id),
                "score": float(item["score"]),
                "algorithm": item["algorithm"],
                "reason_code": item.get("reason_code", "personalized_match"),
                "explanation": item.get("explanation", "Recommended for you"),
                "service_details": svc_dict,
            })

            if persist and u_id:
                rec_results_to_save.append(
                    RecommendationResult(
                        id=uuid.uuid4(),
                        user_id=u_id,
                        service_id=svc.id,
                        provider_id=svc.provider_id,
                        category_id=svc.category_id,
                        recommendation_type=item["algorithm"],
                        section=section,
                        score=float(item["score"]),
                        rank=idx + 1,
                        reason=item.get("explanation"),
                        reason_code=item.get("reason_code", "personalized_match"),
                        explanation_text=item.get("explanation", ""),
                        expires_at=now + timedelta(hours=24),
                    )
                )

        if persist and rec_results_to_save and u_id:
            self.rec_repo.clear_user_recommendations(u_id, section=section)
            self.rec_repo.save_recommendation_results(rec_results_to_save)

        return formatted

    # 4. Home Page Recommendations (5 Structured Sections)
    def get_home_recommendations(
        self,
        user_id: Optional[Any] = None,
        location: Optional[str] = None,
        limit_per_section: int = 6,
    ) -> Dict[str, Any]:
        """Fetch structured 5-section home recommendations."""
        u_id = uuid.UUID(str(user_id)) if user_id and isinstance(user_id, (str, uuid.UUID)) else user_id

        # 1. Recommended for You (Personalized Hybrid or Cold-Start Top Quality)
        recommended_for_you = self.get_personalized_recommendations(
            user_id=u_id,
            limit=limit_per_section,
            context={"location": location} if location else None,
            section="recommended_for_you",
        )

        # 2. Top Rated Services in Karnataka
        top_services = (
            self.db.query(Service)
            .filter(Service.status == "PUBLISHED", Service.is_verified.is_(True))
            .order_by(desc(Service.rating), desc(Service.reviews_count))
            .limit(limit_per_section)
            .all()
        )
        top_rated = [self._format_service_to_rec_item(s, "TOP_RATED", "Top rated verified experience") for s in top_services]

        # 3. Most Visited / Popular Services
        popular_services = (
            self.db.query(Service)
            .filter(Service.status == "PUBLISHED", Service.is_verified.is_(True))
            .order_by(desc(Service.reviews_count), desc(Service.rating))
            .limit(limit_per_section)
            .all()
        )
        most_visited = [self._format_service_to_rec_item(s, "MOST_VISITED", "Popular with travelers") for s in popular_services]

        # 4. Near You (Proximity / District matching)
        near_query = self.db.query(Service).filter(Service.status == "PUBLISHED", Service.is_verified.is_(True))
        if location:
            near_query = near_query.filter(
                (Service.district.ilike(f"%{location}%")) | (Service.location.ilike(f"%{location}%"))
            )
        near_services = near_query.order_by(desc(Service.rating)).limit(limit_per_section).all()
        if not near_services:
            # Fallback to general pool
            near_services = top_services[:limit_per_section]
        near_you = [self._format_service_to_rec_item(s, "NEAR_YOU", f"Experiences in {s.district}") for s in near_services]

        # 5. Taxonomy Categories
        categories = (
            self.db.query(MarketplaceCategory)
            .filter(MarketplaceCategory.is_active.is_(True))
            .order_by(MarketplaceCategory.sort_order.asc())
            .all()
        )
        category_list = [
            {
                "id": str(c.id),
                "slug": c.slug,
                "name": c.name,
                "icon": c.icon,
                "description": c.description,
            }
            for c in categories
        ]

        return {
            "recommended_for_you": recommended_for_you,
            "top_rated": top_rated,
            "most_visited": most_visited,
            "near_you": near_you,
            "categories": category_list,
        }

    # 5. Category-specific Recommendations
    def get_category_recommendations(
        self,
        category_slug: str,
        user_id: Optional[Any] = None,
        limit: int = 12,
    ) -> List[Dict[str, Any]]:
        """Fetch personalized recommendations filtered by a specific category."""
        return self.get_personalized_recommendations(
            user_id=user_id,
            limit=limit,
            context={"category_slug": category_slug},
            section=f"category_{category_slug}",
        )

    # 6. Impressions and Feedback
    def track_impression(
        self,
        user_id: Any,
        payload: RecordImpressionRequest,
    ) -> Dict[str, Any]:
        """Record recommendation impression."""
        u_id = uuid.UUID(str(user_id)) if isinstance(user_id, (str, uuid.UUID)) else user_id
        s_id = uuid.UUID(payload.service_id)
        rec_id = uuid.UUID(payload.recommendation_id) if payload.recommendation_id else None

        impression = FeedbackHandler.record_impression(
            db=self.db,
            user_id=u_id,
            service_id=s_id,
            section=payload.section,
            surface=payload.surface or "HOME",
            position=payload.position or 0,
            recommendation_id=rec_id,
        )
        return {"success": True, "impression_id": str(impression.id)}

    def submit_feedback(
        self,
        user_id: Any,
        payload: RecommendationFeedbackRequest,
    ) -> Dict[str, Any]:
        """Record explicit feedback and register a negative event if disliked."""
        u_id = uuid.UUID(str(user_id)) if isinstance(user_id, (str, uuid.UUID)) else user_id
        s_id = uuid.UUID(payload.service_id)
        rec_id = uuid.UUID(payload.recommendation_id) if payload.recommendation_id else None

        feedback = FeedbackHandler.record_feedback(
            db=self.db,
            user_id=u_id,
            service_id=s_id,
            feedback_type=payload.feedback_type,
            feedback_text=payload.feedback_text,
            recommendation_id=rec_id,
        )

        # If feedback is negative (DISLIKE, NOT_INTERESTED, HIDE), record a negative interaction event
        if payload.feedback_type.upper() in ["DISLIKE", "NOT_INTERESTED", "HIDE", "IRRELEVANT"]:
            FeedbackHandler.record_interaction(
                db=self.db,
                user_id=u_id,
                service_id=s_id,
                event_type="DISMISS",
                weight=-3.0,
                metadata={"reason": payload.feedback_text, "feedback_id": str(feedback.id)},
            )
            self.update_user_interest_profile(u_id)

        return {"success": True, "feedback_id": str(feedback.id), "message": "Feedback recorded."}

    # 7. Offline / Batch Similarity Computation
    def compute_all_user_similarities(self) -> int:
        """Run batch user similarity computation across the interaction matrix."""
        return UserSimilarityCalculator.run_batch_similarity_calculation(self.db)

    def _format_service_to_rec_item(self, svc: Service, algorithm: str, reason: str) -> Dict[str, Any]:
        return {
            "service_id": str(svc.id),
            "score": round((float(svc.rating or 5.0) / 5.0) * 100.0, 2),
            "algorithm": algorithm,
            "reason_code": algorithm.lower(),
            "explanation": reason,
            "service_details": {
                "id": str(svc.id),
                "title": svc.title,
                "category": svc.category,
                "category_slug": svc.category_slug,
                "district": svc.district,
                "price": float(svc.price),
                "rating": float(svc.rating),
                "reviews_count": svc.reviews_count,
                "primary_image": svc.primary_image,
            },
        }
