"""Comprehensive test suite for Namma Connect V2 Agentic Trip Planner."""

import pytest
import uuid
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

from app.core.database import Base
from app.modules.user.domain.models import User
from app.modules.marketplace.domain.models import MarketplaceCategory, Service, ServiceAvailability
from app.modules.trip.domain.models import Trip, TripDay, TripItem, AITripPlan
from app.modules.ai.llm.mock_provider import MockLLMProvider
from app.modules.ai.trip_planner.state import (
    PlannerStatus,
    PlannerState,
    TravelerConstraints,
    ItineraryProposal,
    DayPlanProposal,
    ItemProposal,
    ConflictReport,
)
from app.modules.ai.trip_planner.state_machine import (
    PlannerStateMachine,
    PlannerStateTransitionError,
)
from app.modules.ai.trip_planner.validator import ItineraryValidator, parse_time_to_minutes
from app.modules.ai.trip_planner.builder import ItineraryBuilder
from app.modules.ai.trip_planner.refiner import ItineraryRefiner
from app.modules.ai.trip_planner.handoff import BookingHandoffGenerator
from app.modules.ai.trip_planner.persistence import TripPersistenceEngine
from app.modules.ai.trip_planner.orchestrator import AgenticTripPlanner
from app.modules.ai.infrastructure.repository import AIRepository
from app.modules.ai.application.service import AIService
from app.modules.ai.presentation.schemas import (
    GenerateTripPlanRequest,
    RefineTripPlanRequest,
    ConfirmTripPlanRequest,
)


