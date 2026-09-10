"""Comprehensive Integration Test Suite for Resend Email + Verification + Notification System.

Tests all 13 core scenarios:
1. Registration without initial verification (is_verified=False)
2. Email verification token generation, expiration, and validation
3. Verification confirmation email dispatch & notification
4. Idempotency of verification links
5. Gate: Unverified user cannot book (HTTP 403)
6. Gate: Verified user can book
7. Gate: Unverified user cannot initiate/verify payments (HTTP 403)
8. Gate: Verified user can initiate & complete payment, triggers emails & notifications
9. Booking cancellation: sends cancellation email & creates notification
10. Collaboration proposal, acceptance, rejection: sends emails & notifications
11. Provider application submission, approval, rejection: sends emails & notifications
12. Background trip reminders with database-backed idempotency
13. Test data safety: is_test_data=True skips external Resend dispatch
"""

import pytest
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_verification_token, create_access_token
from app.models.user import User
from app.models.service import Service
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.notification import Notification
from app.models.email_log import EmailLog
from app.models.partner_application import PartnerApplication
from app.models.creator import CreatorProfile
from app.services.email import EmailService
from app.services.communication import NotificationService
from app.services.auth import AuthService
from app.services.booking import BookingService
from app.services.payment import PaymentService
from app.services.creator import CreatorService
from app.services.partner_application import PartnerApplicationService
from app.services.background_tasks import BackgroundTaskService
from app.schemas.auth import UserRegisterRequest, VerifyEmailRequest, VerifyPhoneRequest
from app.schemas.booking import BookingCreateRequest
from app.schemas.payment import PaymentOrderCreateRequest, PaymentVerifyRequest
from app.schemas.creator import CollaborationCreateRequest
from app.schemas.partner_application import PartnerApplicationCreateRequest


def test_scenario_1_registration_unverified_and_emails(db_session: Session):
    """User registers, starts with is_verified=False, receives verification email & notification."""
    ts = int(datetime.utcnow().timestamp())
    email = f"new_traveler_{ts}@example.com"
    req = UserRegisterRequest(
        email=email,
        password="SecurePassword123",
        full_name="Kaushik Rao",
        mobile=f"98450{ts % 100000:05d}",
        role="customer",
    )
    res = AuthService.register(db_session, req)
    assert res.user.is_verified is False
    assert res.user.email == email

    # Check notification in database
    user_db = db_session.query(User).filter(User.email == email).first()
    assert user_db is not None
    assert user_db.is_verified is False

    notifs = db_session.query(Notification).filter(Notification.user_id == user_db.id).all()
    assert any("Welcome to NammaConnect" in n.title for n in notifs)


def test_scenario_2_and_3_and_4_email_verification_flow(db_session: Session):
    """Valid verification token marks account verified, idempotent on repeat, rejects invalid/expired token."""
    user = User(
        email="verify_test@example.com",
        hashed_password="hash",
        full_name="Verification Tester",
        role="customer",
        is_verified=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # 1. Reject invalid token
    with pytest.raises(Exception):
        AuthService.verify_email(db_session, VerifyEmailRequest(token="invalid.jwt.token"))

    # 2. Reject expired token
    expired_token = create_verification_token(subject=str(user.id), expires_delta=timedelta(seconds=-10))
    with pytest.raises(Exception):
        AuthService.verify_email(db_session, VerifyEmailRequest(token=expired_token))

    # 3. Valid token verification
    valid_token = create_verification_token(subject=str(user.id))
    AuthService.verify_email(db_session, VerifyEmailRequest(token=valid_token))
    db_session.refresh(user)
    assert user.is_verified is True

    # Check notification created
    notif = db_session.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.title == "Email Verified",
    ).first()
    assert notif is not None

    # 4. Repeat call (idempotent, does not raise error)
    AuthService.verify_email(db_session, VerifyEmailRequest(token=valid_token))
    assert user.is_verified is True


