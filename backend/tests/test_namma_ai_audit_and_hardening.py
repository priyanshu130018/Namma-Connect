"""Authoritative 18-Scenario E2E Test Matrix for Namma AI Agent Audit and Hardening.

Covers the complete 18-scenario hardening specification:
1.  Search only
2.  Personalized search
3.  Search + budget
4.  Search + date
5.  Multi-service trip
6.  Trip modification
7.  Availability failure
8.  Price change
9.  Explicit booking
10. Booking failure
11. Payment failure
12. Conversation resume
13. Cross-user authorization
14. No-result search
15. No-valid-itinerary-under-budget
16. Cold-start user
17. Highly personalized user
18. Unavailable provider/service
"""

import json
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

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
from app.modules.recommendation.domain.models import (
    UserInteraction,
    UserInterestProfile,
)
from app.modules.ai.agent.persistence import (
    AICheckpointRecord,
    SQLAlchemyCheckpointSaver,
)
from app.modules.ai.agent.policies import AgentPolicies, PolicyEnforcementError
from app.modules.ai.agent.tools import TOOL_AUTHORITY, create_agent_tools
from app.modules.ai.agent.service import NammaAgentService


@pytest.fixture
def db_session():
    """Isolated thread-safe SQLite in-memory database session fixture."""
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
    cat_tour = MarketplaceCategory(
        id=uuid.uuid4(),
        slug="plantation-tours",
        name="Plantation Tours",
        marketplace_type="EXPERIENCE",
        is_active=True,
    )
    cat_adv = MarketplaceCategory(
        id=uuid.uuid4(),
        slug="adventure-trekking",
        name="Adventure & Trekking",
        marketplace_type="EXPERIENCE",
        is_active=True,
    )
    session.add_all([cat_stay, cat_tour, cat_adv])
    session.commit()

    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def agent_fixture_data(db_session):
    """Seed comprehensive test dataset across multiple users, services, dates, and slots."""
    # 1. Active Providers
    active_host = User(
        id=uuid.uuid4(),
        email="host.active@example.com",
        full_name="Active Host",
        role="provider",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
    )
    # 2. Suspended / Inactive Provider
    suspended_host = User(
        id=uuid.uuid4(),
        email="host.suspended@example.com",
        full_name="Suspended Host",
        role="provider",
        is_active=False,
        is_verified=False,
        is_synthetic=True,
    )

    # 3. Customer A: Highly personalized (adventure & nature)
    user_a = User(
        id=uuid.uuid4(),
        email="usera.nature@example.com",
        full_name="User A Nature Lover",
        role="user",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
        travel_preferences=json.dumps({
            "interests": ["adventure-trekking", "plantation-tours"],
            "budget_style": "balanced",
            "pace": "MODERATE",
        }),
    )

    # 4. Customer B: Cold-start user (no interactions, no bookings, no prefs)
    user_b_cold = User(
        id=uuid.uuid4(),
        email="userb.coldstart@example.com",
        full_name="User B Cold Start",
        role="user",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
        travel_preferences=None,
    )

    # 5. Customer C: Unauthorized third party
    user_c_intruder = User(
        id=uuid.uuid4(),
        email="userc.intruder@example.com",
        full_name="User C Intruder",
        role="user",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
    )

    db_session.add_all([active_host, suspended_host, user_a, user_b_cold, user_c_intruder])
    db_session.commit()

    # User A interest profile
    profile_a = UserInterestProfile(
        id=uuid.uuid4(),
        user_id=user_a.id,
        category_affinity_json=json.dumps({
            "adventure-trekking": 0.95,
            "plantation-tours": 0.85,
            "farm-stays": 0.40,
        }),
        destination_affinity_json=json.dumps({"Kodagu": 0.90}),
        budget_band_json=json.dumps({"min": 1000, "max": 15000}),
        interest_score=0.92,
        confidence_score=0.88,
        is_synthetic=True,
    )
    db_session.add(profile_a)
    db_session.commit()

    # Services
    # S1: Affordable Stay in Kodagu
    s1_stay = Service(
        id=uuid.uuid4(),
        title="Coorg Green Hills Estate Stay",
        slug="coorg-green-hills-estate-stay",
        category="farm-stays",
        category_slug="farm-stays",
        description="Serene coffee estate stay in Madikeri.",
        location="Madikeri, Kodagu",
        district="Kodagu",
        price=Decimal("4500.00"),
        unit="night",
        max_capacity=4,
        rating=Decimal("4.8"),
        reviews_count=24,
        is_verified=True,
        status="PUBLISHED",
        provider_id=active_host.id,
        provider_name=active_host.full_name,
        primary_image="https://img.test/green-hills.jpg",
        is_synthetic=True,
    )

    # S2: Plantation Tour in Kodagu
    s2_tour = Service(
        id=uuid.uuid4(),
        title="Kodagu Organic Coffee & Cardamom Tour",
        slug="kodagu-organic-coffee-cardamom-tour",
        category="plantation-tours",
        category_slug="plantation-tours",
        description="Guided walk through certified organic plantation.",
        location="Virajpet, Kodagu",
        district="Kodagu",
        price=Decimal("800.00"),
        unit="person",
        max_capacity=12,
        rating=Decimal("4.9"),
        reviews_count=40,
        is_verified=True,
        status="PUBLISHED",
        provider_id=active_host.id,
        provider_name=active_host.full_name,
        primary_image="https://img.test/coffee-tour.jpg",
        is_synthetic=True,
    )

    # S3: High-end luxury villa in Kodagu
    s3_luxury = Service(
        id=uuid.uuid4(),
        title="Royal Coorg Heritage Villa",
        slug="royal-coorg-heritage-villa",
        category="farm-stays",
        category_slug="farm-stays",
        description="Luxury heritage estate with private chef.",
        location="Madikeri, Kodagu",
        district="Kodagu",
        price=Decimal("32000.00"),
        unit="night",
        max_capacity=6,
        rating=Decimal("4.95"),
        reviews_count=12,
        is_verified=True,
        status="PUBLISHED",
        provider_id=active_host.id,
        provider_name=active_host.full_name,
        primary_image="https://img.test/royal-villa.jpg",
        is_synthetic=True,
    )

    # S4: Dynamic Price Service with weekend price override
    s4_dynamic = Service(
        id=uuid.uuid4(),
        title="Tadiandamol Peak Adventure Camp",
        slug="tadiandamol-peak-adventure-camp",
        category="adventure-trekking",
        category_slug="adventure-trekking",
        description="High altitude base camp and sunrise trekking.",
        location="Kakkabe, Kodagu",
        district="Kodagu",
        price=Decimal("2000.00"),
        unit="person",
        max_capacity=10,
        rating=Decimal("4.85"),
        reviews_count=18,
        is_verified=True,
        status="PUBLISHED",
        provider_id=active_host.id,
        provider_name=active_host.full_name,
        primary_image="https://img.test/peak-camp.jpg",
        is_synthetic=True,
    )

    # S5: Service belonging to suspended provider
    s5_suspended = Service(
        id=uuid.uuid4(),
        title="Suspended Host Mountain Lodge",
        slug="suspended-host-mountain-lodge",
        category="farm-stays",
        category_slug="farm-stays",
        description="Lodge whose provider is deactivated.",
        location="Madikeri, Kodagu",
        district="Kodagu",
        price=Decimal("4000.00"),
        unit="night",
        max_capacity=4,
        rating=Decimal("3.5"),
        reviews_count=2,
        is_verified=False,
        status="PUBLISHED",
        provider_id=suspended_host.id,
        provider_name=suspended_host.full_name,
        primary_image="https://img.test/suspended.jpg",
        is_synthetic=True,
    )

    # S6: Draft (Unpublished) Service
    s6_draft = Service(
        id=uuid.uuid4(),
        title="Unpublished Draft Homestay",
        slug="unpublished-draft-homestay",
        category="farm-stays",
        category_slug="farm-stays",
        description="Draft listing not yet published.",
        location="Madikeri, Kodagu",
        district="Kodagu",
        price=Decimal("3000.00"),
        unit="night",
        max_capacity=4,
        rating=Decimal("0.0"),
        reviews_count=0,
        is_verified=False,
        status="DRAFT",
        provider_id=active_host.id,
        provider_name=active_host.full_name,
        primary_image="https://img.test/draft.jpg",
        is_synthetic=True,
    )

    db_session.add_all([s1_stay, s2_tour, s3_luxury, s4_dynamic, s5_suspended, s6_draft])
    db_session.commit()

    # Availability slots
    target_date = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
    blocked_date = "2026-12-25"
    price_override_date = "2026-11-15"

    # Slot 1: Open slot on target_date for s1
    slot_open = ServiceAvailability(
        id=uuid.uuid4(),
        service_id=s1_stay.id,
        date=target_date,
        capacity=4,
        booked_count=1,
        is_blocked=False,
        is_synthetic=True,
    )
    # Slot 2: Blocked slot on Christmas for s2
    slot_blocked = ServiceAvailability(
        id=uuid.uuid4(),
        service_id=s2_tour.id,
        date=blocked_date,
        capacity=10,
        booked_count=0,
        is_blocked=True,
        is_synthetic=True,
    )
    # Slot 3: Price Override slot on 2026-11-15 (base 2000 -> override 3500)
    slot_override = ServiceAvailability(
        id=uuid.uuid4(),
        service_id=s4_dynamic.id,
        date=price_override_date,
        capacity=10,
        booked_count=2,
        is_blocked=False,
        price_override=Decimal("3500.00"),
        is_synthetic=True,
    )
    # Slot 4: Fully booked slot for s1
    fully_booked_date = "2026-10-30"
    slot_full = ServiceAvailability(
        id=uuid.uuid4(),
        service_id=s1_stay.id,
        date=fully_booked_date,
        capacity=4,
        booked_count=4,
        is_blocked=False,
        is_synthetic=True,
    )

    db_session.add_all([slot_open, slot_blocked, slot_override, slot_full])

    # Saved service for User A
    saved = SavedService(
        id=uuid.uuid4(),
        user_id=user_a.id,
        service_id=s4_dynamic.id,
        is_synthetic=True,
    )
    db_session.add(saved)
    db_session.commit()

    return {
        "active_host": active_host,
        "suspended_host": suspended_host,
        "user_a": user_a,
        "user_b_cold": user_b_cold,
        "user_c_intruder": user_c_intruder,
        "s1_stay": s1_stay,
        "s2_tour": s2_tour,
        "s3_luxury": s3_luxury,
        "s4_dynamic": s4_dynamic,
        "s5_suspended": s5_suspended,
        "s6_draft": s6_draft,
        "target_date": target_date,
        "blocked_date": blocked_date,
        "price_override_date": price_override_date,
        "fully_booked_date": fully_booked_date,
    }


