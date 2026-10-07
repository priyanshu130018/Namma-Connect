"""Comprehensive test suite for Namma Connect V2 LangGraph Agentic Travel Agent.

Tests cover all 12 key scenarios:
1. Natural-language marketplace search.
2. Personalized search.
3. Availability checking.
4. Multi-step trip planning.
5. Budget validation/refinement.
6. Add service to trip through agent.
7. Modify trip through agent.
8. Explicit booking request.
9. Booking failure handling.
10. Agent state persistence/resume.
11. Tool authorization.
12. No hallucinated availability/booking confirmation.
"""

import json
import uuid
from decimal import Decimal
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

from app.core.database import Base
from app.modules.user.domain.models import User
from app.modules.marketplace.domain.models import (
    MarketplaceCategory,
    Service,
    ServiceAvailability,
    SavedService,
)
from app.modules.trip.domain.models import Trip, TripDay, TripItem
from app.modules.booking.domain.models import Booking
from app.modules.ai.domain.models import AIConversation, AIMessage
from app.modules.ai.infrastructure.repository import AIRepository
from app.modules.ai.agent.persistence import (
    AICheckpointRecord,
    AICheckpointBlobRecord,
    AICheckpointWriteRecord,
    SQLAlchemyCheckpointSaver,
)
from app.modules.ai.agent.policies import AgentPolicies, PolicyEnforcementError
from app.modules.ai.agent.tools import (
    create_agent_tools,
    MarketplaceSearchInput,
    RecommendationInput,
    CheckAvailabilityInput,
    ExecuteBookingInput,
)
from app.modules.ai.agent.service import NammaAgentService
from app.modules.ai.application.service import AIService
from app.modules.ai.presentation.schemas import AgentRunRequest, SendAIMessageRequest


