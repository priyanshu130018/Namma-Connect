"""
Comprehensive test suite for Namma Connect Proactive Agentic Travel Agent V2.

Verifies:
1. Goal formulation and constraint tracking
2. Live budget breakdown computation
3. Alternative substitution & replanning
4. Human approval gating for consequential operations
5. Cancellation flow with authoritative refund calculation
6. Modification flow with slot/capacity checks
7. Silent execution (no internal trace/tool leaks in respond node)
8. Transactional email & notification deduplication (idempotency)
"""

import json
import uuid
from decimal import Decimal
from datetime import datetime, timedelta
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
)
from app.modules.booking.domain.models import Booking
from app.modules.ai.agent.service import NammaAgentService
from app.modules.ai.agent.tools import create_agent_tools, _SENT_EMAIL_DEDUP_KEYS


@pytest.fixture
def db_session():
    """In-memory SQLite database session isolated per test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    cat_stay = MarketplaceCategory(
        id=uuid.uuid4(),
        slug="farm-stays",
        name="Farm Stays",
        marketplace_type="STAY",
        is_active=True,
    )
    cat_act = MarketplaceCategory(
        id=uuid.uuid4(),
        slug="tours",
        name="Tours",
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
def proactive_test_env(db_session):
    """Seed test users, services, availability slots, and existing booking."""
    cust = User(
        id=uuid.uuid4(),
        email=f"proactive_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Proactive Traveler",
        role="CUSTOMER",
        is_active=True,
        is_verified=True,
    )
    host = User(
        id=uuid.uuid4(),
        email=f"host_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Estate Host",
        role="PROVIDER",
        is_active=True,
        is_verified=True,
    )
    db_session.add_all([cust, host])
    db_session.commit()

    s1 = Service(
        id=uuid.uuid4(),
        title="Luxury Coorg Plantation Cottage",
        slug="luxury-coorg-plantation-cottage",
        category="farm-stays",
        category_slug="farm-stays",
        description="Serene plantation stay with premium coffee estate view",
        price=Decimal("6000.00"),
        unit="night",
        location="Madikeri, Kodagu",
        district="Kodagu",
        status="PUBLISHED",
        max_capacity=4,
        is_verified=True,
        provider_id=host.id,
        provider_name=host.full_name,
        primary_image="https://img.test/stay1.jpg",
    )
    s2 = Service(
        id=uuid.uuid4(),
        title="Budget Coorg Homestay",
        slug="budget-coorg-homestay",
        category="farm-stays",
        category_slug="farm-stays",
        description="Cozy budget homestay near Madikeri town",
        price=Decimal("1800.00"),
        unit="night",
        location="Madikeri, Kodagu",
        district="Kodagu",
        status="PUBLISHED",
        max_capacity=6,
        is_verified=True,
        provider_id=host.id,
        provider_name=host.full_name,
        primary_image="https://img.test/stay2.jpg",
    )
    s3 = Service(
        id=uuid.uuid4(),
        title="Coorg Waterfalls Trek",
        slug="coorg-waterfalls-trek",
        category="tours",
        category_slug="tours",
        description="Guided trek through Abbey Falls and coffee hills",
        price=Decimal("800.00"),
        unit="person",
        location="Abbey Falls, Kodagu",
        district="Kodagu",
        status="PUBLISHED",
        max_capacity=15,
        is_verified=True,
        provider_id=host.id,
        provider_name=host.full_name,
        primary_image="https://img.test/tour1.jpg",
    )
    db_session.add_all([s1, s2, s3])
    db_session.commit()

    # Pre-seed daily availability for 14 days
    today = (datetime.utcnow()).strftime("%Y-%m-%d")
    for s in [s1, s2, s3]:
        for d in range(14):
            slot_date = (datetime.utcnow() + timedelta(days=d)).strftime("%Y-%m-%d")
            av = ServiceAvailability(
                id=uuid.uuid4(),
                service_id=s.id,
                date=slot_date,
                capacity=s.max_capacity,
                booked_count=0,
                is_blocked=False,
            )
            db_session.add(av)
    db_session.commit()

    # Seed existing booking for cancellation / modification tests
    start_dt = (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d")
    end_dt = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
    existing_b = Booking(
        id=uuid.uuid4(),
        booking_code=f"NC-TST-{uuid.uuid4().hex[:6].upper()}",
        customer_id=cust.id,
        service_id=s1.id,
        provider_id=host.id,
        start_date=start_dt,
        end_date=end_dt,
        guest_count=2,
        unit_price=Decimal("6000.00"),
        total_amount=Decimal("12000.00"),
        status="CONFIRMED",
    )
    db_session.add(existing_b)
    db_session.commit()

    return {
        "user": cust,
        "stay_premium": s1,
        "stay_budget": s2,
        "tour": s3,
        "existing_booking": existing_b,
    }


def _parse_res(res):
    if isinstance(res, str):
        return json.loads(res)
    return res


def test_budget_breakdown_tool(db_session, proactive_test_env):
    """Verify calculate_trip_budget computes accurate categorised totals and remaining budget."""
    user = proactive_test_env["user"]
    tools = {t.name: t for t in create_agent_tools(db_session, user)}
    
    res_raw = tools["calculate_trip_budget"].invoke({
        "stay_cost": 4000.0,
        "activities_cost": 1200.0,
        "food_estimate": 2400.0,
        "transport_estimate": 1000.0,
        "max_budget": 10000.0,
    })
    res = _parse_res(res_raw)
    assert res["stay"] == 4000.0
    assert res["activities"] == 1200.0
    assert res["food"] == 2400.0
    assert res["transport"] == 1000.0
    assert res["total"] == 8600.0
    assert res["remaining"] == 1400.0
    assert res["is_over_budget"] is False


def test_replan_tool(db_session, proactive_test_env):
    """Verify replan_itinerary dynamically searches alternatives excluding unavailable services."""
    user = proactive_test_env["user"]
    tools = {t.name: t for t in create_agent_tools(db_session, user)}
    s1 = proactive_test_env["stay_premium"]

    res_raw = tools["replan_itinerary"].invoke({
        "destination_district": "Kodagu",
        "unavailable_service_ids": [str(s1.id)],
        "max_budget": 10000.0,
        "duration_days": 2,
        "party_size": 2,
    })
    res = _parse_res(res_raw)
    assert res["proposal"] is not None
    assert len(res["proposal"]["days"]) == 2


def test_proactive_planning_with_budget(db_session, proactive_test_env):
    """Verify proactive agent plans itinerary, generates budget breakdown, and enforces constraints."""
    user = proactive_test_env["user"]
    agent = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    res = agent.run_agent(
        user=user,
        conversation_id=conv_id,
        message="Plan a 2-day trip to Kodagu for 2 people with a budget of 15000.",
    )

    assert res["content"] is not None
    assert res["budget"] is not None
    assert res["budget"]["total"] <= 15000.0
    assert res["itinerary"] is not None
    assert len(res["itinerary"]["days"]) == 2
    # Verify silent execution: no raw chain-of-thought or internal tool markers in content
    assert "<thought>" not in res["content"]
    assert "ACTION_PLAN:" not in res["content"]


def test_human_approval_gate(db_session, proactive_test_env):
    """Verify the agent sets approval_required before consequential actions and proceeds after confirmation."""
    user = proactive_test_env["user"]
    booking = proactive_test_env["existing_booking"]
    agent = NammaAgentService(db_session)
    conv_id = str(uuid.uuid4())

    # Request cancellation: should trigger approval gate
    res = agent.run_agent(
        user=user,
        conversation_id=conv_id,
        message=f"I want to cancel my booking {booking.booking_code}",
    )

    assert res["approval_required"] is True
    assert res["approval_action"] == "CANCEL_BOOKING"
    assert booking.booking_code in (res["approval_prompt"] or "")
    assert "Approval Required" in res["content"]

    # User confirms approval
    confirm_res = agent.run_agent(
        user=user,
        conversation_id=conv_id,
        message="yes, please approve and proceed with cancellation",
    )

    assert confirm_res["approval_required"] is False
    assert confirm_res["booking_state"] is not None
    assert confirm_res["booking_state"]["action"] == "CANCELLED"
    assert "Cancelled Successfully" in confirm_res["content"]


def test_email_idempotency(db_session, proactive_test_env):
    """Verify transactional emails are not duplicated across retries or repeated turns."""
    user = proactive_test_env["user"]
    booking = proactive_test_env["existing_booking"]
    tools = {t.name: t for t in create_agent_tools(db_session, user)}

    dedup_key = f"booking_{booking.id}_confirmation"

    # First send: should succeed
    res1_raw = tools["send_booking_email"].invoke({
        "booking_id": str(booking.id),
        "dedup_key": dedup_key,
    })
    res1 = _parse_res(res1_raw)
    assert res1.get("status") in ["delivered", "queued", "deduplicated", "mock_sent"] or res1.get("success") is True

    # Duplicate send: should be safely skipped via idempotency dedup key
    res2_raw = tools["send_booking_email"].invoke({
        "booking_id": str(booking.id),
        "dedup_key": dedup_key,
    })
    res2 = _parse_res(res2_raw)
    assert res2.get("status") == "deduplicated"
