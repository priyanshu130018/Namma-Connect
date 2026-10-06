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

    @classmethod
    def process_upcoming_trip_reminders(cls, db: Session) -> Dict[str, Any]:
        """Scan upcoming confirmed bookings within 24-48h and dispatch idempotent reminders."""
        from datetime import datetime, timedelta
        from app.models.booking import Booking
        from app.models.notification import Notification
        from app.services.communication import NotificationService
        from app.services.email import EmailService

        now = datetime.utcnow()
        window_start = (now + timedelta(hours=20)).strftime("%Y-%m-%d")
        window_end = (now + timedelta(hours=50)).strftime("%Y-%m-%d")

        bookings = (
            db.query(Booking)
            .filter(
                Booking.status == "CONFIRMED",
                Booking.start_date >= window_start,
                Booking.start_date <= window_end,
            )
            .all()
        )

        reminders_sent = 0
        skipped = 0

        for b in bookings:
            existing = (
                db.query(Notification)
                .filter(
                    Notification.user_id == b.customer_id,
                    Notification.type == "trip_reminder",
                    Notification.resource_id == str(b.id),
                )
                .first()
            )
            if existing:
                skipped += 1
                continue

            srv_title = b.service.title if b.service else "Rural Experience"
            try:
                NotificationService.create_notification(
                    db,
                    user_id=b.customer_id,
                    title="Upcoming Trip Reminder",
                    message=f"Your trip for '{srv_title}' starts tomorrow.",
                    type="trip_reminder",
                    resource_type="booking",
                    resource_id=str(b.id),
                )
            except Exception:
                pass

            if b.customer:
                try:
                    EmailService.send_trip_reminder_email(
                        to_email=b.customer.email,
                        customer_name=b.customer.full_name or "Traveler",
                        service_title=srv_title,
                        booking_code=b.booking_code,
                        start_date=b.start_date,
                        is_test_data=getattr(b.customer, "is_test_data", False),
                        user_id=b.customer_id,
                        db=db,
                    )
                except Exception:
                    pass

            reminders_sent += 1

        return {
            "status": "completed",
            "reminders_sent": reminders_sent,
            "skipped": skipped,
            "total_evaluated": len(bookings),
        }


# Legacy and test compatibility alias
BackgroundTaskService = BackgroundQueueService