# ============================================================================
# Scenario 1: Marketplace Search
# ============================================================================
def test_scenario_01_marketplace_search(db_session, agent_fixture_data):
    """User requests stays without planning or booking; receives verified options with no trip creation."""
    user = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Show me stays in Coorg",
    )

    assert res["role"] == "ASSISTANT"
    assert len(res["search_results"]) > 0
    # Search only must NOT create an itinerary or trip container
    assert res.get("trip_id") is None
    assert res.get("itinerary") is None
    assert res.get("booking_state") is None
    # Must list real Coorg stay
    titles = [s["title"] for s in res["search_results"]]
    assert any("Coorg Green Hills" in t for t in titles)


# ============================================================================
# Scenario 2: Personalized Search
# ============================================================================
def test_scenario_02_personalized_search(db_session, agent_fixture_data):
    """Agent loads user context and affinities, prioritizing adventure and plantation tour options."""
    user = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Find activities based on my profile in Coorg",
    )

    steps = [t.get("step") for t in res["execution_trace"]]
    assert "LOADING_CONTEXT" in steps
    assert "SEARCH_COMPLETED" in steps
    assert len(res["search_results"]) > 0
    # Top result should match user's top affinity category (adventure or plantation)
    top_cat = res["search_results"][0]["category_slug"]
    assert top_cat in ["adventure-trekking", "plantation-tours"]