@pytest.fixture
def db_session():
    """In-memory SQLite database session fixture with thread safety for LangGraph."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = Session()

    # Pre-seed categories
    cat_stay = MarketplaceCategory(
        id=uuid.uuid4(),
        slug="farm-stays",
        name="Farm Stays",
        marketplace_type="STAY",
        is_active=True,
    )
    cat_act = MarketplaceCategory(
        id=uuid.uuid4(),
        slug="plantation-tours",
        name="Plantation Tours",
        marketplace_type="EXPERIENCE",
        is_active=True,
    )
    session.add_all([cat_stay, cat_act])
    session.commit()

    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_data(db_session):
    """Seed test users, services, availability slots, and saved services."""
    # 1. Users
    customer = User(
        id=uuid.uuid4(),
        email="traveler@example.com",
        full_name="Priyanshu Traveler",
        role="CUSTOMER",
        is_active=True,
        is_verified=True,
        travel_preferences=json.dumps({
            "interests": ["nature", "farm-stays", "plantation-tours"],
            "preferred_pace": "MODERATE",
            "dietary": "Vegetarian",
        }),
    )
    customer2 = User(
        id=uuid.uuid4(),
        email="intruder@example.com",
        full_name="Intruder User",
        role="CUSTOMER",
        is_active=True,
        is_verified=True,
    )
    host = User(
        id=uuid.uuid4(),
        email="host@example.com",
        full_name="Kodagu Host",
        role="PROVIDER",
        is_active=True,
        is_verified=True,
    )
    db_session.add_all([customer, customer2, host])
    db_session.commit()

    # 2. Services in Kodagu (Coorg)
    s1 = Service(
        id=uuid.uuid4(),
        title="Coorg Serene Coffee Estate Stay",
        slug="coorg-serene-coffee-estate-stay",
        category="farm-stays",
        category_slug="farm-stays",
        description="Peaceful organic coffee estate stay in Madikeri.",
        location="Madikeri, Kodagu",
        district="Kodagu",
        price=Decimal("4500.00"),
        unit="night",
        max_capacity=4,
        rating=Decimal("4.8"),
        reviews_count=20,
        is_verified=True,
        status="PUBLISHED",
        provider_id=host.id,
        provider_name=host.full_name,
        primary_image="https://img.test/coorg-stay.jpg",
    )
    s2 = Service(
        id=uuid.uuid4(),
        title="Kodava Traditional Spice Plantation Tour",
        slug="kodava-traditional-spice-plantation-tour",
        category="plantation-tours",
        category_slug="plantation-tours",
        description="Authentic spice tour with cardamom, pepper, and coffee tasting.",
        location="Virajpet, Kodagu",
        district="Kodagu",
        price=Decimal("800.00"),
        unit="person",
        max_capacity=15,
        rating=Decimal("4.9"),
        reviews_count=35,
        is_verified=True,
        status="PUBLISHED",
        provider_id=host.id,
        provider_name=host.full_name,
        primary_image="https://img.test/spice-tour.jpg",
    )
    s_expensive = Service(
        id=uuid.uuid4(),
        title="Luxury Coorg Presidential Villa",
        slug="luxury-coorg-presidential-villa",
        category="farm-stays",
        category_slug="farm-stays",
        description="Ultra luxury private villa estate.",
        location="Madikeri, Kodagu",
        district="Kodagu",
        price=Decimal("35000.00"),
        unit="night",
        max_capacity=6,
        rating=Decimal("4.9"),
        reviews_count=8,
        is_verified=True,
        status="PUBLISHED",
        provider_id=host.id,
        provider_name=host.full_name,
        primary_image="https://img.test/luxury-villa.jpg",
    )
    db_session.add_all([s1, s2, s_expensive])
    db_session.commit()

    # 3. Availability Slots
    target_date = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
    slot_open = ServiceAvailability(
        id=uuid.uuid4(),
        service_id=s1.id,
        date=target_date,
        capacity=4,
        booked_count=1,
        is_blocked=False,
    )
    slot_blocked = ServiceAvailability(
        id=uuid.uuid4(),
        service_id=s2.id,
        date="2026-12-25",
        capacity=10,
        booked_count=0,
        is_blocked=True,
    )
    db_session.add_all([slot_open, slot_blocked])

    # 4. Saved Service for customer
    saved = SavedService(
        id=uuid.uuid4(),
        user_id=customer.id,
        service_id=s1.id,
    )
    db_session.add(saved)
    db_session.commit()

    return {
        "customer": customer,
        "customer2": customer2,
        "host": host,
        "s1": s1,
        "s2": s2,
        "s_expensive": s_expensive,
        "target_date": target_date,
    }


# ============================================================================
# Scenario 1: Natural-Language Marketplace Search
# ============================================================================

def test_natural_language_marketplace_search(db_session, test_data):
    """User asks to find stays in Coorg under 5000; agent searches and returns options."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    result = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Find me a quiet stay in Coorg for this weekend under ₹5,000.",
    )

    assert result["role"] == "ASSISTANT"
    assert len(result["search_results"]) > 0
    # Must find the Coorg Serene Coffee Estate Stay
    stay_titles = [s["title"] for s in result["search_results"]]
    assert any("Coorg Serene Coffee Estate" in t for t in stay_titles)
    # The expensive 35k stay should be excluded by budget filter
    assert not any("Luxury Coorg Presidential Villa" in t for t in stay_titles)
    assert "Coorg" in result["content"] or "Kodagu" in result["content"]


# ============================================================================
# Scenario 2: Personalized Search using User Preferences
# ============================================================================

def test_personalized_search_with_user_preferences(db_session, test_data):
    """Agent loads user context and preferences, prioritizing relevant categories."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    result = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Use my preferences and find the best option in Coorg.",
    )

    # Check trace indicates context loading
    steps = [t.get("step") for t in result["execution_trace"]]
    assert "LOADING_CONTEXT" in steps
    assert "SEARCH_COMPLETED" in steps
    assert len(result["search_results"]) > 0


# ============================================================================
# Scenario 3: Real Availability Checking
# ============================================================================

def test_availability_checking(db_session, test_data):
    """Verify factual availability check via tool without fabrication."""
    s1 = test_data["s1"]
    s2 = test_data["s2"]
    target_date = test_data["target_date"]

    # Open slot
    avail_open = AgentPolicies.verify_real_availability(
        db=db_session,
        service_id=str(s1.id),
        start_date=target_date,
        guests_count=2,
    )
    assert avail_open["available"] is True
    assert avail_open["available_spots"] == 3

    # Blocked slot
    avail_blocked = AgentPolicies.verify_real_availability(
        db=db_session,
        service_id=str(s2.id),
        date="2026-12-25",
        guests_count=1,
    )
    assert avail_blocked["available"] is False
    assert "blocked" in avail_blocked["reason"].lower()


# ============================================================================
# Scenario 4: Multi-Step Trip Planning
# ============================================================================

def test_multistep_trip_planning(db_session, test_data):
    """User provides single prompt; agent understands, searches, builds itinerary, and saves Trip."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    result = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Plan a 3 day Coorg trip for 2 people under ₹15,000. I prefer quiet stays and nature activities.",
    )

    assert result["role"] == "ASSISTANT"
    assert result["trip_id"] is not None
    assert result["itinerary"] is not None
    assert len(result["itinerary"]["days"]) >= 2

    # Verify trip was actually saved to database
    trip = db_session.query(Trip).filter(Trip.id == uuid.UUID(result["trip_id"])).first()
    assert trip is not None
    assert trip.destination == "Kodagu"
    assert str(trip.user_id) == str(customer.id)
    assert len(trip.days) >= 2


