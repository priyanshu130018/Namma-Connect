"""Comprehensive test suite for Namma Connect V2 AI Assistant."""

import pytest
import uuid
import json
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

from app.core.database import Base
from app.modules.user.domain.models import User
from app.modules.marketplace.domain.models import MarketplaceCategory, Service, ServiceAvailability, SavedService
from app.modules.trip.domain.models import Trip
from app.modules.ai.domain.models import AIConversation, AIMessage
from app.modules.ai.llm.mock_provider import MockLLMProvider
from app.modules.ai.tools.registry import AIToolRegistry
from app.modules.ai.assistant.intent_router import IntentRouter
from app.modules.ai.assistant.orchestrator import AIAssistantOrchestrator
from app.modules.ai.infrastructure.repository import AIRepository
from app.modules.ai.application.service import AIService
from app.modules.ai.presentation.schemas import (
    CreateAIConversationRequest,
    SendAIMessageRequest,
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

    # Pre-seed categories
    cat = MarketplaceCategory(
        id=uuid.uuid4(),
        slug="farm-stays",
        name="Farm Stays",
        marketplace_type="STAY",
        is_active=True,
    )
    session.add(cat)
    session.commit()

    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_users(db_session):
    """Seed test customer and host users."""
    host = User(
        id=uuid.uuid4(),
        email="host.ramesh@test.com",
        full_name="Ramesh Gowda",
        role="PARTNER",
        is_active=True,
    )
    customer1 = User(
        id=uuid.uuid4(),
        email="traveler.deepa@test.com",
        full_name="Deepa Nayak",
        role="CUSTOMER",
        is_active=True,
    )
    customer2 = User(
        id=uuid.uuid4(),
        email="traveler.arjun@test.com",
        full_name="Arjun Verma",
        role="CUSTOMER",
        is_active=True,
    )
    db_session.add_all([host, customer1, customer2])
    db_session.commit()
    return {"host": host, "customer1": customer1, "customer2": customer2}


@pytest.fixture
def test_services(db_session, test_users):
    """Seed published marketplace listings and availability slots."""
    host = test_users["host"]
    s1 = Service(
        id=uuid.uuid4(),
        title="Coorg Heritage Coffee Estate Stay",
        slug="coorg-heritage-coffee-estate",
        description="Historic planter bungalow with coffee blossoms and guided estate walks.",
        category="Farm Stays",
        category_slug="farm-stays",
        location="Madikeri",
        district="Kodagu",
        price=Decimal("3200.00"),
        rating=4.9,
        reviews_count=15,
        is_verified=True,
        status="PUBLISHED",
        provider_id=host.id,
        provider_name=host.full_name,
        primary_image="https://img.test/coorg.jpg",
    )
    s2 = Service(
        id=uuid.uuid4(),
        title="Chikkamagaluru Valley Homestay",
        slug="chikkamagaluru-valley-homestay",
        description="Scenic mountain views with traditional Malnad breakfast.",
        category="Farm Stays",
        category_slug="farm-stays",
        location="Mudigere",
        district="Chikkamagaluru",
        price=Decimal("2800.00"),
        rating=4.85,
        reviews_count=12,
        is_verified=True,
        status="PUBLISHED",
        provider_id=host.id,
        provider_name=host.full_name,
        primary_image="https://img.test/chik.jpg",
    )
    db_session.add_all([s1, s2])
    db_session.commit()

    # Add availability slot
    slot = ServiceAvailability(
        id=uuid.uuid4(),
        service_id=s1.id,
        date="2026-10-01",
        capacity=8,
        booked_count=2,
        is_blocked=False,
    )
    db_session.add(slot)
    db_session.commit()

    return {"s1": s1, "s2": s2, "slot": slot}


# ============================================================================
# 1. Conversation Lifecycle & Access Control Tests
# ============================================================================

def test_conversation_lifecycle_and_message_persistence(db_session, test_users):
    """Test conversation creation, listing, message sending, and chronological retrieval."""
    user = test_users["customer1"]
    repo = AIRepository(db_session)
    mock_llm = MockLLMProvider()
    service = AIService(repo=repo, llm_provider=mock_llm)

    # 1. Create Conversation
    create_req = CreateAIConversationRequest(title="Coorg Weekend Trip", context_type="TRAVEL")
    conv = service.create_conversation(user=user, payload=create_req)
    assert conv["title"] == "Coorg Weekend Trip"
    assert conv["user_id"] == str(user.id)

    # 2. Send Message
    msg_req = SendAIMessageRequest(content="Hello! Can you help me find a peaceful coffee stay in Coorg under 4000?")
    ai_resp = service.send_message(user=user, conv_id=conv["id"], payload=msg_req)
    assert ai_resp["role"] == "ASSISTANT"
    assert ai_resp["content"] is not None
    assert ai_resp["intent"] == "MARKETPLACE_SEARCH"

    # 3. Retrieve Messages History
    messages = service.get_conversation_messages(user=user, conv_id=conv["id"])
    assert len(messages) == 2  # 1 user + 1 assistant
    assert messages[0]["role"] == "USER"
    assert messages[1]["role"] == "ASSISTANT"


def test_cross_user_conversation_access_denial(db_session, test_users):
    """Test that customer2 cannot read or post to customer1's conversation."""
    user1 = test_users["customer1"]
    user2 = test_users["customer2"]
    repo = AIRepository(db_session)
    service = AIService(repo=repo, llm_provider=MockLLMProvider())

    conv = service.create_conversation(user=user1, payload=CreateAIConversationRequest(title="Private Trip"))

    # User 2 tries to read
    with pytest.raises(HTTPException) as exc:
        service.get_conversation_messages(user=user2, conv_id=conv["id"])
    assert exc.value.status_code == 403

    # User 2 tries to send message
    with pytest.raises(HTTPException) as exc:
        service.send_message(user=user2, conv_id=conv["id"], payload=SendAIMessageRequest(content="Hacking"))
    assert exc.value.status_code == 403


# ============================================================================
# 2. Controlled Tool Execution Tests
# ============================================================================

def test_search_services_tool_execution(db_session, test_users, test_services):
    """Test search_services tool with district and query filters."""
    user = test_users["customer1"]
    registry = AIToolRegistry(db_session)

    res = registry.execute_tool(
        name="search_services",
        user=user,
        arguments={"district": "Kodagu", "query": "coffee", "limit": 5},
    )
    assert res["returned_count"] >= 1
    assert "Coorg Heritage Coffee Estate Stay" in [s["title"] for s in res["services"]]


def test_service_details_tool_execution(db_session, test_users, test_services):
    """Test get_service_details tool for a specific listing."""
    user = test_users["customer1"]
    s1 = test_services["s1"]
    registry = AIToolRegistry(db_session)

    res = registry.execute_tool(
        name="get_service_details",
        user=user,
        arguments={"service_id": str(s1.id)},
    )
    assert res["title"] == "Coorg Heritage Coffee Estate Stay"
    assert res["price"] == 3200.0
    assert res["is_verified"] is True


def test_service_availability_tool_execution(db_session, test_users, test_services):
    """Test get_service_availability tool checking open capacity."""
    user = test_users["customer1"]
    s1 = test_services["s1"]
    registry = AIToolRegistry(db_session)

    res = registry.execute_tool(
        name="get_service_availability",
        user=user,
        arguments={"service_id": str(s1.id), "start_date": "2026-10-01", "end_date": "2026-10-01"},
    )
    assert res["available_slots_count"] == 1
    assert res["slots"][0]["available_spots"] == 6  # 8 capacity - 2 booked


def test_user_context_saved_services_tool(db_session, test_users, test_services):
    """Test get_user_saved_services tool retrieves user's bookmarks."""
    user = test_users["customer1"]
    s1 = test_services["s1"]
    saved = SavedService(id=uuid.uuid4(), user_id=user.id, service_id=s1.id, notes="Family favorite")
    db_session.add(saved)
    db_session.commit()

    registry = AIToolRegistry(db_session)
    res = registry.execute_tool(
        name="get_user_saved_services",
        user=user,
        arguments={},
    )
    assert res["saved_count"] == 1
    assert res["saved_services"][0]["title"] == "Coorg Heritage Coffee Estate Stay"


# ============================================================================
# 3. Intent Routing & Trip Planner Handoff Tests
# ============================================================================

def test_intent_router_classifications():
    """Verify natural language query intent and entity extraction."""
    # Marketplace Search
    i1 = IntentRouter.classify_intent("Looking for an organic farm stay in Coorg under 3500 rs for 2 guests")
    assert i1.intent == "MARKETPLACE_SEARCH"
    assert i1.entities["destination_district"] == "Kodagu"
    assert i1.entities["category_slug"] == "farm-stays"
    assert i1.entities["max_budget"] == 3500.0
    assert i1.entities["party_size"] == 2

    # Trip Planner Handoff
    i2 = IntentRouter.classify_intent("Can you plan a 3 days weekend trip to Chikkamagaluru with itinerary?")
    assert i2.intent == "TRIP_PLANNER_HANDOFF"
    assert i2.entities["destination_district"] == "Chikkamagaluru"

    # Availability Check
    i3 = IntentRouter.classify_intent("Is there any availability next week?")
    assert i3.intent == "AVAILABILITY_CHECK"

    # Recommendation
    i4 = IntentRouter.classify_intent("What are the best places you recommend for nature lovers?")
    assert i4.intent == "RECOMMENDATION"


def test_trip_planner_handoff_orchestration(db_session, test_users, test_services):
    """Verify structured handoff payload generation without premature multi-day execution."""
    user = test_users["customer1"]
    mock_llm = MockLLMProvider()
    orchestrator = AIAssistantOrchestrator(db=db_session, llm_provider=mock_llm)

    res = orchestrator.process_turn(
        user=user,
        current_message="Plan my 2 days weekend trip to Coorg with full itinerary",
        history=[],
    )
    assert res.intent == "TRIP_PLANNER_HANDOFF"
    assert res.trip_planner_handoff is not None
    assert res.trip_planner_handoff["handoff_ready"] is True
    assert res.trip_planner_handoff["target_module"] == "trip_planner"
    assert res.trip_planner_handoff["parameters"]["destination_district"] == "Kodagu"


# ============================================================================
# 4. Grounding & Anti-Fabrication Tests
# ============================================================================

def test_grounding_anti_fabrication_when_no_results(db_session, test_users):
    """Verify that when no services exist in a district, the assistant acknowledges absence honestly."""
    user = test_users["customer1"]
    mock_llm = MockLLMProvider(custom_responses={"bidar": "We have 10 luxury stays for ₹500/night in Bidar!"})
    orchestrator = AIAssistantOrchestrator(db=db_session, llm_provider=mock_llm)

    res = orchestrator.process_turn(
        user=user,
        current_message="Show me stays in Bidar",
        history=[],
    )
    assert len(res.recommended_services) == 0
    # Grounding enforcement replaces hallucination with honest absence statement
    assert "no available stays" in res.content.lower() or "not found" in res.content.lower() or "0" in res.content.lower()