# ============================================================================
# Scenario 3: Search + Budget
# ============================================================================
def test_scenario_03_search_with_budget(db_session, agent_fixture_data):
    """Search with budget cap strictly enforces max_price <= 5000 and filters out 32k luxury villa."""
    user = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Find stays in Coorg under ₹5,000",
    )

    assert len(res["search_results"]) > 0
    for item in res["search_results"]:
        assert item["price"] <= 5000.0
    titles = [s["title"] for s in res["search_results"]]
    assert not any("Royal Coorg Heritage Villa" in t for t in titles)


# ============================================================================
# Scenario 4: Search + Date
# ============================================================================
def test_scenario_04_search_with_date(db_session, agent_fixture_data):
    """Search with explicit travel date checks real-time slot availability for that exact date."""
    user = agent_fixture_data["user_a"]
    target_date = agent_fixture_data["target_date"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message=f"Check stays in Coorg for {target_date}",
    )

    avail_results = res.get("availability_results", [])
    assert len(avail_results) > 0
    assert avail_results[0]["date"] == target_date


# ============================================================================
# Scenario 5: Search + Traveler Count
# ============================================================================
def test_scenario_05_search_with_traveler_count(db_session, agent_fixture_data):
    """Search with traveler count extracts party size and respects capacity constraints."""
    user = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Find stays in Coorg for 4 guests",
    )

    reqs = res.get("extracted_requirements", {})
    assert reqs.get("party_size") == 4
    assert len(res["search_results"]) > 0
    for item in res["search_results"]:
        s_row = db_session.query(Service).filter(Service.id == uuid.UUID(item["id"])).first()
        assert s_row.max_capacity >= 4