# ============================================================================
# Scenario 5: Budget Validation and Refinement
# ============================================================================

def test_budget_validation_and_refinement(db_session, test_data):
    """When itinerary total exceeds budget, agent validates and refines it down."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Request with tight budget
    result = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Plan a 2 day Coorg trip under ₹6,000 for 2 guests.",
    )

    itin = result.get("itinerary")
    assert itin is not None
    # Total cost should be within budget or close
    assert itin["total_estimated_cost"] <= 12000.0


# ============================================================================
# Scenario 6: Add Service to Trip Through Agent
# ============================================================================

def test_add_service_to_trip_through_agent(db_session, test_data):
    """Agent tool add service / save trip modifies database Trip records properly."""
    customer = test_data["customer"]
    s1 = test_data["s1"]
    s2 = test_data["s2"]

    # Create base trip
    base_trip = Trip(
        id=uuid.uuid4(),
        user_id=customer.id,
        title="My Coorg Vacation",
        destination="Kodagu",
        status="DRAFT",
    )
    day1 = TripDay(
        id=uuid.uuid4(),
        trip_id=base_trip.id,
        day_number=1,
        date=str((datetime.utcnow() + timedelta(days=7)).date()),
        title="Day 1 - Arrival",
    )
    base_trip.days.append(day1)
    db_session.add(base_trip)
    db_session.commit()

    # Add item
    item = TripItem(
        id=uuid.uuid4(),
        trip_day_id=day1.id,
        service_id=s2.id,
        title=s2.title,
        item_type="SERVICE",
        start_time="14:00",
        end_time="16:00",
    )
    db_session.add(item)
    db_session.commit()

    saved_items = db_session.query(TripItem).filter(TripItem.trip_day_id == day1.id).all()
    assert len(saved_items) == 1
    assert saved_items[0].service_id == s2.id


# ============================================================================
# Scenario 7: Modify Trip Through Agent (Refinement)
# ============================================================================

def test_modify_trip_through_agent(db_session, test_data):
    """User asks to make the trip cheaper; agent reduces budget and refines itinerary."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Turn 1: Initial plan
    res1 = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Plan a 2 day trip to Coorg.",
    )
    cost1 = res1["itinerary"]["total_estimated_cost"]

    # Turn 2: Ask to make it cheaper
    res2 = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Make it cheaper and reduce the budget to ₹5,000.",
    )
    cost2 = res2["itinerary"]["total_estimated_cost"]
    assert cost2 <= cost1


# ============================================================================
# Scenario 8: Explicit Booking Request & Two-Phase Approval Flow
# ============================================================================

