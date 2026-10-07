"""Impressions, explicit user feedback, and interaction tracking handlers."""

import uuid
import json
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.modules.recommendation.domain.models import (
    UserInteraction,
    RecommendationImpression,
    RecommendationFeedback,
)
from app.modules.recommendation.features.feature_extractor import InteractionWeights


class FeedbackHandler:
    """Handles raw behavioral interaction tracking, impression logging, and explicit feedback."""

    @classmethod
    def record_interaction(
        cls,
        db: Session,
        user_id: uuid.UUID,
        event_type: str,
        service_id: Optional[uuid.UUID] = None,
        provider_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        event_value: Optional[str] = None,
        duration_seconds: Optional[int] = None,
        session_id: Optional[str] = None,
        source: Optional[str] = None,
        weight: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> UserInteraction:
        """Create and persist a raw behavioral interaction event with synthetic flag."""
        norm_event = str(event_type).upper().strip()
        final_weight = weight if weight is not None else InteractionWeights.get_weight(norm_event)

        user = db.query(User).filter(User.id == user_id).first()
        is_synthetic = bool(user.is_synthetic if user else False)

        interaction = UserInteraction(
            id=uuid.uuid4(),
            user_id=user_id,
            service_id=service_id,
            provider_id=provider_id,
            category_id=category_id,
            event_type=norm_event,
            event_value=event_value,
            duration_seconds=duration_seconds,
            session_id=session_id,
            source=source,
            weight=final_weight,
            metadata_json=json.dumps(metadata or {}),
            is_synthetic=is_synthetic,
            is_test_data=is_synthetic,
        )
        db.add(interaction)
        db.commit()
        db.refresh(interaction)
        return interaction

    @classmethod
    def record_impression(
        cls,
        db: Session,
        user_id: uuid.UUID,
        service_id: uuid.UUID,
        section: str,
        surface: str = "HOME",
        position: int = 0,
        recommendation_id: Optional[uuid.UUID] = None,
    ) -> RecommendationImpression:
        """Record an impression when a recommendation is rendered in the UI with synthetic flag."""
        user = db.query(User).filter(User.id == user_id).first()
        is_synthetic = bool(user.is_synthetic if user else False)

        impression = RecommendationImpression(
            id=uuid.uuid4(),
            user_id=user_id,
            service_id=service_id,
            surface=surface,
            section=section,
            position=position,
            recommendation_id=recommendation_id,
            shown_at=datetime.utcnow(),
            is_synthetic=is_synthetic,
        )
        db.add(impression)
        db.commit()
        db.refresh(impression)
        return impression

    @classmethod
    def record_feedback(
        cls,
        db: Session,
        user_id: uuid.UUID,
        service_id: uuid.UUID,
        feedback_type: str,
        feedback_text: Optional[str] = None,
        recommendation_id: Optional[uuid.UUID] = None,
    ) -> RecommendationFeedback:
        """Record explicit user feedback (LIKE, DISLIKE, HIDE, etc.) with synthetic flag."""
        user = db.query(User).filter(User.id == user_id).first()
        is_synthetic = bool(user.is_synthetic if user else False)

        feedback = RecommendationFeedback(
            id=uuid.uuid4(),
            user_id=user_id,
            service_id=service_id,
            recommendation_id=recommendation_id,
            feedback_type=feedback_type.upper(),
            feedback_text=feedback_text,
            is_synthetic=is_synthetic,
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return feedback
