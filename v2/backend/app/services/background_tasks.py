"""Background Tasks & Processing Queue Service for NammaConnect V2.

Handles asynchronous queue processing for interaction aggregation, recommendation refresh,
NC Score recalculation, and background metrics update.
"""

import uuid
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.logging import logger
from app.services.recommendation_engine import RecommendationEngine
from app.services.nc_score_engine import NCScoreEngine


class BackgroundQueueService:
    """Idempotent background job processor for non-blocking analytics & recommendation refresh."""

    @classmethod
    def process_user_interaction_async(
        cls,
        db: Session,
        user_id: uuid.UUID,
        event_type: str,
        service_id: Optional[uuid.UUID] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Asynchronously record user interaction and refresh user interest profile."""
        try:
            RecommendationEngine.record_interaction(
                db=db,
                user_id=user_id,
                event_type=event_type,
                service_id=service_id,
                metadata=metadata,
            )
            return True
        except Exception as err:
            logger.error(f"Background interaction processing error: {err}")
            return False

    @classmethod
    def recalculate_provider_nc_score_async(
        cls,
        db: Session,
        provider_id: uuid.UUID,
    ) -> bool:
        """Asynchronously recalculate provider NC Score snapshot."""
        try:
            NCScoreEngine.calculate_nc_score(db=db, provider_id=provider_id)
            return True
        except Exception as err:
            logger.error(f"Background NC score recalculation error: {err}")
            return False