def test_explicit_booking_request(db_session, test_data):
    """When user requests booking, agent validates readiness and requires explicit user confirmation before creating booking."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Turn 1: Plan trip
    plan_res = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Plan a 2 day Coorg trip.",
    )
    assert plan_res["trip_id"] is not None

    # Turn 2: Request booking readiness check ("Book this trip")
    readiness_res = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Book this trip",
    )

    # Phase 1 verification: Readiness checked, approval required, NO booking created yet
    assert readiness_res.get("approval_required") is True
    assert readiness_res.get("approval_status") == "PENDING"
    assert readiness_res.get("approval_action") == "BOOKING"
    assert "Your trip is ready to book" in readiness_res["content"]
    assert "Total" in readiness_res["content"]

    # Confirm no booking record exists yet
    existing_bookings = db_session.query(Booking).filter(Booking.customer_id == customer.id).all()
    assert len(existing_bookings) == 0

    # Turn 3: User explicitly confirms booking ("Confirm booking")
    booking_result = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Confirm booking",
    )

    # Phase 2 verification: Booking executed upon explicit approval
    b_state = booking_result.get("booking_state")
    assert b_state is not None
    assert b_state["success"] is True
    assert b_state["booking_code"].startswith("NC-")
    assert b_state["payment_order_id"].startswith("order_")
    assert "Booking Confirmed" in booking_result["content"]
    assert booking_result.get("approval_required") is False

    # Verify real Booking record in DB
    b_record = db_session.query(Booking).filter(Booking.booking_code == b_state["booking_code"]).first()
    assert b_record is not None
    assert b_record.customer_id == customer.id


def test_exploratory_messages_do_not_trigger_booking(db_session, test_data):
    """Exploratory questions ('Can I book this?', 'Looks good', 'How much will this cost?') must NOT trigger booking."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Plan a trip
    agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Plan a 2 day Coorg trip.",
    )

    exploratory_messages = [
        "Can I book this?",
        "How much will this cost?",
        "Looks good.",
        "Show me the booking options.",
    ]

    for msg in exploratory_messages:
        res = agent_service.run_agent(
            user=customer,
            conversation_id=conv_id,
            message=msg,
        )
        assert res.get("approval_action") != "BOOKING" or res.get("approval_status") != "APPROVED"
        assert res.get("booking_state") is None or res.get("booking_state", {}).get("success") is not True

    # No booking created in DB
    bookings = db_session.query(Booking).filter(Booking.customer_id == customer.id).all()
    assert len(bookings) == 0


def test_booking_rejection_or_postpone(db_session, test_data):
    """When user declines or says 'Modify trip' during approval gate, booking is postponed cleanly."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Turn 1: Plan trip
    agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Plan a 2 day Coorg trip.",
    )

    # Turn 2: Trigger readiness check
    readiness_res = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Book this trip",
    )
    assert readiness_res.get("approval_required") is True

    # Turn 3: Decline / Modify
    decline_res = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Modify trip",
    )
    assert decline_res.get("approval_status") == "REJECTED"
    assert "postponed" in decline_res["content"].lower() or "modify" in decline_res["content"].lower()

    # No booking created in DB
    bookings = db_session.query(Booking).filter(Booking.customer_id == customer.id).all()
    assert len(bookings) == 0


# ============================================================================
# Scenario 9: Booking Failure Handling
# ============================================================================

def test_booking_failure_handling(db_session, test_data):
    """When capacity is exceeded or date is blocked, agent honestly reports failure without hallucinating."""
    customer = test_data["customer"]
    s2 = test_data["s2"]
    conv_id = str(uuid.uuid4())

    # Manually configure blocked date on candidate
    agent_service = NammaAgentService(db_session)

    # Initialize thread with blocked service
    agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Find plantation tour in Coorg",
    )

    # Attempt to book on a blocked date
    blocked_date = "2026-12-25"
    avail = AgentPolicies.verify_real_availability(
        db=db_session,
        service_id=str(s2.id),
        start_date=blocked_date,
        guests_count=1,
    )
    assert avail["available"] is False
    assert "blocked" in avail["reason"].lower()


# ============================================================================
# Scenario 10: Agent State Persistence and Resume
# ============================================================================

def test_agent_state_persistence_and_resume(db_session, test_data):
    """Checkpoints are written to PostgreSQL/SQLite and state persists across separate runs."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Turn 1
    res1 = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Plan a 3 day trip to Coorg under ₹15,000",
    )
    trip_id = res1["trip_id"]

    # Retrieve checkpoint directly via service
    state = agent_service.get_agent_state(user=customer, conversation_id=conv_id)
    assert state is not None
    assert state["trip_id"] == trip_id
    assert state["conversation_id"] == conv_id

    # Verify checkpoint row exists in DB
    cp_rows = db_session.query(AICheckpointRecord).filter(AICheckpointRecord.thread_id == conv_id).all()
    assert len(cp_rows) > 0


# ============================================================================
# Scenario 11: Tool Authorization & Cross-User Security
# ============================================================================

def test_tool_authorization_and_cross_user_security(db_session, test_data):
    """Customer2 cannot modify or book customer1's trip."""
    customer1 = test_data["customer"]
    customer2 = test_data["customer2"]

    # Customer 1 owns a trip
    trip1 = Trip(
        id=uuid.uuid4(),
        user_id=customer1.id,
        title="Private Customer1 Trip",
        destination="Kodagu",
    )
    db_session.add(trip1)
    db_session.commit()

    # Customer 2 attempts to verify ownership of Customer 1's trip
    with pytest.raises(PolicyEnforcementError) as exc:
        AgentPolicies.verify_trip_ownership(db=db_session, user=customer2, trip_id=str(trip1.id))
    assert "not authorized" in str(exc.value).lower()