# ============================================================================
# Scenario 6: Multi-Service Itinerary
# ============================================================================
def test_scenario_06_multiservice_itinerary(db_session, agent_fixture_data):
    """Agent plans multi-day trip, builds schedule days, validates budget, and persists Trip."""
    user = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Plan a 2-day Coorg trip for 2 people under ₹15,000.",
    )

    assert res["trip_id"] is not None
    assert res["itinerary"] is not None
    days = res["itinerary"]["days"]
    assert len(days) >= 2
    # Verify DB persistence
    trip_record = db_session.query(Trip).filter(Trip.id == uuid.UUID(res["trip_id"])).first()
    assert trip_record is not None
    assert trip_record.destination == "Kodagu"
    assert trip_record.is_synthetic is True


# ============================================================================
# Scenario 7: Itinerary Modification
# ============================================================================
def test_scenario_07_itinerary_modification(db_session, agent_fixture_data):
    """Multi-turn refinement makes itinerary cheaper and persists updated Trip state."""
    user = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Turn 1: Build initial trip
    res1 = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Plan a 2-day trip to Coorg.",
    )
    cost1 = res1["itinerary"]["total_estimated_cost"]

    # Turn 2: Modify trip to make it cheaper
    res2 = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Make it cheaper and reduce budget to ₹5,000.",
    )
    cost2 = res2["itinerary"]["total_estimated_cost"]
    assert cost2 <= cost1


# ============================================================================
# Scenario 8: No-Result Search
# ============================================================================
def test_scenario_08_no_result_search(db_session, agent_fixture_data):
    """Search in a district with 0 listings returns empty results honestly without fabrication."""
    user = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = svc.run_agent(user=user, conversation_id=conv_id, message="Find farm stays in Bidar")
    assert len(res["search_results"]) == 0
    assert "no available stays" in res["content"].lower() or "found no" in res["content"].lower()


# ============================================================================
# Scenario 9: No-Valid-Plan-Under-Budget
# ============================================================================
def test_scenario_09_no_valid_plan_under_budget(db_session, agent_fixture_data):
    """When budget is impossibly low (e.g. ₹500 for a 3-day trip), agent honestly reports budget constraint."""
    user = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Plan a 3-day Coorg trip for 2 people with a total budget of ₹500",
    )

    assert "Budget Constraint Alert" in res["content"] or "cannot be fully satisfied" in res["content"] or "exceeds" in res["content"].lower()


# ============================================================================
# Scenario 10: Availability Failure
# ============================================================================
def test_scenario_10_availability_failure(db_session, agent_fixture_data):
    """Agent detects blocked slot or capacity exhaustion and honestly rejects booking."""
    user = agent_fixture_data["user_a"]
    s2 = agent_fixture_data["s2_tour"]
    blocked_date = agent_fixture_data["blocked_date"]

    avail = AgentPolicies.verify_real_availability(
        db=db_session,
        service_id=str(s2.id),
        start_date=blocked_date,
        guests_count=1,
    )
    assert avail["available"] is False
    assert "blocked" in avail["reason"].lower()


# ============================================================================
# Scenario 11: Price Change
# ============================================================================
def test_scenario_11_price_change(db_session, agent_fixture_data):
    """Tool calculate_service_pricing applies date-specific price override instead of standard price."""
    user = agent_fixture_data["user_a"]
    s4 = agent_fixture_data["s4_dynamic"]
    override_date = agent_fixture_data["price_override_date"]
    tools = create_agent_tools(db_session, user)

    pricing_tool = next(t for t in tools if t.name == "calculate_service_pricing")
    res = pricing_tool.invoke({
        "service_id": str(s4.id),
        "start_date": override_date,
        "guests_count": 1,
    })

    # Standard price is 2000, slot override is 3500
    assert res["unit_price"] == 3500.0
    assert res["price_override_applied"] is True