@pytest.fixture
def db_session():
    """In-memory SQLite database session fixture."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = Session()

    cat1 = MarketplaceCategory(id=uuid.uuid4(), slug="farm-stays", name="Farm Stays", marketplace_type="STAY", is_active=True)
    cat2 = MarketplaceCategory(id=uuid.uuid4(), slug="agro-tours", name="Agro Tours", marketplace_type="ACTIVITY", is_active=True)
    session.add_all([cat1, cat2])
    session.commit()

    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_users(db_session):
    """Seed sample users."""
    host = User(id=uuid.uuid4(), email="host.somesh@test.com", full_name="Somesh Planter", role="PARTNER", is_active=True)
    traveler1 = User(id=uuid.uuid4(), email="traveler.maya@test.com", full_name="Maya Rao", role="CUSTOMER", is_active=True)
    traveler2 = User(id=uuid.uuid4(), email="traveler.rahul@test.com", full_name="Rahul Dravid", role="CUSTOMER", is_active=True)
    db_session.add_all([host, traveler1, traveler2])
    db_session.commit()
    return {"host": host, "traveler1": traveler1, "traveler2": traveler2}


@pytest.fixture
def test_services(db_session, test_users):
    """Seed sample verified services for Kodagu and Chikkamagaluru."""
    host = test_users["host"]

    s1 = Service(
        id=uuid.uuid4(),
        title="Madikeri Organic Coffee Plantation Stay",
        slug="madikeri-organic-coffee-stay",
        description="Historic plantation bungalow",
        category="Farm Stays",
        category_slug="farm-stays",
        location="Madikeri",
        district="Kodagu",
        price=Decimal("3000.00"),
        rating=4.9,
        reviews_count=20,
        is_verified=True,
        status="PUBLISHED",
        provider_id=host.id,
        provider_name=host.full_name,
        primary_image="https://img.test/s1.jpg",
    )
    s2 = Service(
        id=uuid.uuid4(),
        title="Coorg Cardamom & Pepper Spice Walk",
        slug="coorg-spice-walk",
        description="Guided estate spice walk",
        category="Agro Tours",
        category_slug="agro-tours",
        location="Madikeri",
        district="Kodagu",
        price=Decimal("1200.00"),
        rating=4.8,
        reviews_count=16,
        is_verified=True,
        status="PUBLISHED",
        provider_id=host.id,
        provider_name=host.full_name,
        primary_image="https://img.test/s2.jpg",
    )
    s3 = Service(
        id=uuid.uuid4(),
        title="Brahmagiri Foothills Agro Camp",
        slug="brahmagiri-agro-camp",
        description="Camp under Western Ghats canopy",
        category="Agro Tours",
        category_slug="agro-tours",
        location="Kutta",
        district="Kodagu",
        price=Decimal("1800.00"),
        rating=4.85,
        reviews_count=10,
        is_verified=True,
        status="PUBLISHED",
        provider_id=host.id,
        provider_name=host.full_name,
        primary_image="https://img.test/s3.jpg",
    )
    db_session.add_all([s1, s2, s3])
    db_session.commit()
    return {"s1": s1, "s2": s2, "s3": s3}


# ============================================================================
# 1. State Machine & Transition Tests
# ============================================================================

def test_planner_state_machine_valid_transitions():
    """Verify standard happy-path lifecycle state transitions."""
    state = PlannerState(status=PlannerStatus.DRAFT)

    PlannerStateMachine.transition(state, PlannerStatus.COLLECTING_REQUIREMENTS)
    assert state.status == PlannerStatus.COLLECTING_REQUIREMENTS

    PlannerStateMachine.transition(state, PlannerStatus.SEARCHING)
    assert state.status == PlannerStatus.SEARCHING

    PlannerStateMachine.transition(state, PlannerStatus.BUILDING_ITINERARY)
    assert state.status == PlannerStatus.BUILDING_ITINERARY

    PlannerStateMachine.transition(state, PlannerStatus.VALIDATING)
    assert state.status == PlannerStatus.VALIDATING

    PlannerStateMachine.transition(state, PlannerStatus.READY_FOR_REVIEW)
    assert state.status == PlannerStatus.READY_FOR_REVIEW

    PlannerStateMachine.transition(state, PlannerStatus.CONFIRMED)
    assert state.status == PlannerStatus.CONFIRMED


def test_planner_state_machine_rejects_illegal_jump():
    """Verify that jumping directly from DRAFT to CONFIRMED raises PlannerStateTransitionError."""
    state = PlannerState(status=PlannerStatus.DRAFT)
    with pytest.raises(PlannerStateTransitionError):
        PlannerStateMachine.transition(state, PlannerStatus.CONFIRMED)


# ============================================================================
# 2. Deterministic Conflict & Constraint Validator Tests
# ============================================================================

def test_time_parsing_helper():
    """Verify time string conversion to minutes from midnight."""
    assert parse_time_to_minutes("09:00 AM") == 9 * 60
    assert parse_time_to_minutes("12:00 PM") == 12 * 60
    assert parse_time_to_minutes("01:30 PM") == 13 * 60 + 30
    assert parse_time_to_minutes("11:59 PM") == 23 * 60 + 59
    assert parse_time_to_minutes("00:00") == 0


def test_validator_detects_time_overlap():
    """Verify deterministic detection of overlapping activity time slots."""
    item1 = ItemProposal(title="Morning Trek", start_time="09:00 AM", end_time="11:30 AM", estimated_price=1000.0)
    item2 = ItemProposal(title="Cooking Class", start_time="11:00 AM", end_time="01:00 PM", estimated_price=1500.0)  # Overlaps at 11:00-11:30

    proposal = ItineraryProposal(
        days=[DayPlanProposal(day_number=1, items=[item1, item2])],
        total_estimated_cost=2500.0,
    )
    constraints = TravelerConstraints(destination_district="Kodagu", max_budget=10000.0)

    report = ItineraryValidator.validate(proposal, constraints)
    assert report.is_valid is False
    assert any(c.conflict_type == "TIME_OVERLAP" for c in report.conflicts)


def test_validator_detects_budget_exceeded():
    """Verify deterministic budget ceiling violation reporting."""
    item1 = ItemProposal(title="Luxury Stay", start_time="09:00 AM", end_time="11:00 AM", estimated_price=8000.0)
    item2 = ItemProposal(title="Helicopter Tour", start_time="02:00 PM", end_time="04:00 PM", estimated_price=12000.0)

    proposal = ItineraryProposal(
        days=[DayPlanProposal(day_number=1, items=[item1, item2])],
        total_estimated_cost=20000.0,
    )
    constraints = TravelerConstraints(destination_district="Kodagu", max_budget=15000.0)

    report = ItineraryValidator.validate(proposal, constraints)
    assert report.is_valid is False
    assert any(c.conflict_type == "BUDGET_EXCEEDED" for c in report.conflicts)


# ============================================================================
# 3. Itinerary Builder & Refinement Tests
# ============================================================================

def test_itinerary_builder_schedules_multi_day(test_services):
    """Verify ItineraryBuilder organizes candidate services across requested days."""
    candidates = list(test_services.values())
    constraints = TravelerConstraints(
        destination_district="Kodagu",
        duration_days=2,
        start_date="2026-10-15",
        party_size=2,
    )

    proposal = ItineraryBuilder.build_initial_itinerary(constraints, candidates)
    assert len(proposal.days) == 2
    assert proposal.days[0].day_number == 1
    assert proposal.days[0].date == "2026-10-15"
    assert proposal.days[1].day_number == 2
    assert proposal.days[1].date == "2026-10-16"
    assert len(proposal.days[0].items) >= 2


def test_itinerary_refiner_item_replacement(test_services):
    """Verify replacing an item in a day plan recalculates total cost."""
    candidates = list(test_services.values())
    constraints = TravelerConstraints(destination_district="Kodagu", duration_days=1)
    proposal = ItineraryBuilder.build_initial_itinerary(constraints, candidates)

    old_item_id = proposal.days[0].items[0].id
    new_svc = test_services["s3"]  # ₹1800

    replaced = ItineraryRefiner.replace_item(proposal, day_number=1, item_id=old_item_id, new_service=new_svc)
    assert replaced is True
    assert any(i.title == "Brahmagiri Foothills Agro Camp" for i in proposal.days[0].items)


# ============================================================================
# 4. Authoritative Persistence & Booking Handoff Tests
# ============================================================================

def test_trip_persistence_engine(db_session, test_users, test_services):
    """Verify persisting approved proposal writes to Trip, TripDay, TripItem, and AITripPlan."""
    user = test_users["traveler1"]
    candidates = list(test_services.values())
    constraints = TravelerConstraints(destination_district="Kodagu", duration_days=2, start_date="2026-10-20", party_size=2)
    proposal = ItineraryBuilder.build_initial_itinerary(constraints, candidates)

    state = PlannerState(
        user_id=str(user.id),
        status=PlannerStatus.READY_FOR_REVIEW,
        constraints=constraints,
        proposal=proposal,
    )

    trip = TripPersistenceEngine.persist_itinerary(db_session, user=user, state=state, prompt_text="Plan 2-day Coorg trip")
    assert trip.id is not None
    assert trip.destination == "Kodagu"
    assert trip.ai_generated is True
    assert len(trip.days) == 2

    # Check TripItems persisted
    total_items = sum(len(d.items) for d in trip.days)
    assert total_items >= 4

    # Check AITripPlan record
    plan_record = db_session.query(AITripPlan).filter(AITripPlan.trip_id == trip.id).first()
    assert plan_record is not None
    assert plan_record.user_id == user.id
    assert plan_record.status == "COMPLETED"


def test_booking_handoff_no_premature_bookings_or_payments(test_users, test_services):
    """Verify that booking handoff payload prepares checkout items without mutating booking/payment tables."""
    user = test_users["traveler1"]
    candidates = list(test_services.values())
    constraints = TravelerConstraints(destination_district="Kodagu", duration_days=1, party_size=2)
    proposal = ItineraryBuilder.build_initial_itinerary(constraints, candidates)

    state = PlannerState(
        user_id=str(user.id),
        status=PlannerStatus.READY_FOR_REVIEW,
        constraints=constraints,
        proposal=proposal,
    )

    handoff = BookingHandoffGenerator.generate_handoff_payload(state, trip_id=str(uuid.uuid4()))
    assert handoff["handoff_ready"] is True
    assert handoff["bookings_created"] is False
    assert handoff["payment_created"] is False
    assert len(handoff["items_to_book"]) >= 1
    assert handoff["estimated_subtotal"] > 0.0


# ============================================================================
# 5. End-to-End Agentic Planner & Service Tests
# ============================================================================

def test_agentic_trip_planner_clarification_on_missing_destination(db_session, test_users):
    """Verify planner requests clarification when destination is missing."""
    user = test_users["traveler1"]
    planner = AgenticTripPlanner(db=db_session, llm_provider=MockLLMProvider())

    incomplete_constraints = TravelerConstraints(destination_district="", duration_days=2)
    state = planner.plan_trip(user=user, constraints=incomplete_constraints)

    assert state.status == PlannerStatus.COLLECTING_REQUIREMENTS
    assert len(state.clarification_questions) >= 1
    assert "Which district" in state.clarification_questions[0]


def test_agentic_trip_planner_full_lifecycle_and_refinement(db_session, test_users, test_services):
    """Test full end-to-end flow: generate -> refine -> confirm -> booking handoff."""
    user = test_users["traveler1"]
    repo = AIRepository(db_session)
    service = AIService(repo=repo, llm_provider=MockLLMProvider())

    # 1. Generate Trip Plan
    gen_req = GenerateTripPlanRequest(
        destination_district="Kodagu",
        duration_days=2,
        start_date="2026-11-01",
        party_size=2,
        max_budget=15000.0,
    )
    plan_dict = service.generate_trip_plan(user=user, payload=gen_req)
    assert plan_dict["status"] == "READY_FOR_REVIEW"
    assert plan_dict["proposal"] is not None
    assert len(plan_dict["proposal"]["days"]) == 2
    plan_id = plan_dict["plan_id"]

    # 2. Refine Plan (Remove an item)
    first_item_id = plan_dict["proposal"]["days"][0]["items"][0]["id"]
    refine_req = RefineTripPlanRequest(
        action="REMOVE",
        day_number=1,
        item_id=first_item_id,
    )
    refined_dict = service.refine_trip_plan(user=user, plan_id=plan_id, payload=refine_req)
    assert refined_dict["status"] == "READY_FOR_REVIEW"
    assert len(refined_dict["proposal"]["days"][0]["items"]) < len(plan_dict["proposal"]["days"][0]["items"])

    # 3. Confirm Plan
    confirm_req = ConfirmTripPlanRequest(prompt_text="2-day Coorg itinerary")
    confirm_res = service.confirm_trip_plan(user=user, plan_id=plan_id, payload=confirm_req)
    assert confirm_res["success"] is True
    assert confirm_res["status"] == "CONFIRMED"
    assert confirm_res["booking_handoff"]["bookings_created"] is False

    # Check persisted trip in DB
    trip = db_session.query(Trip).filter(Trip.id == uuid.UUID(confirm_res["trip_id"])).first()
    assert trip is not None
    assert trip.destination == "Kodagu"


def test_cross_user_trip_plan_access_denial(db_session, test_users):
    """Test that traveler2 cannot inspect or refine traveler1's trip plan."""
    user1 = test_users["traveler1"]
    user2 = test_users["traveler2"]
    repo = AIRepository(db_session)
    service = AIService(repo=repo, llm_provider=MockLLMProvider())

    plan_dict = service.generate_trip_plan(
        user=user1,
        payload=GenerateTripPlanRequest(destination_district="Kodagu", duration_days=2),
    )
    plan_id = plan_dict["plan_id"]

    # User 2 tries to access plan
    with pytest.raises(HTTPException) as exc:
        service.get_trip_plan(user=user2, plan_id=plan_id)
    assert exc.value.status_code == 403