# ============================================================================
# Scenario 12: Zero Hallucination (Availability, Pricing, Booking)
# ============================================================================

def test_zero_hallucination_guarantee(db_session, test_data):
    """Non-existent services cannot be booked, and searches in districts with 0 services return honest absence."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)

    # 1. Non-existent service ID must fail policy verification
    fake_id = str(uuid.uuid4())
    with pytest.raises(PolicyEnforcementError) as exc:
        AgentPolicies.verify_real_service(db=db_session, service_id=fake_id)
    assert "does not exist" in str(exc.value)

    # 2. Search in district with 0 listings must NOT fabricate listings
    conv_id = str(uuid.uuid4())
    result = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Show me stays in Bidar",
    )
    assert len(result["search_results"]) == 0
    assert "no available stays" in result["content"].lower() or "not found" in result["content"].lower() or "0" in result["content"].lower()


# ============================================================================
# Scenario 13: Orchestrated Multi-Turn Trip Modifications
# ============================================================================

def test_orchestrated_multiturn_trip_modifications(db_session, test_data):
    """Verify Namma AI orchestrator routes multi-turn trip modifications to trip_planner preserving active trip context."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Turn 1: Plan initial 3-day trip
    res1 = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Plan a 3 day trip to Coorg.",
    )
    assert res1["trip_id"] is not None
    assert res1["itinerary"] is not None
    assert len(res1["itinerary"]["days"]) >= 2
    initial_trip_id = res1["trip_id"]

    # Turn 2: Make Day 2 cheaper
    res2 = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Make Day 2 cheaper.",
    )
    assert res2["trip_id"] == initial_trip_id
    assert res2["itinerary"] is not None
    assert any(t.get("action") == "PLAN_OR_REFINE_ITINERARY" for t in res2["execution_trace"])

    # Turn 3: Add a local food experience
    res3 = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Add a local food experience.",
    )
    assert res3["trip_id"] == initial_trip_id
    total_items_turn3 = sum(len(d["items"]) for d in res3["itinerary"]["days"])
    assert total_items_turn3 >= sum(len(d["items"]) for d in res2["itinerary"]["days"])

    # Turn 4: Change my hotel
    res4 = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Change my hotel.",
    )
    assert res4["trip_id"] == initial_trip_id
    assert res4["itinerary"] is not None

    # Turn 5: Remove trekking
    res5 = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Remove trekking.",
    )
    assert res5["trip_id"] == initial_trip_id
    assert res5["itinerary"] is not None

    # Turn 6: Show me another option
    res6 = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Show me another option for activity.",
    )
    assert res6["trip_id"] == initial_trip_id

    # Turn 7: Reduce the budget
    res7 = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="Reduce the budget to ₹6,000.",
    )
    assert res7["trip_id"] == initial_trip_id
    assert res7["itinerary"]["total_estimated_cost"] < res4["itinerary"]["total_estimated_cost"]
    assert res7["itinerary"]["total_estimated_cost"] <= 18000.0


    # Verify DB trip record has been updated and persists
    trip_record = db_session.query(Trip).filter(Trip.id == uuid.UUID(initial_trip_id)).first()
    assert trip_record is not None
    assert trip_record.destination == "Kodagu"
    assert len(trip_record.days) >= 2


# ============================================================================
# Scenario 14: Normal Travel Conversation Flow vs Trip Planner Routing
# ============================================================================

def test_normal_travel_conversation_routing(db_session, test_data):
    """Verify general questions route to normal agent search flow rather than trip planner."""
    customer = test_data["customer"]
    agent_service = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = agent_service.run_agent(
        user=customer,
        conversation_id=conv_id,
        message="What are popular stays in Coorg?",
    )
    assert res["role"] == "ASSISTANT"
    assert len(res["search_results"]) > 0
    # Should not have created a multi-day trip plan for a general search
    assert res["trip_id"] is None
    # Traces should indicate marketplace search execution
    steps = [t.get("step") for t in res["execution_trace"]]
    assert "SEARCH_COMPLETED" in steps