# ============================================================================
# Scenario 12: Capacity Failure
# ============================================================================
def test_scenario_12_capacity_failure(db_session, agent_fixture_data):
    """When a service date slot has insufficient spots for requested travelers, availability rejects with capacity alert."""
    s1 = agent_fixture_data["s1_stay"]
    fully_booked_date = agent_fixture_data["fully_booked_date"]

    avail = AgentPolicies.verify_real_availability(
        db=db_session,
        service_id=str(s1.id),
        start_date=fully_booked_date,
        guests_count=2,
    )
    assert avail["available"] is False
    assert "capacity" in avail["reason"].lower() or "remaining" in avail["reason"].lower() or "0 spots" in avail["reason"].lower()


# ============================================================================
# Scenario 13: Explicit Booking
# ============================================================================
def test_scenario_13_explicit_booking(db_session, agent_fixture_data):
    """Explicit booking intent triggers real Booking and Payment order creation without LLM hallucination."""
    user = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Turn 1: Discover
    svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Plan a 2-day Coorg trip.",
    )

    # Turn 2: Request booking readiness
    readiness_res = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Book this trip",
    )
    assert readiness_res.get("approval_required") is True
    assert readiness_res.get("approval_action") == "BOOKING"

    # Turn 3: Explicit booking confirmation
    book_res = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Confirm booking",
    )

    b_state = book_res.get("booking_state")
    assert b_state is not None
    assert b_state["success"] is True
    assert b_state["booking_code"].startswith("NC-")
    assert b_state["payment_order_id"].startswith("order_")
    assert "Booking Confirmed" in book_res["content"]

    # Verify real DB row
    booking_row = db_session.query(Booking).filter(Booking.booking_code == b_state["booking_code"]).first()
    assert booking_row is not None
    assert booking_row.customer_id == user.id
    assert booking_row.is_synthetic is True


# ============================================================================
# Scenario 14: Payment Failure
# ============================================================================
def test_scenario_14_payment_failure(db_session, agent_fixture_data):
    """When payment gateway order creation fails, agent captures failure honestly without hallucinating."""
    user = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Prime conversation & readiness
    svc.run_agent(user=user, conversation_id=conv_id, message="Plan a 2-day Coorg trip.")
    svc.run_agent(user=user, conversation_id=conv_id, message="Book this trip")

    with patch("app.modules.payment.application.service.PaymentService.create_order", side_effect=RuntimeError("Gateway Timeout")):
        res = svc.run_agent(user=user, conversation_id=conv_id, message="Confirm booking")

    b_state = res.get("booking_state")
    assert b_state is not None
    assert b_state["success"] is False
    assert "payment order" in b_state["error"].lower()


# ============================================================================
# Scenario 15: Conversation Resume
# ============================================================================
def test_scenario_15_conversation_resume(db_session, agent_fixture_data):
    """LangGraph checkpoints persist to database table and resume across independent invocations."""
    user = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Turn 1
    res1 = svc.run_agent(user=user, conversation_id=conv_id, message="Plan a 2 day Coorg trip under ₹10,000")
    trip_id1 = res1["trip_id"]

    # State check from persistent checkpointer
    persisted_state = svc.get_agent_state(user=user, conversation_id=conv_id)
    assert persisted_state is not None
    assert persisted_state["trip_id"] == trip_id1

    # Turn 2 resumes with existing context
    res2 = svc.run_agent(user=user, conversation_id=conv_id, message="Make it cheaper")
    assert res2["trip_id"] == trip_id1


# ============================================================================
# Scenario 16: Cross-User Authorization
# ============================================================================
def test_scenario_16_cross_user_authorization(db_session, agent_fixture_data):
    """User C cannot inspect or modify User A's private trip."""
    user_a = agent_fixture_data["user_a"]
    user_c = agent_fixture_data["user_c_intruder"]

    # User A creates a trip
    trip_a = Trip(
        id=uuid.uuid4(),
        user_id=user_a.id,
        title="User A Private Vacation",
        destination="Kodagu",
        is_synthetic=True,
    )
    db_session.add(trip_a)
    db_session.commit()

    # User C tries to access / verify ownership
    with pytest.raises(PolicyEnforcementError) as exc:
        AgentPolicies.verify_trip_ownership(db=db_session, user=user_c, trip_id=str(trip_a.id))
    assert "not authorized" in str(exc.value).lower()


