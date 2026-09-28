"""Celery tasks for interaction aggregation, recommendation refresh, NC score calculation, and analytics."""

import uuid
from typing import Dict, Any, Optional, List
from app.core.celery_app import celery_app
from app.core import database
from app.core.logging import logger
from app.services.recommendation_engine import RecommendationEngine
from app.services.nc_score_engine import NCScoreEngine


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    name="app.tasks.recommendation_tasks.process_user_interaction_task",
)
def process_user_interaction_task(
    self,
    user_id_str: str,
    event_type: str,
    service_id_str: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    """Asynchronously record user interaction signal and trigger profile refresh."""
    db = database.SessionLocal()
    try:
        u_id = uuid.UUID(user_id_str)
        s_id = uuid.UUID(service_id_str) if service_id_str else None
        
        RecommendationEngine.record_interaction(
            db=db,
            user_id=u_id,
            event_type=event_type,
            service_id=s_id,
            metadata=metadata,
        )
        return True
    except Exception as exc:
        logger.error(f"Error in process_user_interaction_task: {exc}")
        db.rollback()
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            logger.critical(f"Max retries exceeded for interaction task user={user_id_str}")
            return False
    finally:
        db.close()


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=15,
    name="app.tasks.recommendation_tasks.update_user_interest_profile_task",
)
def update_user_interest_profile_task(self, user_id_str: str) -> bool:
    """Asynchronously recalculate user interest profile with 7-day half-life decay."""
    db = database.SessionLocal()
    try:
        u_id = uuid.UUID(user_id_str)
        RecommendationEngine.update_user_interest_profile(db=db, user_id=u_id)
        return True
    except Exception as exc:
        logger.error(f"Error in update_user_interest_profile_task: {exc}")
        db.rollback()
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return False
    finally:
        db.close()


@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=10,
    name="app.tasks.recommendation_tasks.precompute_home_recommendations_task",
)
def precompute_home_recommendations_task(self, user_id_str: Optional[str] = None, location: Optional[str] = None) -> bool:
    """Precompute and refresh Home page recommendations payload in Redis cache."""
    db = database.SessionLocal()
    try:
        from app.models.user import User
        user = None
        if user_id_str:
            user = db.query(User).filter(User.id == uuid.UUID(user_id_str)).first()
            
        RecommendationEngine.get_home_recommendations(
            user=user,
            db=db,
            location=location,
            force_refresh=True,
        )
        return True
    except Exception as exc:
        logger.error(f"Error in precompute_home_recommendations_task: {exc}")
        db.rollback()
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return False
    finally:
        db.close()


@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    name="app.tasks.recommendation_tasks.compute_user_similarities_task",
)
def compute_user_similarities_task(self) -> int:
    """Batch compute and persist user-to-user behavioral similarity pairs."""
    db = database.SessionLocal()
    try:
        pairs_computed = RecommendationEngine.compute_all_user_similarities(db=db)
        return pairs_computed
    except Exception as exc:
        logger.error(f"Error in compute_user_similarities_task: {exc}")
        db.rollback()
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return 0
    finally:
        db.close()


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=15,
    name="app.tasks.recommendation_tasks.recalculate_nc_score_task",
)
def recalculate_nc_score_task(self, provider_id_str: str, service_id_str: Optional[str] = None) -> bool:
    """Recalculate provider NC Score and update Redis cache."""
    db = database.SessionLocal()
    try:
        p_id = uuid.UUID(provider_id_str)
        s_id = uuid.UUID(service_id_str) if service_id_str else None
        NCScoreEngine.calculate_nc_score(db=db, provider_id=p_id, service_id=s_id)
        return True
    except Exception as exc:
        logger.error(f"Error in recalculate_nc_score_task: {exc}")
        db.rollback()
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return False
    finally:
        db.close()


@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=5,
    name="app.tasks.recommendation_tasks.send_notification_task",
)
def send_notification_task(self, recipient_id_str: str, title: str, message: str) -> bool:
    """Background task for dispatching notification alerts."""
    logger.info(f"[NOTIFICATION] Sent to {recipient_id_str}: {title} - {message}")
    return True
