"""End-to-End Integration and Production Hardening Test Suite for Namma Connect V2 (Step 9).

Validates the complete product flow:
Frontend Client Contracts → API Router → AI Assistant / Agentic Trip Planner →
Provider Intelligence → Recommendation Engine → Deterministic Conflict Validator →
Authoritative Database Persistence (Trip → TripDay → TripItem + AITripPlan) →
Pre-Booking Checkout Handoff.
"""

import uuid
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.modules.user.domain.models import User
from app.modules.provider.domain.models import PartnerApplication
from app.modules.marketplace.domain.models import MarketplaceCategory, Service, ServiceAvailability
from app.modules.trip.domain.models import Trip, TripDay, TripItem, AITripPlan
from app.modules.ai.domain.models import AIConversation, AIMessage
from app.modules.ai.infrastructure.repository import AIRepository
from app.modules.ai.application.service import AIService
from app.modules.ai.presentation.schemas import (
    CreateAIConversationRequest,
    SendAIMessageRequest,
    GenerateTripPlanRequest,
    RefineTripPlanRequest,
    ConfirmTripPlanRequest,
)
from app.modules.ai.trip_planner.state import PlannerState, PlannerStatus, TravelerConstraints
from app.modules.ai.trip_planner.state_machine import PlannerStateMachine, PlannerStateTransitionError
from app.modules.ai.trip_planner.persistence import TripPersistenceEngine
from app.modules.ai.trip_planner.handoff import BookingHandoffGenerator
from app.modules.provider.intelligence.service import ProviderIntelligenceService
from app.modules.provider.intelligence.adapters.agro_partner import AgroTourismPartnerAdapter
from app.modules.provider.intelligence.types import AvailabilityStatus, CircuitBreakerState