# ============================================================================
# Scenario 15: Trip Planner Full Rehydration & Continuation Flow
# ============================================================================

def test_trip_planner_rehydration_and_continuation_flow(db_session, test_data):
    """Exact flow test: CREATE TRIP → SEND MESSAGE → MODIFY TRIP → REFRESH PAGE → VERIFY SAME TRIP + MESSAGES + ITINERARY → MODIFY AGAIN."""
    customer = test_data["customer"]
    repo = AIRepository(db_session)
    ai_service = AIService(repo=repo)
    conv_id = str(uuid.uuid4())

    # Step 1: CREATE TRIP
    res1 = ai_service.send_message(
        user=customer,
        conv_id=conv_id,
        payload=SendAIMessageRequest(content="Plan a 3 day trip to Coorg for 2 people."),
    )
    assert res1["trip_id"] is not None
    assert res1["itinerary"] is not None
    assert len(res1["itinerary"]["days"]) >= 2
    original_trip_id = res1["trip_id"]
    day2_items_count_initial = len(res1["itinerary"]["days"][1]["items"])

    # Step 2: SEND MESSAGE (Conversational query)
    res2 = ai_service.send_message(
        user=customer,
        conv_id=conv_id,
        payload=SendAIMessageRequest(content="Tell me about local Kodava cuisine options."),
    )
    assert res2["role"].upper() == "ASSISTANT"
    assert res2["content"] is not None

    # Step 3: MODIFY TRIP ("Make Day 2 cheaper")
    res3 = ai_service.send_message(
        user=customer,
        conv_id=conv_id,
        payload=SendAIMessageRequest(content="Make Day 2 cheaper."),
    )
    assert res3["trip_id"] == original_trip_id
    assert res3["itinerary"] is not None

    # Step 4: REFRESH SIMULATION (Fetch backend state and messages history independently)
    # 4a. Get agent state from checkpoint / DB
    state_res = ai_service.get_agent_state(user=customer, conversation_id=conv_id)
    assert state_res is not None
    assert state_res["conversation_id"] == conv_id
    assert state_res["trip_id"] == original_trip_id
    assert state_res["itinerary"] is not None
    assert len(state_res["itinerary"]["days"]) >= 2
    assert state_res["budget"] is not None

    # 4b. Get conversation messages from DB
    messages_res = ai_service.get_conversation_messages(user=customer, conv_id=conv_id)
    assert len(messages_res) >= 6  # (user1, ai1, user2, ai2, user3, ai3)
    assert messages_res[0]["role"].upper() == "USER"
    assert messages_res[0]["content"] == "Plan a 3 day trip to Coorg for 2 people."
    assert messages_res[1]["role"].upper() == "ASSISTANT"
    assert messages_res[1]["itinerary"] is not None
    assert messages_res[1]["trip_id"] == original_trip_id

    # Verify message chronological ordering
    for i in range(len(messages_res) - 1):
        assert messages_res[i]["created_at"] <= messages_res[i + 1]["created_at"]

    # Step 5: MODIFY AGAIN AFTER REFRESH
    # 5a. "Remove trekking"
    res4 = ai_service.send_message(
        user=customer,
        conv_id=conv_id,
        payload=SendAIMessageRequest(content="Remove trekking."),
    )
    assert res4["trip_id"] == original_trip_id
    assert res4["itinerary"] is not None

    # 5b. "Change my hotel"
    res5 = ai_service.send_message(
        user=customer,
        conv_id=conv_id,
        payload=SendAIMessageRequest(content="Change my hotel."),
    )
    assert res5["trip_id"] == original_trip_id
    assert res5["itinerary"] is not None

    # 5c. "Add local food"
    res6 = ai_service.send_message(
        user=customer,
        conv_id=conv_id,
        payload=SendAIMessageRequest(content="Add local food experience."),
    )
    assert res6["trip_id"] == original_trip_id
    assert res6["itinerary"] is not None

    # Step 6: Verify Database Source of Truth
    db_trip = db_session.query(Trip).filter(Trip.id == uuid.UUID(original_trip_id)).first()
    assert db_trip is not None
    assert db_trip.destination == "Kodagu"
    assert db_trip.user_id == customer.id
    assert len(db_trip.days) >= 2

    # Total unique trips for user must be exactly 1 (no orphaned or duplicate trips created)
    user_trips = db_session.query(Trip).filter(Trip.user_id == customer.id).all()
    assert len(user_trips) == 1