# ============================================================================
# Scenario 17: Cold-Start User
# ============================================================================
def test_scenario_17_cold_start_user(db_session, agent_fixture_data):
    """A fresh user with zero interaction history or profile safely falls back to top-rated defaults."""
    user_cold = agent_fixture_data["user_b_cold"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = svc.run_agent(
        user=user_cold,
        conversation_id=conv_id,
        message="Find stays in Coorg",
    )

    assert res["role"] == "ASSISTANT"
    assert len(res["search_results"]) > 0
    # Trace must acknowledge cold-start profile
    trace_msgs = [t.get("message", "") for t in res["execution_trace"]]
    assert any("Cold-start" in m for m in trace_msgs)


# ============================================================================
# Scenario 18: Highly Personalized User
# ============================================================================
def test_scenario_18_highly_personalized_user(db_session, agent_fixture_data):
    """User with extensive interaction profile receives suggestions boosted by category affinities."""
    user_a = agent_fixture_data["user_a"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = svc.run_agent(
        user=user_a,
        conversation_id=conv_id,
        message="Recommend something for my next trip in Coorg",
    )

    assert len(res["search_results"]) > 0
    top_result = res["search_results"][0]
    # Adventure or plantation should be prioritized over generic stay
    assert top_result["category_slug"] in ["adventure-trekking", "plantation-tours"]


# ============================================================================
# Scenario 19: Booking Failure on Blocked Date
# ============================================================================
def test_scenario_19_booking_failure_blocked(db_session, agent_fixture_data):
    """Attempting to book a blocked date slot fails with honest error message and no fake confirmation."""
    user = agent_fixture_data["user_a"]
    s2 = agent_fixture_data["s2_tour"]
    blocked_date = agent_fixture_data["blocked_date"]
    svc = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Prime conversation with target date and specific service
    svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message=f"Show me Kodagu Organic Coffee & Cardamom Tour in Coorg for {blocked_date}",
    )

    # Attempt to book
    res = svc.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Book it now!",
    )

    b_state = res.get("booking_state")
    assert b_state is not None
    assert b_state["success"] is False
    assert "blocked" in b_state["error"].lower()
    assert "unavailable" in res["content"].lower() or "blocked" in res["content"].lower()


# ============================================================================
# Scenario 20: Unavailable Provider / Service Protection
# ============================================================================
def test_scenario_20_unavailable_provider_protection(db_session, agent_fixture_data):
    """Inactive provider or unpublished draft service cannot be recommended or verified."""
    s5_suspended = agent_fixture_data["s5_suspended"]
    s6_draft = agent_fixture_data["s6_draft"]

    # 1. Suspended provider must fail policy verification
    with pytest.raises(PolicyEnforcementError) as exc1:
        AgentPolicies.verify_real_service(db=db_session, service_id=str(s5_suspended.id))
    assert "inactive or suspended" in str(exc1.value).lower()

    # 2. Draft service must fail policy verification
    with pytest.raises(PolicyEnforcementError) as exc2:
        AgentPolicies.verify_real_service(db=db_session, service_id=str(s6_draft.id))
    assert "not active or published" in str(exc2.value).lower()


# ============================================================================
# Tool Authority Classification Verification
# ============================================================================
def test_tool_authority_classification():
    """Verify all 12 agent tools are strictly classified as READ_ONLY or MUTATING."""
    assert TOOL_AUTHORITY["search_marketplace"] == "READ_ONLY"
    assert TOOL_AUTHORITY["get_service_details"] == "READ_ONLY"
    assert TOOL_AUTHORITY["get_personalized_recommendations"] == "READ_ONLY"
    assert TOOL_AUTHORITY["check_service_availability"] == "READ_ONLY"
    assert TOOL_AUTHORITY["calculate_service_pricing"] == "READ_ONLY"
    assert TOOL_AUTHORITY["validate_itinerary_and_budget"] == "READ_ONLY"
    assert TOOL_AUTHORITY["get_booking_status"] == "READ_ONLY"
    assert TOOL_AUTHORITY["get_user_travel_context"] == "READ_ONLY"
    assert TOOL_AUTHORITY["build_or_update_itinerary"] == "MUTATING"
    assert TOOL_AUTHORITY["refine_itinerary"] == "MUTATING"
    assert TOOL_AUTHORITY["save_trip_to_database"] == "MUTATING"
    assert TOOL_AUTHORITY["execute_booking"] == "MUTATING"
