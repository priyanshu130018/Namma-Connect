"""Recommendation infrastructure repository."""

import uuid
from typing import Optional, List, Set
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.modules.recommendation.domain.models import (
    UserInteraction,
    UserInterestProfile,
    UserSimilarity,
    RecommendationResult,
    RecommendationImpression,
    RecommendationFeedback,
)
from app.modules.marketplace.domain.models import Service
from app.modules.booking.domain.models import Booking


class RecommendationRepository:
    """Encapsulates database operations for the recommendation module."""

    def __init__(self, db: Session):
        self.db = db

    # Interactions
    def record_interaction(self, interaction: UserInteraction) -> UserInteraction:
        self.db.add(interaction)
        self.db.commit()
        self.db.refresh(interaction)
        return interaction

    def get_user_interactions(self, user_id, limit: int = 100) -> List[UserInteraction]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        return (
            self.db.query(UserInteraction)
            .filter(UserInteraction.user_id == user_id)
            .order_by(desc(UserInteraction.created_at))
            .limit(limit)
            .all()
        )

    # Interest Profile
    def get_user_profile(self, user_id) -> Optional[UserInterestProfile]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        return self.db.query(UserInterestProfile).filter(UserInterestProfile.user_id == user_id).first()

    def save_user_profile(self, profile: UserInterestProfile) -> UserInterestProfile:
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    # User Similarities
    def get_user_similarities(self, user_id, top_k: int = 15) -> List[UserSimilarity]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        return (
            self.db.query(UserSimilarity)
            .filter(or_(UserSimilarity.user_id_1 == user_id, UserSimilarity.user_id_2 == user_id))
            .order_by(desc(UserSimilarity.similarity_score))
            .limit(top_k)
            .all()
        )

    # Results & Feed
    def save_recommendation_results(self, results: List[RecommendationResult]) -> List[RecommendationResult]:
        if not results:
            return []
        self.db.add_all(results)
        self.db.commit()
        return results

    def clear_user_recommendations(self, user_id, section: Optional[str] = None) -> int:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        query = self.db.query(RecommendationResult).filter(RecommendationResult.user_id == user_id)
        if section:
            query = query.filter(RecommendationResult.section == section)
        count = query.delete(synchronize_session=False)
        self.db.commit()
        return count

    def get_latest_recommendations(
        self,
        user_id,
        section: str = "recommended_for_you",
        limit: int = 10,
    ) -> List[RecommendationResult]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        return (
            self.db.query(RecommendationResult)
            .filter(
                RecommendationResult.user_id == user_id,
                RecommendationResult.section == section,
            )
            .order_by(RecommendationResult.rank.asc(), desc(RecommendationResult.score))
            .limit(limit)
            .all()
        )

    # Impressions & Feedback
    def record_impression(self, impression: RecommendationImpression) -> RecommendationImpression:
        self.db.add(impression)
        self.db.commit()
        self.db.refresh(impression)
        return impression

    def record_feedback(self, feedback: RecommendationFeedback) -> RecommendationFeedback:
        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)
        return feedback

    # Gating & Exclusion sets
    def get_user_dismissed_service_ids(self, user_id) -> Set[uuid.UUID]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        # Check explicit negative feedback or dismiss interaction
        disliked = (
            self.db.query(RecommendationFeedback.service_id)
            .filter(
                RecommendationFeedback.user_id == user_id,
                RecommendationFeedback.feedback_type.in_(["DISLIKE", "NOT_INTERESTED", "HIDE", "IRRELEVANT"]),
            )
            .all()
        )
        dismiss_inter = (
            self.db.query(UserInteraction.service_id)
            .filter(
                UserInteraction.user_id == user_id,
                UserInteraction.event_type.in_(["DISMISS", "EXPLICIT_HIDE"]),
                UserInteraction.service_id.isnot(None),
            )
            .all()
        )
        return {r[0] for r in disliked if r[0]}.union({r[0] for r in dismiss_inter if r[0]})

    def get_user_booked_service_ids(self, user_id) -> Set[uuid.UUID]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        bookings = (
            self.db.query(Booking.service_id)
            .filter(
                Booking.customer_id == user_id,
                Booking.status.in_(["CONFIRMED", "COMPLETED"]),
            )
            .all()
        )
        return {b[0] for b in bookings if b[0]}

    def get_active_services(
        self,
        category_slug: Optional[str] = None,
        district: Optional[str] = None,
        limit: int = 50,
    ) -> List[Service]:
        query = self.db.query(Service).filter(
            Service.status == "PUBLISHED",
            Service.is_verified.is_(True),
        )
        if category_slug:
            query = query.filter(Service.category_slug == category_slug.lower())
        if district:
            query = query.filter(Service.district.ilike(f"%{district}%"))
        return query.order_by(desc(Service.rating), desc(Service.reviews_count)).limit(limit).all()