@pytest.fixture
def e2e_db_session():
    """Create in-memory SQLite database session for complete E2E testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # 1. Primary Customer
    traveler = User(
        id=uuid.uuid4(),
        email="praveen@traveler.in",
        hashed_password="hashed_pass_123",
        full_name="Praveen Kumar",
        role="customer",
        is_active=True,
    )
    session.add(traveler)

    # 2. Secondary Customer (for cross-user security checks)
    other_user = User(
        id=uuid.uuid4(),
        email="other@traveler.in",
        hashed_password="hashed_pass_456",
        full_name="Other Traveler",
        role="customer",
        is_active=True,
    )
    session.add(other_user)

    # 3. Verified Host / Provider
    host_user = User(
        id=uuid.uuid4(),
        email="host.kodagu@estate.in",
        hashed_password="hashed_pass_host",
        full_name="Bopanna Machaiah",
        role="provider",
        is_active=True,
    )
    session.add(host_user)

    # 4. Host KYC Application
    partner_app = PartnerApplication(
        id=uuid.uuid4(),
        application_code="APP-KODAGU-E2E",
        user_id=host_user.id,
        full_name="Bopanna Machaiah",
        email="host.kodagu@estate.in",
        mobile="+91 98450 77777",
        address="Kutta Plantation, South Coorg",
        district="Kodagu (Coorg)",
        business_name="Machaiah Organic Plantation",
        role_type="Farmer",
        id_type="Land_RTC",
        id_number="RTC-9988-77",
        status="APPROVED",
    )
    session.add(partner_app)

    # 5. Marketplace Taxonomy Categories
    stay_cat = MarketplaceCategory(id=uuid.uuid4(), name="Stays", slug="stays", is_active=True)
    activity_cat = MarketplaceCategory(id=uuid.uuid4(), name="Activities", slug="activities", is_active=True)
    workshop_cat = MarketplaceCategory(id=uuid.uuid4(), name="Workshops", slug="workshops", is_active=True)
    session.add_all([stay_cat, activity_cat, workshop_cat])
    session.flush()

    # 6. Marketplace Services
    s1 = Service(
        id=uuid.uuid4(),
        provider_id=host_user.id,
        category_id=stay_cat.id,
        category="Stays",
        category_slug="stays",
        title="Organic Cardamom & Coffee Plantation Homestay",
        slug="organic-cardamom-coffee-homestay",
        description="Serene coffee plantation stay near Iruppu falls",
        location="Kutta, Kodagu",
        district="Kodagu (Coorg)",
        state="Karnataka",
        price=3800.0,
        unit="night",
        rating=4.9,
        reviews_count=32,
        duration_hours=24.0,
        max_capacity=8,
        status="PUBLISHED",
        provider_name="Bopanna Machaiah",
        provider_type="Farmer",
        primary_image="/images/services/coorg-stay.jpg",
    )
    s2 = Service(
        id=uuid.uuid4(),
        provider_id=host_user.id,
        category_id=activity_cat.id,
        category="Activities",
        category_slug="activities",
        title="Cauvery River Nature Trail & Kayaking",
        slug="cauvery-river-nature-trail",
        description="Guided river kayaking through riparian forests",
        location="Dubare, Kodagu",
        district="Kodagu (Coorg)",
        state="Karnataka",
        price=1800.0,
        unit="person",
        rating=4.8,
        reviews_count=18,
        duration_hours=3.0,
        max_capacity=12,
        status="PUBLISHED",
        provider_name="Bopanna Machaiah",
        provider_type="Farmer",
        primary_image="/images/services/kayaking.jpg",
    )
    s3 = Service(
        id=uuid.uuid4(),
        provider_id=host_user.id,
        category_id=workshop_cat.id,
        category="Workshops",
        category_slug="workshops",
        title="Traditional Kodava Spice Blending Workshop",
        slug="kodava-spice-blending-workshop",
        description="Learn roast & grind techniques for authentic black pepper & cardamom curry pastes",
        location="Gonikoppa, Kodagu",
        district="Kodagu (Coorg)",
        state="Karnataka",
        price=1200.0,
        unit="person",
        rating=4.95,
        reviews_count=20,
        duration_hours=2.5,
        max_capacity=10,
        status="PUBLISHED",
        provider_name="Bopanna Machaiah",
        provider_type="Farmer",
        primary_image="/images/services/spices.jpg",
    )
    session.add_all([s1, s2, s3])
    session.flush()

    # 7. Slot Availabilities
    session.add_all([
        ServiceAvailability(
            id=uuid.uuid4(),
            service_id=s1.id,
            date="2026-10-20",
            start_time="14:00",
            end_time="11:00",
            capacity=8,
            booked_count=2,
            is_blocked=False,
        ),
        ServiceAvailability(
            id=uuid.uuid4(),
            service_id=s2.id,
            date="2026-10-21",
            start_time="09:00",
            end_time="12:00",
            capacity=12,
            booked_count=4,
            is_blocked=False,
        ),
        ServiceAvailability(
            id=uuid.uuid4(),
            service_id=s3.id,
            date="2026-10-21",
            start_time="14:00",
            end_time="16:30",
            capacity=10,
            booked_count=1,
            is_blocked=False,
        ),
    ])
    session.commit()

    yield {
        "db": session,
        "traveler": traveler,
        "other_user": other_user,
        "host_user": host_user,
        "services": [s1, s2, s3],
    }
    session.close()


# ==============================================================================
# PHASE 2 & 3: COMPLETE END-TO-END CUSTOMER JOURNEY & API CONTRACT VERIFICATION
# ==============================================================================

def test_complete_e2e_customer_trip_planning_journey(e2e_db_session):
    """Test full journey: Generate → Review → Refine → Revalidate → Confirm → Persist → Handoff."""
    db = e2e_db_session["db"]
    traveler = e2e_db_session["traveler"]

    repo = AIRepository(db)
    service = AIService(repo)

    # 1. Customer initiates Trip Planner with specific travel constraints
    req = GenerateTripPlanRequest(
        destination_district="Kodagu (Coorg)",
        duration_days=2,
        party_size=2,
        max_budget=15000.0,
        preferred_categories=["Stays", "Activities", "Workshops"],
        pace="MODERATE",
        notes="Looking for authentic farm stay and spice workshop",
    )

    plan_resp = service.generate_trip_plan(user=traveler, payload=req)

    # Verify Plan Generation Contract
    assert "plan_id" in plan_resp
    assert plan_resp["status"] in ["READY_FOR_REVIEW", "BUILDING_ITINERARY"]
    assert plan_resp["constraints"]["destination_district"] == "Kodagu (Coorg)"
    assert plan_resp["constraints"]["party_size"] == 2
    assert plan_resp["proposal"] is not None
    assert len(plan_resp["proposal"]["days"]) == 2
    assert plan_resp["proposal"]["total_estimated_cost"] > 0
    assert "summary" in plan_resp["proposal"]

    # Verify Multi-Day Timeline Construction
    days = plan_resp["proposal"]["days"]
    assert len(days) == 2
    day1_items = days[0]["items"]
    assert len(day1_items) >= 1
    assert any(item["start_time"] is not None for item in day1_items)

    plan_id = plan_resp["plan_id"]

    # 2. Customer performs Itinerary Refinement (e.g. Removing an item)
    first_item_id = plan_resp["proposal"]["days"][0]["items"][0]["id"]
    refine_req = RefineTripPlanRequest(
        action="REMOVE",
        day_number=1,
        item_id=first_item_id,
    )
    refined_plan = service.refine_trip_plan(user=traveler, plan_id=plan_id, payload=refine_req)

    assert refined_plan["status"] == "READY_FOR_REVIEW"
    assert refined_plan["validation_report"]["is_valid"] is True
    assert len(refined_plan["proposal"]["days"][0]["items"]) < len(plan_resp["proposal"]["days"][0]["items"])

    # 3. Customer confirms the trip plan
    confirm_req = ConfirmTripPlanRequest(
        prompt_text="Confirmed 2-day Kodagu authentic agro journey",
    )
    confirm_resp = service.confirm_trip_plan(user=traveler, plan_id=plan_id, payload=confirm_req)

    assert confirm_resp["success"] is True
    assert "trip_id" in confirm_resp
    trip_id = confirm_resp["trip_id"]

    # 4. Verify Database Persistence Integrity (Trip → TripDay → TripItem + AITripPlan)
    persisted_trip = db.query(Trip).filter(Trip.id == uuid.UUID(trip_id)).first()
    assert persisted_trip is not None
    assert persisted_trip.user_id == traveler.id
    assert persisted_trip.destination == "Kodagu (Coorg)"
    assert persisted_trip.ai_generated is True
    assert persisted_trip.status == "PLANNED"

    # Verify TripDays and TripItems hierarchy
    persisted_days = db.query(TripDay).filter(TripDay.trip_id == persisted_trip.id).order_by(TripDay.day_number.asc()).all()
    assert len(persisted_days) == 2

    total_items = db.query(TripItem).join(TripDay).filter(TripDay.trip_id == persisted_trip.id).all()
    assert len(total_items) >= 2
    for item in total_items:
        assert item.is_booked is False  # Zero premature bookings

    # Verify AITripPlan provenance link
    ai_plan_record = db.query(AITripPlan).filter(AITripPlan.trip_id == persisted_trip.id).first()
    assert ai_plan_record is not None
    assert ai_plan_record.user_id == traveler.id
    assert ai_plan_record.status == "COMPLETED"

    # 5. Retrieve Pre-Booking Checkout Handoff
    handoff = service.get_booking_handoff(user=traveler, plan_id=plan_id)
    assert handoff["plan_id"] == plan_id
    assert handoff["trip_id"] == trip_id
    assert handoff["bookings_created"] is False
    assert handoff["payment_created"] is False
    assert handoff["handoff_ready"] is True
    assert len(handoff["items_to_book"]) >= 1


# ==============================================================================
# PHASE 4: STATE MACHINE HARDENING & ILLEGAL TRANSITIONS
# ==============================================================================

def test_state_machine_rejects_all_illegal_transitions():
    """Verify state machine strictly prohibits non-permitted state jumps."""
    state = PlannerState(user_id="u-001")
    assert state.status == PlannerStatus.DRAFT

    # Illegal: DRAFT → CONFIRMED
    with pytest.raises(PlannerStateTransitionError):
        PlannerStateMachine.transition(state, PlannerStatus.CONFIRMED)

    # Illegal: DRAFT → HANDED_OFF
    with pytest.raises(PlannerStateTransitionError):
        PlannerStateMachine.transition(state, PlannerStatus.HANDED_OFF)

    # Valid step to COLLECTING_REQUIREMENTS
    PlannerStateMachine.transition(state, PlannerStatus.COLLECTING_REQUIREMENTS)

    # Illegal: COLLECTING_REQUIREMENTS → CONFIRMED
    with pytest.raises(PlannerStateTransitionError):
        PlannerStateMachine.transition(state, PlannerStatus.CONFIRMED)


def test_confirmation_idempotency_on_retry(e2e_db_session):
    """Verify confirming an already-confirmed plan returns idempotently without duplicating trip records."""
    db = e2e_db_session["db"]
    traveler = e2e_db_session["traveler"]

    repo = AIRepository(db)
    service = AIService(repo)

    req = GenerateTripPlanRequest(
        destination_district="Kodagu (Coorg)",
        duration_days=2,
        party_size=2,
    )
    plan_resp = service.generate_trip_plan(user=traveler, payload=req)
    plan_id = plan_resp["plan_id"]

    # First confirmation
    res1 = service.confirm_trip_plan(user=traveler, plan_id=plan_id, payload=ConfirmTripPlanRequest())
    trip_id_1 = res1["trip_id"]

    # Count trips in database
    trips_count_before = db.query(Trip).filter(Trip.user_id == traveler.id).count()

    # Second (retry) confirmation
    res2 = service.confirm_trip_plan(user=traveler, plan_id=plan_id, payload=ConfirmTripPlanRequest())
    trip_id_2 = res2["trip_id"]

    trips_count_after = db.query(Trip).filter(Trip.user_id == traveler.id).count()

    assert trip_id_1 == trip_id_2
    assert trips_count_after == trips_count_before  # No duplicate trip container created


# ==============================================================================
# PHASE 5: DATA CONSISTENCY & TRANSACTIONAL ROLLBACK
# ==============================================================================

def test_transactional_rollback_on_persistence_error(e2e_db_session):
    """Verify persistence failures trigger atomic rollback without leaving corrupted records."""
    db = e2e_db_session["db"]
    traveler = e2e_db_session["traveler"]

    state = PlannerState(user_id=str(traveler.id))
    state.constraints = TravelerConstraints(destination_district="Kodagu", duration_days=2)
    state.proposal = None  # Missing proposal will raise ValueError

    trips_before = db.query(Trip).count()

    with pytest.raises(ValueError, match="Cannot persist trip without an itinerary proposal"):
        TripPersistenceEngine.persist_itinerary(db=db, user=traveler, state=state)

    trips_after = db.query(Trip).count()
    assert trips_after == trips_before


# ==============================================================================
# PHASE 6: PROVIDER FAILURE & RESILIENCE
# ==============================================================================

def test_external_partner_failure_isolation_and_fallback(e2e_db_session):
    """Verify partner outage opens circuit breaker and fallback serves local marketplace gracefully."""
    db = e2e_db_session["db"]

    failing_adapter = AgroTourismPartnerAdapter(
        failure_threshold=1,
        recovery_time_seconds=60.0,
        mock_data=[],
    )
    failing_adapter._record_failure()  # Force open circuit
    assert failing_adapter.is_healthy is False

    intel_service = ProviderIntelligenceService(db, custom_adapters=[failing_adapter])
    candidates = intel_service.get_candidate_offerings(district="Kodagu")

    # Local PostgreSQL services are still returned without throwing an exception
    assert len(candidates) >= 1
    assert candidates[0].district == "Kodagu (Coorg)"


# ==============================================================================
# PHASE 7: AI SAFETY & GROUNDING
# ==============================================================================

def test_anti_fabrication_zero_hallucinated_pricing_and_availability(e2e_db_session):
    """Verify that prices and availability slots are strictly bounded by database records."""
    db = e2e_db_session["db"]
    intel_service = ProviderIntelligenceService(db)

    offerings = intel_service.get_candidate_offerings(district="Kodagu")
    homestay = next(o for o in offerings if "Homestay" in o.title)

    # Base price matches DB (3800.0)
    assert homestay.base_price == 3800.0
    assert homestay.currency == "INR"

    # Availability for party of 2 is valid, for party of 20 is unavailable
    avail_valid = intel_service.verify_availability(homestay.service_id, party_size=2)
    assert avail_valid.is_available is True

    avail_invalid = intel_service.verify_availability(homestay.service_id, party_size=20)
    assert avail_invalid.is_available is False
    assert avail_invalid.status == AvailabilityStatus.UNAVAILABLE


# ==============================================================================
# PHASE 8: SECURITY & AUTHORIZATION BOUNDARIES
# ==============================================================================

def test_cross_user_trip_plan_access_prevention(e2e_db_session):
    """Verify that user A cannot inspect, refine, or confirm user B's trip plans."""
    db = e2e_db_session["db"]
    traveler = e2e_db_session["traveler"]
    other_user = e2e_db_session["other_user"]

    repo = AIRepository(db)
    service = AIService(repo)

    req = GenerateTripPlanRequest(destination_district="Kodagu (Coorg)", duration_days=2)
    plan_resp = service.generate_trip_plan(user=traveler, payload=req)
    plan_id = plan_resp["plan_id"]

    # Other user attempts to fetch traveler's plan
    with pytest.raises(Exception) as exc_info:
        service.get_trip_plan(user=other_user, plan_id=plan_id)
    assert "403" in str(exc_info.value) or "Not authorized" in str(exc_info.value)

    # Other user attempts to refine traveler's plan
    with pytest.raises(Exception) as exc_info:
        service.refine_trip_plan(user=other_user, plan_id=plan_id, payload=RefineTripPlanRequest(action="REMOVE", day_number=1, item_id="item-01"))
    assert "403" in str(exc_info.value) or "Not authorized" in str(exc_info.value)

    # Other user attempts to confirm traveler's plan
    with pytest.raises(Exception) as exc_info:
        service.confirm_trip_plan(user=other_user, plan_id=plan_id, payload=ConfirmTripPlanRequest())
    assert "403" in str(exc_info.value) or "Not authorized" in str(exc_info.value)
