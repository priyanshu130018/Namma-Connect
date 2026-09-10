"""Background Task Scheduler and Automated Trip Reminders for NammaConnect V2."""

from datetime import datetime, timedelta
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from app.core.logging import logger
from app.models.booking import Booking
from app.models.notification import Notification
from app.services.email import EmailService
from app.services.communication import NotificationService
from app.services.redis_service import RedisService


class BackgroundTaskService:
    """Service managing asynchronous workloads, scheduled trip reminders, and email dispatching."""

    @classmethod
    def process_upcoming_trip_reminders(cls, db: Session) -> Dict[str, Any]:
        """Scan confirmed reservations starting within 24-48 hours and dispatch reminder emails."""
        now = datetime.utcnow()
        window_start = now
        window_end = now + timedelta(hours=48)

        confirmed_bookings: List[Booking] = db.query(Booking).filter(
            Booking.status == "CONFIRMED",
            Booking.start_date >= window_start,
            Booking.start_date <= window_end,
        ).all()

        reminders_sent = 0
        skipped = 0

        for booking in confirmed_bookings:
            # 1. Database-backed idempotency: check if Notification already exists for this trip reminder
            existing_reminder = db.query(Notification).filter(
                Notification.user_id == booking.customer_id,
                Notification.type == "trip_reminder",
                Notification.resource_id == str(booking.id),
            ).first()

            cache_key = f"trip_reminder_sent:{booking.id}"
            if existing_reminder or RedisService.get(cache_key):
                skipped += 1
                continue

            customer = booking.customer
            service = booking.service
            if customer and customer.email and service:
                is_test = getattr(customer, "is_test_data", False) or getattr(booking, "is_test_data", False)
                start_date_str = str(booking.start_date)
                location_str = f"{service.location}, {service.state}" if service.location else "Karnataka"

                # Dispatch transactional trip reminder email
                res = EmailService.send_trip_reminder_email(
                    to_email=customer.email,
                    booking_code=booking.booking_code,
                    service_title=service.title,
                    start_date=start_date_str,
                    location=location_str,
                    is_test_data=is_test,
                    user_id=customer.id,
                    db=db,
                )

                # Create in-app trip reminder notification
                NotificationService.create_notification(
                    db=db,
                    user_id=customer.id,
                    title="Upcoming Trip Tomorrow",
                    message=f"Your stay or experience '{service.title}' ({booking.booking_code}) begins tomorrow. Have a safe journey!",
                    type="trip_reminder",
                    resource_type="booking",
                    resource_id=str(booking.id),
                )

                RedisService.set(cache_key, "true", expire_seconds=86400 * 3)
                reminders_sent += 1

        logger.info(f"Trip reminders processed: {reminders_sent} sent, {skipped} skipped.")
        return {
            "status": "completed",
            "reminders_sent": reminders_sent,
            "skipped": skipped,
            "timestamp": datetime.utcnow().isoformat(),
        }