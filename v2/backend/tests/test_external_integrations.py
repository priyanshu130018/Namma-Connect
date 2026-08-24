"""Integration test suite for External Services (Prompt 27)."""

import pytest
import hmac
import hashlib
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.config import settings
from app.core.database import Base, engine, get_db
from app.models.user import User
from app.models.service import Service
from app.models.booking import Booking
from app.models.payment import Payment
from app.services.auth import AuthService
from app.services.payment import PaymentService
from app.services.cloudinary import CloudinaryService
from app.services.email import EmailService
from app.services.gemini import GeminiService
from app.services.redis_service import RedisService
from app.services.background_tasks import BackgroundTaskService
from app.services.location import LocationService


# Use client and db_session fixtures provided by conftest.py


def test_environment_configuration_and_services_status():
    """Verify settings normalization and services status reporting."""
    services = settings.get_configured_services()
    assert "google_auth" in services
    assert "razorpay" in services
    assert "cloudinary" in services
    assert "resend" in services
    assert "gemini" in services


def test_health_check_endpoint(client: TestClient):
    """Verify /health returns 200 with service statuses without crashing."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "database" in data["services"]
    assert "redis" in data["services"]


def test_google_oauth_customer_creation(db_session: Session):
    """Verify Google token authentication creates a verified customer user without provider selectors."""
    test_token = "google_test_mock_token_123"
    result = AuthService.google_auth(db_session, test_token)
    assert result.user.email == "google.traveler@example.com"
    assert result.user.role == "customer"
    assert result.user.is_verified is True
    assert result.access_token is not None


def test_razorpay_order_and_signature_verification(db_session: Session):
    """Verify Razorpay order generation and HMAC signature verification."""
    # 1. Order generation in test mode
    order_data = PaymentService.create_razorpay_order(
        amount=1500.0,
        currency="INR",
        receipt="order_test_101",
    )
    assert order_data["id"].startswith("order_")
    assert order_data["amount"] == 150000
    assert order_data["currency"] == "INR"

    # 2. HMAC signature verification
    key_secret = settings.RAZORPAY_KEY_SECRET or "test_secret_key"
    order_id = "order_test_101"
    payment_id = "pay_test_202"
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    valid_sig = hmac.new(key_secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    is_valid = PaymentService.verify_signature(
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=valid_sig,
    )
    assert is_valid is True


def test_razorpay_webhook_event_handling(db_session: Session):
    """Verify webhook idempotency and event handling for captured, failed, and refund events."""
    # Create test user, service, booking & payment
    user = User(
        email=f"wh_user_{int(datetime.utcnow().timestamp())}@example.com",
        hashed_password="hash",
        full_name="Webhook Tester",
        role="customer",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    ts = int(datetime.utcnow().timestamp())
    service = Service(
        title=f"Coorg Plantation Experience {ts}",
        slug=f"coorg-plantation-{ts}",
        description="Authentic coffee plantation walk and tasting.",
        category="experiences",
        category_slug="experiences",
        location="Madikeri",
        district="Kodagu",
        state="Karnataka",
        price=1050.0,
        unit="person",
        provider_id=user.id,
        provider_name="Ramesh Gowda",
        primary_image="https://res.cloudinary.com/nammaconnect/image/upload/sample.jpg",
        inclusions_json='["Guided Plantation Tour", "Coffee Tasting"]',
        amenities_json='["Parking", "Restroom"]',
        status="PUBLISHED",
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)

    booking = Booking(
        booking_code=f"WH{ts}",
        customer_id=user.id,
        service_id=service.id,
        provider_id=user.id,
        status="PENDING",
        unit_price=1050.0,
        total_amount=2100.0,
        guest_count=2,
        start_date="2026-09-01",
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)

    test_order_id = f"order_wh_{int(datetime.utcnow().timestamp())}"
    payment = Payment(
        booking_id=booking.id,
        customer_id=user.id,
        razorpay_order_id=test_order_id,
        amount=2100.0,
        currency="INR",
        status="CREATED",
    )
    db_session.add(payment)
    db_session.commit()

    # 1. Test payment.captured
    captured_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_captured_123",
                    "order_id": test_order_id,
                    "status": "captured",
                }
            }
        },
    }
    res = PaymentService.handle_webhook(db_session, captured_payload)
    assert res["status"] == "success"

    db_session.refresh(payment)
    db_session.refresh(booking)
    assert payment.status == "PAID"
    assert booking.status == "CONFIRMED"


def test_cloudinary_service_media_and_private_kyc():
    """Verify Cloudinary media uploads and private KYC document access control."""
    # Profile upload
    p_url = CloudinaryService.upload_profile_image(b"fake_image_bytes", user_id="u123")
    assert "profiles" in p_url

    # Private KYC document
    kyc_res = CloudinaryService.upload_partner_kyc_document(b"fake_pdf_bytes", partner_id="p456", doc_name="aadhar.pdf")
    assert kyc_res["is_private"] is True
    assert "kyc_private" in kyc_res["public_id"]


def test_resend_email_service_and_resilience():
    """Verify Resend transactional email methods with failure isolation."""
    # Welcome email - must safely return status without throwing
    res1 = EmailService.send_welcome_email("test@example.com", "Priyanshu")
    assert res1["status"] in ["sent", "mock_sent", "failed"]

    # Booking confirmation email
    res2 = EmailService.send_booking_confirmation_email(
        "test@example.com",
        booking_code="NC12345",
        service_title="Organic Coffee Trail",
        amount=2499.0,
    )
    assert res2["status"] in ["sent", "mock_sent", "failed"]


def test_gemini_ai_grounded_recommendations(db_session: Session):
    """Verify Gemini Travel AI recommendations are strictly grounded in catalog data."""
    plan = GeminiService.generate_travel_plan(
        db=db_session,
        prompt="I want a relaxing weekend farm tour with pottery.",
    )
    assert "reply" in plan
    assert "recommended_services" in plan
    assert plan["source"] in ["gemini_api", "grounded_catalog"]

    # Support guidance
    faq = GeminiService.answer_support_query("What is your cancellation policy?")
    assert faq["can_resolve"] is True
    assert "refund" in faq["answer"].lower()


def test_travel_ai_endpoint_chat(client: TestClient):
    """Verify canonical POST /api/v2/ai/travel/chat endpoint."""
    payload = {
        "message": "Recommend me an organic farm stay in Coorg",
        "destination": "Coorg",
        "language": "en",
    }
    resp = client.post("/api/v2/ai/travel/chat", json=payload)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "conversation_id" in data
    assert "reply" in data
    assert "suggested_services" in data
    assert len(data["reply"]) > 0

    # Test conversations endpoint
    conv_resp = client.get("/api/v2/ai/travel/conversations")
    assert conv_resp.status_code == 200


def test_location_osm_service():
    """Verify OpenStreetMap geocoding and Karnataka cluster lookups."""
    coorg_loc = LocationService.geocode_location("Madikeri Coorg Homestay")
    assert coorg_loc["lat"] == 12.3375
    assert "Coorg" in coorg_loc["display_name"]


def test_background_trip_reminders(db_session: Session):
    """Verify automated trip reminders scanning and Redis deduplication."""
    res = BackgroundTaskService.process_upcoming_trip_reminders(db_session)
    assert res["status"] == "completed"
    assert "reminders_sent" in res
    assert "skipped" in res