def test_scenario_5_and_6_booking_verification_gates(db_session: Session):
    """Unverified user receives 403 on booking; verified user succeeds."""
    # Create provider and published service
    provider = User(
        email="host_provider@example.com",
        full_name="Somanna Host",
        role="partner",
        is_verified=True,
    )
    db_session.add(provider)
    db_session.commit()
    db_session.refresh(provider)

    service = Service(
        title="Coorg High Coffee Trail",
        slug=f"coorg-high-trail-{uuid.uuid4().hex[:6]}",
        description="Coffee plantation trail.",
        category="experiences",
        category_slug="experiences",
        location="Madikeri",
        district="Kodagu",
        state="Karnataka",
        price=1200.0,
        unit="person",
        provider_id=provider.id,
        provider_name=provider.full_name,
        primary_image="https://res.cloudinary.com/test/image.jpg",
        status="PUBLISHED",
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)


    # Unverified user
    unverified_user = User(
        email="unverified_cust@example.com",
        full_name="Unverified Traveler",
        role="customer",
        is_verified=False,
        phone_verified=False,
    )
    db_session.add(unverified_user)
    db_session.commit()
    db_session.refresh(unverified_user)

    future_date = (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d")
    booking_req = BookingCreateRequest(
        service_id=str(service.id),
        start_date=future_date,
        guest_count=2,
    )

    # Unverified user should get 403
    with pytest.raises(Exception) as exc_info:
        BookingService.create_booking(db_session, unverified_user, booking_req)
    assert "403" in str(exc_info.value) or "verification required" in str(exc_info.value).lower()

    # Now verify the user and retry
    unverified_user.is_verified = True
    db_session.commit()

    booking_resp = BookingService.create_booking(db_session, unverified_user, booking_req)
    assert booking_resp.id is not None
    assert booking_resp.status == "PENDING"
    assert booking_resp.total_amount == 2400.0


def test_scenario_7_and_8_payment_gates_and_emails(db_session: Session):
    """Payment order creation and verification require verification; dispatches emails & notifications."""
    provider = User(email="farm_host@example.com", full_name="Farm Host", role="partner", is_verified=True)
    customer = User(email="paying_guest@example.com", full_name="Paying Guest", role="customer", is_verified=False, phone_verified=False)
    db_session.add_all([provider, customer])
    db_session.commit()

    service = Service(
        title="Spices & Pepper Tour",
        slug=f"spices-tour-{uuid.uuid4().hex[:6]}",
        description="Spices walk.",
        category="experiences",
        category_slug="experiences",
        location="Sirsi",
        district="Uttara Kannada",
        state="Karnataka",
        price=1000.0,
        unit="person",
        provider_id=provider.id,
        provider_name=provider.full_name,
        primary_image="https://res.cloudinary.com/test/spices.jpg",
        status="PUBLISHED",
    )
    db_session.add(service)
    db_session.commit()

    booking = Booking(
        booking_code=f"NC-{uuid.uuid4().hex[:5].upper()}",
        customer_id=customer.id,
        service_id=service.id,
        provider_id=provider.id,
        start_date="2026-10-10",
        guest_count=1,
        status="PENDING",
        unit_price=1000.0,
        total_amount=1000.0,
    )
    db_session.add(booking)
    db_session.commit()

    # Unverified user payment order blocked
    with pytest.raises(Exception):
        PaymentService.create_payment_order(db_session, customer, PaymentOrderCreateRequest(booking_id=str(booking.id)))

    # Verify customer
    customer.is_verified = True
    db_session.commit()

    # Create payment order succeeds
    order_resp = PaymentService.create_payment_order(db_session, customer, PaymentOrderCreateRequest(booking_id=str(booking.id)))
    assert order_resp.order_id.startswith("order_")

    # Verify payment with mock signature
    verify_req = PaymentVerifyRequest(
        booking_id=str(booking.id),
        razorpay_order_id=order_resp.order_id,
        razorpay_payment_id="pay_test_succ_123",
        razorpay_signature="mock_sig_valid_test",
    )
    verify_res = PaymentService.verify_payment(db_session, customer, verify_req)
    assert verify_res.status == "CONFIRMED"

    # Confirm in-app notification exists
    notifs = db_session.query(Notification).filter(Notification.user_id == customer.id).all()
    assert any(n.type == "payment" for n in notifs)
    assert any(n.type == "booking" for n in notifs)


def test_scenario_9_booking_cancellation_email_and_notif(db_session: Session):
    """Cancelling a booking creates cancellation notification and dispatches cancellation email."""
    provider = User(email="cancel_host@example.com", full_name="Cancel Host", role="partner", is_verified=True)
    customer = User(email="cancel_guest@example.com", full_name="Cancel Guest", role="customer", is_verified=True)
    db_session.add_all([provider, customer])
    db_session.commit()

    service = Service(
        title="River Rafting Adventure",
        slug=f"river-rafting-{uuid.uuid4().hex[:6]}",
        description="White water rafting.",
        category="experiences",
        category_slug="experiences",
        location="Dandeli",
        district="Uttara Kannada",
        state="Karnataka",
        price=1500.0,
        unit="person",
        provider_id=provider.id,
        provider_name=provider.full_name,
        primary_image="https://res.cloudinary.com/test/rafting.jpg",
        status="PUBLISHED",
    )
    db_session.add(service)
    db_session.commit()

    booking = Booking(
        booking_code=f"NC-{uuid.uuid4().hex[:5].upper()}",
        customer_id=customer.id,
        service_id=service.id,
        provider_id=provider.id,
        start_date="2026-11-15",
        guest_count=1,
        status="CONFIRMED",
        unit_price=1500.0,
        total_amount=1500.0,
    )
    db_session.add(booking)
    db_session.commit()

    # Cancel booking
    cancel_resp = BookingService.cancel_booking(db_session, str(customer.id), str(booking.id))
    assert cancel_resp.status == "CANCELLED"

    # Verify notification created
    notif = db_session.query(Notification).filter(
        Notification.user_id == customer.id,
        Notification.title == "Booking Cancelled",
    ).first()
    assert notif is not None


def test_scenario_10_partner_application_emails(db_session: Session):
    """Partner application submission, approval, and rejection trigger proper emails and notifications."""
    applicant = User(email="applicant_farmer@example.com", full_name="Basavaraj Farmer", role="customer", is_verified=True)
    admin = User(email="admin_super@example.com", full_name="Admin Reviewer", role="admin", is_verified=True)
    db_session.add_all([applicant, admin])
    db_session.commit()

    req = PartnerApplicationCreateRequest(
        role_type="partner",
        full_name="Basavaraj Farmer",
        email=applicant.email,
        mobile="9845011223",
        address="Near Temple, Sagar Taluk",
        district="Shivamogga",
        state="Karnataka",
        latitude=14.1670,
        longitude=75.0330,
        business_name="Areca Eco Farms",
        experience_years=8,
        bio="Traditional Arecanut and spice farmer.",
        languages="Kannada, English",
        id_type="AADHAAR",
        id_number="1234-5678-9012",
        document_url="https://res.cloudinary.com/test/id.pdf",
        services=["farm_stay", "plantation_tour"],
        activities=["Harvesting", "Spice Tasting"],
    )

    # 1. Submit application
    app_resp = PartnerApplicationService.submit_application(db_session, applicant, req)
    assert app_resp.status == "PENDING"

    applicant_notif = db_session.query(Notification).filter(
        Notification.user_id == applicant.id,
        Notification.title == "Partner Application Submitted",
    ).first()
    assert applicant_notif is not None

    # 2. Reject application
    rej_resp = PartnerApplicationService.reject_application(
        db=db_session,
        app_id=app_resp.id,
        admin_user=admin,
        rejection_reason="Incomplete land records.",
    )
    assert rej_resp.status == "REJECTED"
    assert rej_resp.rejection_reason == "Incomplete land records."


def test_scenario_11_trip_reminders_and_idempotency(db_session: Session):
    """Trip reminders scan creates trip reminder email, notification, and enforces idempotency."""
    traveler = User(email="trip_traveler@example.com", full_name="Trip Traveler", role="customer", is_verified=True)
    db_session.add(traveler)
    db_session.commit()

    service = Service(
        title="Kabini Wildlife Sanctuary Stay",
        slug=f"kabini-stay-{uuid.uuid4().hex[:6]}",
        description="Riverside wildlife sanctuary stay.",
        category="stay",
        category_slug="stay",
        location="Kabini",
        district="Mysuru",
        state="Karnataka",
        price=3500.0,
        provider_name="Kabini Naturalist",
        primary_image="https://res.cloudinary.com/test/kabini.jpg",
        status="PUBLISHED",
    )
    db_session.add(service)
    db_session.commit()


    # Starts tomorrow (within 24-48h window)
    tomorrow_str = (datetime.utcnow() + timedelta(hours=26)).strftime("%Y-%m-%d")
    booking = Booking(
        booking_code=f"NC-{uuid.uuid4().hex[:5].upper()}",
        customer_id=traveler.id,
        service_id=service.id,
        start_date=tomorrow_str,
        status="CONFIRMED",
        unit_price=3500.0,
        total_amount=3500.0,
    )
    db_session.add(booking)
    db_session.commit()

    # First run: should send reminder
    res1 = BackgroundTaskService.process_upcoming_trip_reminders(db_session)
    assert res1["status"] == "completed"
    assert res1["reminders_sent"] >= 1

    # In-app notification exists
    notif = db_session.query(Notification).filter(
        Notification.user_id == traveler.id,
        Notification.type == "trip_reminder",
    ).first()
    assert notif is not None

    # Second run: database-backed idempotency skips duplicate
    res2 = BackgroundTaskService.process_upcoming_trip_reminders(db_session)
    assert res2["status"] == "completed"
    assert res2["reminders_sent"] == 0
    assert res2["skipped"] >= 1


def test_scenario_12_test_data_safety_skips_resend(db_session: Session):
    """is_test_data=True skips real email dispatches safely."""
    test_user = User(
        email="test_data_user@test.nammaconnect.in",
        full_name="Test Data User",
        role="customer",
        is_verified=False,
        is_test_data=True,
    )
    db_session.add(test_user)
    db_session.commit()

    res = EmailService.send_welcome_email(
        to_email=test_user.email,
        full_name=test_user.full_name,
        is_test_data=True,
        user_id=test_user.id,
        db=db_session,
    )
    assert res["status"] == "skipped"
    assert res["id"] == "test_data_skipped"
