"""Safe Development Data Cleanup Script for NammaConnect V2.

Removes ONLY records marked with is_test_data == True.
Strictly refuses execution in production environments.
"""

import sys
import os

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User
from app.models.service import Service, Review
from app.models.partner_application import PartnerApplication
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.creator import CreatorProfile
from app.models.notification import Notification
from app.models.support import SupportTicket
from app.models.saved_service import SavedService


def check_safety_guard():
    """Ensure script never runs in production environments."""
    env = os.environ.get("ENVIRONMENT", getattr(settings, "ENV", "development")).lower()
    if "prod" in env:
        print("[FATAL] Cleanup script execution refused! ENVIRONMENT is set to 'production'.")
        print("This script is strictly for development and testing environments.")
        sys.exit(1)


def clear_development_data(db: Session):
    """Safely delete all synthetic development data marked with is_test_data == True."""
    check_safety_guard()

    print("\n========================================================")
    print("  NAMMA CONNECT V2 — SAFE TEST DATA CLEANUP")
    print("========================================================")

    # 1. Delete dependent child records first
    deleted_reviews = db.query(Review).filter(Review.is_test_data == True).delete(synchronize_session=False)
    deleted_payments = db.query(Payment).filter(Payment.is_test_data == True).delete(synchronize_session=False)
    deleted_bookings = db.query(Booking).filter(Booking.is_test_data == True).delete(synchronize_session=False)
    deleted_notifications = db.query(Notification).filter(Notification.is_test_data == True).delete(synchronize_session=False)
    deleted_support = db.query(SupportTicket).filter(SupportTicket.is_test_data == True).delete(synchronize_session=False)
    deleted_saved = db.query(SavedService).filter(SavedService.is_test_data == True).delete(synchronize_session=False)
    
    # 2. Delete services and applications
    deleted_services = db.query(Service).filter(Service.is_test_data == True).delete(synchronize_session=False)
    deleted_apps = db.query(PartnerApplication).filter(PartnerApplication.is_test_data == True).delete(synchronize_session=False)
    deleted_creators = db.query(CreatorProfile).filter(CreatorProfile.is_test_data == True).delete(synchronize_session=False)

    # 3. Delete synthetic users
    deleted_users = db.query(User).filter(User.is_test_data == True).delete(synchronize_session=False)

    db.commit()

    print(f"  Deleted Synthetic Reviews:           {deleted_reviews}")
    print(f"  Deleted Synthetic Payments:          {deleted_payments}")
    print(f"  Deleted Synthetic Bookings:          {deleted_bookings}")
    print(f"  Deleted Synthetic Notifications:     {deleted_notifications}")
    print(f"  Deleted Synthetic Support Tickets:   {deleted_support}")
    print(f"  Deleted Synthetic Saved Services:    {deleted_saved}")
    print(f"  Deleted Synthetic Services:          {deleted_services}")
    print(f"  Deleted Synthetic Partner Apps:      {deleted_apps}")
    print(f"  Deleted Synthetic Creator Profiles:  {deleted_creators}")
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
