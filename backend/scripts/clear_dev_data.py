"""Safe Development Data Cleanup Script for Namma Connect V2.

Removes ONLY records marked with is_test_data == True.
Strictly refuses execution in production environments.
"""

import sys
import os

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User
from app.models.service import Service, ServiceAvailability, SavedService, Review
from app.models.partner_application import PartnerApplication
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.refund import Refund
from app.models.payout import Payout
from app.models.notification import Notification
from app.models.support import SupportTicket
from app.models.recommendation import (
    UserInteraction,
    UserInterestProfile,
    UserSimilarity,
    RecommendationResult,
)


def check_safety_guard():
    """Ensure script never runs in production environments."""
    env = os.environ.get("ENVIRONMENT", getattr(settings, "ENV", "development")).lower()
    app_env = getattr(settings, "ENVIRONMENT", "").lower()
    db_url = str(settings.DATABASE_URL).lower()
    if any(e in ("prod", "production") for e in (env, app_env)) or any(k in db_url for k in ("prod", "production", "rds.amazonaws.com", "neon.tech/prod")):
        print("[FATAL] Cleanup script execution refused! Production environment or database detected.")
        sys.exit(1)


def clear_development_data(db: Session, preserve_manual_accounts: bool = False):
    """Safely delete all synthetic development data marked with is_synthetic == True or is_test_data == True."""
    check_safety_guard()

    print("\n========================================================")
    print("  NAMMA CONNECT V2 — SAFE SYNTHETIC TEST DATA CLEANUP")
    print("========================================================")

    # 1. Delete AI & trip tables
    db.execute(text("DELETE FROM ai_messages WHERE is_synthetic = true"))
    db.execute(text("DELETE FROM ai_conversations WHERE is_synthetic = true"))
    db.execute(text("DELETE FROM ai_trip_plans WHERE is_synthetic = true"))
    db.execute(text("DELETE FROM trip_items WHERE is_synthetic = true"))
    db.execute(text("DELETE FROM trip_days WHERE is_synthetic = true"))
    db.execute(text("DELETE FROM trips WHERE is_synthetic = true"))

    # 2. Delete recommendation & analytics tables first
    db.query(RecommendationResult).filter((RecommendationResult.is_synthetic == True) | (RecommendationResult.is_test_data == True)).delete(synchronize_session=False)
    db.query(UserSimilarity).filter((UserSimilarity.is_synthetic == True) | (UserSimilarity.is_test_data == True)).delete(synchronize_session=False)
    db.query(UserInterestProfile).filter((UserInterestProfile.is_synthetic == True) | (UserInterestProfile.is_test_data == True)).delete(synchronize_session=False)
    db.query(UserInteraction).filter((UserInteraction.is_synthetic == True) | (UserInteraction.is_test_data == True)).delete(synchronize_session=False)

    # 3. Delete dependent financial and transactional child records
    db.query(Review).filter((Review.is_synthetic == True) | (Review.is_test_data == True)).delete(synchronize_session=False)
    db.execute(text("DELETE FROM refunds WHERE is_synthetic = true OR booking_id IN (SELECT id FROM bookings WHERE is_synthetic = true OR is_test_data = true)"))
    db.query(Payment).filter((Payment.is_synthetic == True) | (Payment.is_test_data == True)).delete(synchronize_session=False)
    db.query(Booking).filter((Booking.is_synthetic == True) | (Booking.is_test_data == True)).delete(synchronize_session=False)
    db.query(Notification).filter((Notification.is_synthetic == True) | (Notification.is_test_data == True)).delete(synchronize_session=False)
    db.query(SupportTicket).filter((SupportTicket.is_synthetic == True) | (SupportTicket.is_test_data == True)).delete(synchronize_session=False)
    db.execute(text("DELETE FROM saved_services WHERE is_synthetic = true OR user_id IN (SELECT id FROM users WHERE is_synthetic = true OR is_test_data = true)"))
    db.execute(text("DELETE FROM payouts WHERE is_synthetic = true OR provider_id IN (SELECT id FROM users WHERE is_synthetic = true OR is_test_data = true)"))

    # 4. Delete availabilities and services
    test_service_ids = [s.id for s in db.query(Service.id).filter((Service.is_synthetic == True) | (Service.is_test_data == True)).all()]
    if test_service_ids:
        db.query(ServiceAvailability).filter(ServiceAvailability.service_id.in_(test_service_ids)).delete(synchronize_session=False)
    deleted_services = db.query(Service).filter((Service.is_synthetic == True) | (Service.is_test_data == True)).delete(synchronize_session=False)

    # 5. Delete partner applications
    deleted_apps = db.query(PartnerApplication).filter((PartnerApplication.is_synthetic == True) | (PartnerApplication.is_test_data == True)).delete(synchronize_session=False)

    # 6. Delete synthetic users
    user_query = db.query(User).filter((User.is_synthetic == True) | (User.is_test_data == True))
    if preserve_manual_accounts:
        user_query = user_query.filter(~User.email.in_(["namma_connect@gmail.com", "priyanshu@gmail.com", "arayn@gmail.com"]))
    deleted_users = user_query.delete(synchronize_session=False)

    db.commit()

    print(f"  Deleted Synthetic Services:          {deleted_services}")
    print(f"  Deleted Synthetic Partner Apps:      {deleted_apps}")
    print(f"  Deleted Synthetic Users:             {deleted_users}")
    print("========================================================")
    print("  CLEANUP COMPLETED SUCCESSFULLY (Real data preserved)")
    print("========================================================\n")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        clear_development_data(db)
    finally:
        db.close()
