"""Comprehensive unit & integration test suite for Namma Connect V2 Modular Monolith layers."""

import pytest
import uuid
import json
from decimal import Decimal
from datetime import date, timedelta, datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.modules.user.domain.models import User
from app.modules.marketplace.domain.models import MarketplaceCategory, Service, ServiceAvailability
from app.modules.provider.domain.models import PartnerApplication
from app.modules.booking.domain.models import Booking
from app.modules.payment.domain.models import Payment, Refund, Payout
from app.modules.review.domain.models import Review
from app.modules.notification.domain.models import Notification
from app.modules.messaging.domain.models import Conversation, Message
from app.modules.trip.domain.models import Trip, TripDay, TripItem
from app.modules.recommendation.domain.models import UserInteraction, RecommendationResult
from app.modules.ai.domain.models import AIConversation, AIMessage
from app.modules.analytics.domain.models import NCScoreSnapshot, ProviderDailyMetrics
from app.modules.support.domain.models import SupportTicket
from app.modules.admin.domain.models import PlatformSetting

# Repositories & Services
from app.modules.auth.infrastructure.repository import AuthRepository
from app.modules.auth.application.service import AuthService
from app.modules.user.infrastructure.repository import UserRepository
from app.modules.user.application.service import UserService
from app.modules.provider.infrastructure.repository import ProviderRepository
from app.modules.provider.application.service import ProviderService
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.marketplace.application.service import MarketplaceService
from app.modules.booking.infrastructure.repository import BookingRepository
from app.modules.booking.application.service import BookingService
from app.modules.payment.infrastructure.repository import PaymentRepository
from app.modules.payment.application.service import PaymentService
from app.modules.review.infrastructure.repository import ReviewRepository
from app.modules.review.application.service import ReviewService
from app.modules.notification.infrastructure.repository import NotificationRepository
from app.modules.notification.application.service import NotificationService
from app.modules.messaging.infrastructure.repository import MessagingRepository
from app.modules.messaging.application.service import MessagingService
from app.modules.trip.infrastructure.repository import TripRepository
from app.modules.trip.application.service import TripService
from app.modules.recommendation.infrastructure.repository import RecommendationRepository
from app.modules.recommendation.application.service import RecommendationService
from app.modules.ai.infrastructure.repository import AIRepository
from app.modules.ai.application.service import AIService
from app.modules.analytics.infrastructure.repository import AnalyticsRepository
from app.modules.analytics.application.service import AnalyticsService
from app.modules.support.infrastructure.repository import SupportRepository
from app.modules.support.application.service import SupportService
from app.modules.admin.infrastructure.repository import AdminRepository
from app.modules.admin.application.service import AdminService

# Presentation Schemas
from app.modules.auth.presentation.schemas import RegisterRequest, LoginRequest
from app.modules.user.presentation.schemas import UserProfileUpdateRequest
from app.modules.provider.presentation.schemas import PartnerApplicationCreate
from app.modules.marketplace.presentation.schemas import ServiceCreateRequest, ServiceUpdateRequest
from app.modules.booking.presentation.schemas import BookingCreateRequest
from app.modules.payment.presentation.schemas import CreateOrderRequest, VerifyPaymentRequest, RefundRequest, CreatePayoutRequest
from app.modules.review.presentation.schemas import ReviewCreateRequest
from app.modules.messaging.presentation.schemas import SendMessageRequest
from app.modules.trip.presentation.schemas import TripCreateRequest, TripItemCreateRequest
from app.modules.recommendation.presentation.schemas import RecordInteractionRequest
from app.modules.ai.presentation.schemas import CreateAIConversationRequest, SendAIMessageRequest
from app.modules.support.presentation.schemas import CreateTicketRequest, UpdateTicketStatusRequest
from app.modules.admin.presentation.schemas import PlatformSettingRequest
from app.api.v2.router import api_v2_router


@pytest.fixture
def db_session():
    """In-memory SQLite database session fixture for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = Session()

    # Pre-seed a permanent category
    cat = MarketplaceCategory(
        slug="farm-stays",
        name="Farm Stays",
        marketplace_type="STAY",
        description="Authentic farm stay cottages",
        sort_order=1,
        is_active=True,
    )
    session.add(cat)
    session.commit()

    try:
        yield session
    finally:
        session.close()


def test_auth_and_user_service_lifecycle(db_session):
    """Test user registration, authentication, token issuance, and profile update."""
    auth_repo = AuthRepository(db_session)
    user_repo = UserRepository(db_session)
    auth_service = AuthService(auth_repo)
    user_service = UserService(user_repo)

    # 1. Register User
    reg_payload = RegisterRequest(
        email="farmer.ravi@example.com",
        password="SecurePassword123!",
        full_name="Ravi Gowda",
        mobile="+919876543210",
        role="PARTNER",
    )
    reg_res = auth_service.register(reg_payload)
    assert reg_res["user"]["email"] == "farmer.ravi@example.com"
    assert "access_token" in reg_res

    # 2. Login
    login_payload = LoginRequest(
        email="farmer.ravi@example.com",
        password="SecurePassword123!",
    )
    login_res = auth_service.login(login_payload)
    assert login_res["access_token"] is not None

    # 3. Update Profile
    user = auth_repo.get_by_email("farmer.ravi@example.com")
    assert user is not None
    update_payload = UserProfileUpdateRequest(
        bio="Experienced organic coffee and spice planter in Coorg.",
        district="Kodagu",
    )
    updated_user = user_service.update_profile(user, update_payload)
    assert updated_user["bio"] == "Experienced organic coffee and spice planter in Coorg."



def test_provider_partner_application_flow(db_session):
    """Test partner onboarding application submission."""
    provider_repo = ProviderRepository(db_session)
    provider_service = ProviderService(provider_repo)

    applicant = User(
        email="applicant@example.com",
        hashed_password="hash",
        full_name="Applicant Ramesh",
        role="CUSTOMER",
        is_active=True,
    )
    db_session.add(applicant)
    db_session.commit()

    # Submit partner application
    app_payload = PartnerApplicationCreate(
        full_name="Applicant Ramesh",
        email="applicant@example.com",
        mobile="+919888877777",
        address="Coffee Estate Road",
        district="Chikkamagaluru",
        state="Karnataka",
        business_name="Ramesh Organic Agro Estate",
        id_type="Aadhaar",
        id_number="123456789012",
    )
    app_res = provider_service.submit_application(applicant, app_payload)
    assert app_res["business_name"] == "Ramesh Organic Agro Estate"
    assert app_res["status"] == "PENDING"


def test_marketplace_and_booking_lifecycle(db_session):
    """Test service listing creation, search, self-booking guard, price calculation, and status progression."""
    marketplace_repo = MarketplaceRepository(db_session)
    booking_repo = BookingRepository(db_session)
    marketplace_service = MarketplaceService(marketplace_repo)
    booking_service = BookingService(booking_repo, marketplace_repo)

    host = User(
        email="host@farm.com",
        hashed_password="hash",
        full_name="Suresh Kumar",
        role="PROVIDER",
        is_active=True,
    )
    traveler = User(
        email="traveler@travel.com",
        hashed_password="hash",
        full_name="Priya Sharma",
        role="CUSTOMER",
        is_active=True,
    )
    db_session.add_all([host, traveler])
    db_session.commit()

    # 1. Create Service
    service_payload = ServiceCreateRequest(
        title="Heritage Arecanut Plantation Stay",
        description="Stay in a 100-year-old heritage estate with farm trails and fresh Malnad meals.",
        category_slug="farm-stays",
        location="Thirthahalli",
        district="Shivamogga",
        state="Karnataka",
        price=2500.0,
        unit="night",
        max_capacity=6,
        primary_image="https://res.cloudinary.com/demo/image/upload/sample.jpg",
    )
    created_service = marketplace_service.create_service(host, service_payload)
    assert created_service["title"] == "Heritage Arecanut Plantation Stay"
    assert created_service["price"] == 2500.0

    # Publish service for booking
    svc_entity = marketplace_repo.get_service_by_id(created_service["id"])
    svc_entity.status = "PUBLISHED"
    marketplace_repo.save_service(svc_entity)

    # 2. Self-booking Prevention Guard
    with pytest.raises(Exception) as excinfo:
        booking_service.create_booking(
            user=host,
            payload=BookingCreateRequest(
                service_id=created_service["id"],
                start_date=date.today() + timedelta(days=2),
                end_date=date.today() + timedelta(days=4),
                guests_count=2,
            ),
        )
    assert "cannot book your own" in str(excinfo.value).lower()

    # 3. Valid Booking Creation
    booking_payload = BookingCreateRequest(
        service_id=created_service["id"],
        start_date=date.today() + timedelta(days=5),
        end_date=date.today() + timedelta(days=7),  # 2 days
        guests_count=2,  # 2 guests
        special_requests="Vegetarian Malnad dinner requested",
    )
    booking_res = booking_service.create_booking(traveler, booking_payload)
    assert booking_res["unit_price"] == 2500.0
    # total_price = 2500 * 2 guests = 5000.0 (or full stay total)
    assert booking_res["final_amount"] == 10800.0
    assert booking_res["status"] == "PENDING"


def test_payment_and_refund_lifecycle(db_session):
    """Test Razorpay order generation, signature verification, and automated refund processing."""
    booking_repo = BookingRepository(db_session)
    payment_repo = PaymentRepository(db_session)
    payment_service = PaymentService(payment_repo, booking_repo)

    user = User(
        email="customer@example.com",
        hashed_password="hash",
        full_name="Aditi Rao",
        role="CUSTOMER",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    # Pre-seed confirmed booking
    booking = Booking(
        booking_code="NC-20260915-TEST01",
        customer_id=user.id,
        service_id=uuid.uuid4(),
        provider_id=uuid.uuid4(),
        start_date="2026-09-20",
        end_date="2026-09-22",
        guest_count=1,
        unit_price=Decimal("1500.00"),
        total_amount=Decimal("3240.00"),
        status="PENDING",
    )
    db_session.add(booking)
    db_session.commit()

    # 1. Create Payment Order
    order_res = payment_service.create_order(user, CreateOrderRequest(booking_id=str(booking.id)))
    assert order_res["amount"] == 3240.0
    assert order_res["currency"] == "INR"
    assert order_res["payment_id"] is not None

    # 2. Verify Payment
    verify_res = payment_service.verify_payment(
        user,
        VerifyPaymentRequest(
            payment_id=order_res["payment_id"],
            gateway_payment_id="pay_mock_12345",
            gateway_order_id=order_res["gateway_order_id"],
            gateway_signature="mock_sig_valid",
        ),
    )
    assert verify_res["status"] == "PAID"


    # Check booking transitioned to CONFIRMED
    db_session.refresh(booking)
    assert booking.status == "CONFIRMED"

    # 3. Process Refund
    refund_res = payment_service.process_refund(
        user,
        RefundRequest(
            payment_id=order_res["payment_id"],
            reason="Unforeseen personal emergency",
        ),
    )
    assert refund_res["status"] == "PROCESSED"
    assert refund_res["amount"] == 3240.0

    db_session.refresh(booking)
    assert booking.status == "CANCELLED"


def test_review_and_rating_aggregation(db_session):
    """Test review creation and automatic service rating calculation."""
    review_repo = ReviewRepository(db_session)
    marketplace_repo = MarketplaceRepository(db_session)
    booking_repo = BookingRepository(db_session)
    review_service = ReviewService(review_repo, marketplace_repo, booking_repo)

    user1 = User(email="u1@test.com", hashed_password="h", full_name="User One", role="CUSTOMER", is_active=True)
    user2 = User(email="u2@test.com", hashed_password="h", full_name="User Two", role="CUSTOMER", is_active=True)
    provider = User(email="p@test.com", hashed_password="h", full_name="Provider", role="PROVIDER", is_active=True)
    db_session.add_all([user1, user2, provider])
    db_session.commit()

    service = Service(
        title="Spices Trail & Homestay",
        slug="spices-trail-homestay",
        description="Fresh organic spices estate stay",
        category="Farm Stays",
        category_slug="farm-stays",
        marketplace_type="STAY",
        location="Madikeri",
        district="Kodagu",
        price=1000.0,
        provider_id=provider.id,
        provider_name=provider.full_name,
        primary_image="img.jpg",
        rating=0.0,
        reviews_count=0,
        status="PUBLISHED",
    )
    db_session.add(service)
    db_session.commit()

    # User 1 rates 5 stars
    review_service.create_review(
        user1,
        ReviewCreateRequest(
            service_id=str(service.id),
            rating=5,
            comment="Incredible hospitality and authentic filter coffee!",
        ),
    )

    db_session.refresh(service)
    assert service.rating == 5.0
    assert service.reviews_count == 1

    # User 2 rates 4 stars
    review_service.create_review(
        user2,
        ReviewCreateRequest(
            service_id=str(service.id),
            rating=4,
            comment="Wonderful peaceful stay among the plantations.",
        ),
    )

    db_session.refresh(service)
    # Average of 5 and 4 = 4.5
    assert service.rating == 4.5
    assert service.reviews_count == 2


def test_communication_messaging_and_notifications(db_session):
    """Test user-to-provider messaging and in-app notifications."""
    notif_repo = NotificationRepository(db_session)
    notif_service = NotificationService(notif_repo)
    msg_repo = MessagingRepository(db_session)
    msg_service = MessagingService(msg_repo)

    user = User(email="guest@test.com", hashed_password="h", full_name="Guest User", role="CUSTOMER", is_active=True)
    host = User(email="host@test.com", hashed_password="h", full_name="Host User", role="PROVIDER", is_active=True)
    db_session.add_all([user, host])
    db_session.commit()

    # Notification Test
    notif = notif_service.create_notification(
        user_id=user.id,
        title="Harvest Season Alert",
        message="Coffee harvest festival begins next weekend in Coorg!",
    )
    assert notif["title"] == "Harvest Season Alert"
    assert notif_service.get_unread_count(user.id) == 1

    notif_service.mark_as_read(user.id, notif["id"])
    assert notif_service.get_unread_count(user.id) == 0

    # Messaging Test
    msg = msg_service.send_message(
        sender=user,
        payload=SendMessageRequest(
            receiver_id=str(host.id),
            content="Hello, is dinner included with the estate package?",
        ),
    )
    assert msg["content"] == "Hello, is dinner included with the estate package?"
    assert msg["sender_id"] == str(user.id)

    convs = msg_service.list_conversations(user)
    assert convs["total"] == 1


def test_trip_and_itinerary_planning(db_session):
    """Test multi-day trip creation, day generation, and activity item management."""
    trip_repo = TripRepository(db_session)
    trip_service = TripService(trip_repo)

    user = User(email="trip.planner@example.com", hashed_password="h", full_name="Planner", role="CUSTOMER", is_active=True)
    db_session.add(user)
    db_session.commit()

    start = date.today() + timedelta(days=10)
    end = start + timedelta(days=2)  # 3 days total

    trip = trip_service.create_trip(
        user,
        TripCreateRequest(
            title="Monsoon Western Ghats Explorer",
            start_date=start,
            end_date=end,
            destination_district="Chikkamagaluru",
            notes="Trekking and estate stays",
        ),
    )
    assert trip["title"] == "Monsoon Western Ghats Explorer"
    assert len(trip["days"]) == 3

    # Add item to day 1
    day1_id = trip["days"][0]["id"]
    item = trip_service.add_trip_item(
        user,
        trip["id"],
        TripItemCreateRequest(
            trip_day_id=day1_id,
            title="Mullayanagiri Sunrise Trek",
            category="Trek",
            start_time="06:00 AM",
            end_time="10:00 AM",
        ),
    )
    assert item["title"] == "Mullayanagiri Sunrise Trek"


def test_admin_settings_and_analytics(db_session):
    """Test admin configuration parameters and platform analytics summaries."""
    admin_repo = AdminRepository(db_session)
    admin_service = AdminService(admin_repo)
    analytics_repo = AnalyticsRepository(db_session)
    analytics_service = AnalyticsService(analytics_repo)

    admin = User(email="superadmin@nammaconnect.in", hashed_password="h", full_name="Admin", role="ADMIN", is_active=True)
    provider = User(email="top.farmer@test.com", hashed_password="h", full_name="Top Farmer", role="PROVIDER", is_active=True)
    db_session.add_all([admin, provider])
    db_session.commit()

    # Pre-seed NC Score Snapshot
    snap = NCScoreSnapshot(
        provider_id=provider.id,
        score=92.50,
        component_json=json.dumps({"reputation": 95.0, "engagement": 90.0, "reliability": 92.5}),
        model_version="v2.0.0",
        calculated_at=datetime.utcnow(),
    )
    db_session.add(snap)
    db_session.commit()

    # 1. Admin Setting
    setting = admin_service.set_setting(
        admin,
        PlatformSettingRequest(
            key="PLATFORM_COMMISSION_PERCENTAGE",
            value_json='{"commission": 3.0, "tax_gst": 5.0}',
            description="Platform standard commission and GST rate",
        ),
    )
    assert setting["key"] == "PLATFORM_COMMISSION_PERCENTAGE"

    # 2. Analytics Summary
    summary = analytics_service.get_provider_summary(provider)
    assert summary["nc_score"] is not None
    assert summary["nc_score"]["score"] == 92.5


def test_api_v2_router_mounting():
    """Verify all V2 modular routes are registered in the application router."""
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(api_v2_router, prefix="/api/v2")

    schema = app.openapi()
    routes_set = set(schema.get("paths", {}).keys())

    assert "/api/v2/auth/register" in routes_set
    assert "/api/v2/auth/login" in routes_set
    assert "/api/v2/users/me" in routes_set
    assert "/api/v2/partner-applications" in routes_set
    assert "/api/v2/categories" in routes_set

    assert "/api/v2/services" in routes_set
    assert "/api/v2/search" in routes_set
    assert "/api/v2/saved" in routes_set
    assert "/api/v2/bookings" in routes_set
    assert "/api/v2/payments/create-order" in routes_set
    assert "/api/v2/payments/verify" in routes_set
    assert "/api/v2/reviews" in routes_set
    assert "/api/v2/notifications" in routes_set
    assert "/api/v2/messages" in routes_set
    assert "/api/v2/trips" in routes_set
    assert "/api/v2/recommendations" in routes_set
    assert "/api/v2/ai/conversations" in routes_set
    assert "/api/v2/analytics/provider/summary" in routes_set
    assert "/api/v2/support/tickets" in routes_set
    assert "/api/v2/admin/overview" in routes_set
    assert "/api/v2/admin/settings" in routes_set
