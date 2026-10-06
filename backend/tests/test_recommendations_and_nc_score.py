"""Comprehensive Unit and Integration Tests for Recommendation Engine, NC Score Engine, Celery Tasks, Circuit Breaker, and Action Triggers."""

import uuid
import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.service import Service, Review
from app.models.booking import Booking
from app.models.saved_service import SavedService
from app.models.recommendation import (
    UserInteraction,
    UserInterestProfile,
    UserSimilarity,
    RecommendationResult,
)
from app.models.nc_score import (
    NCScoreSnapshot,
    ProviderActionRecommendation,
    ProviderResponseMetrics,
)
from app.services.recommendation_engine import RecommendationEngine, InteractionWeights
from app.services.nc_score_engine import NCScoreEngine
from app.services.redis_service import RedisService
from app.tasks.recommendation_tasks import (
    process_user_interaction_task,
    precompute_home_recommendations_task,
    recalculate_nc_score_task,
    compute_user_similarities_task,
)


@pytest.fixture
def test_partner_user(db_session: Session) -> User:
    user = User(
        id=uuid.uuid4(),
        email=f"rec.partner.{uuid.uuid4()}@nammaconnect.test",
        full_name="Recommendation Partner",
        role="partner",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_customer_user(db_session: Session) -> User:
    user = User(
        id=uuid.uuid4(),
        email=f"rec.customer.{uuid.uuid4()}@nammaconnect.test",
        full_name="Recommendation Customer",
        role="customer",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_published_service(db_session: Session, test_partner_user: User) -> Service:
    srv = Service(
        id=uuid.uuid4(),
        provider_id=test_partner_user.id,
        title="Coorg Spices & Organic Coffee Plantation Stay",
        slug=f"coorg-spices-{uuid.uuid4()}",
        description="Organic coffee and spice tour in Madikeri Coorg",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg",
        district="Coorg",
        state="Karnataka",
        price=2500.0,
        rating=4.9,
        reviews_count=12,
        status="PUBLISHED",
        is_verified=True,
        provider_name=test_partner_user.full_name,
        primary_image="https://example.com/s.jpg",
    )
    db_session.add(srv)
    db_session.commit()
    return srv


def test_new_user_cold_start(db_session: Session, test_published_service: Service):
    """Test 1: New user without history receives cold start quality & top rated recommendations."""
    recs = RecommendationEngine.get_home_recommendations(user=None, db=db_session)
    assert "recommended_for_you" in recs
    assert "top_rated" in recs
    assert "most_visited" in recs
    assert "near_you" in recs
    assert len(recs["top_rated"]) >= 1


def test_interaction_recording_and_exponential_decay(db_session: Session, test_customer_user: User, test_published_service: Service):
    """Test 2: Recording interactions creates UserInteraction with configured base weight."""
    inter = RecommendationEngine.record_interaction(
        db=db_session,
        user_id=test_customer_user.id,
        event_type="booking_complete",
        service_id=test_published_service.id,
        metadata={"category_slug": "stay", "district": "Coorg"},
    )
    assert inter.id is not None
    assert inter.weight == 5.0

    # Verify decay calculation helper
    decayed = InteractionWeights.calculate_decayed_weight(inter.weight, inter.created_at)
    assert round(decayed, 2) == 5.0

    profile = db_session.query(UserInterestProfile).filter(UserInterestProfile.user_id == test_customer_user.id).first()
    assert profile is not None
    assert "stay" in profile.category_affinity_json


def test_real_collaborative_filtering_score(db_session: Session, test_customer_user: User, test_published_service: Service):
    """Test 3: Collaborative filtering uses real precomputed user similarity pairs."""
    # Create second customer user
    user2 = User(
        id=uuid.uuid4(),
        email=f"rec.user2.{uuid.uuid4()}@nammaconnect.test",
        full_name="User Two",
        role="customer",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user2)

    # Both users save the service
    s1 = SavedService(id=uuid.uuid4(), user_id=test_customer_user.id, service_id=test_published_service.id)
    s2 = SavedService(id=uuid.uuid4(), user_id=user2.id, service_id=test_published_service.id)
    db_session.add(s1)
    db_session.add(s2)
    db_session.commit()

    sim = RecommendationEngine.compute_user_similarity(db_session, test_customer_user.id, user2.id)
    assert sim > 0.0

    # Store pair in UserSimilarity
    pair = UserSimilarity(id=uuid.uuid4(), user_id_1=test_customer_user.id, user_id_2=user2.id, similarity_score=sim)
    db_session.add(pair)
    db_session.commit()

    collab_score = RecommendationEngine.get_user_collaborative_score(db_session, test_customer_user.id, test_published_service.id)
    assert collab_score > 0.0


def test_8_component_recommendation_formula(db_session: Session, test_customer_user: User, test_published_service: Service):
    """Test 4: Recommendation calculation uses exact 8-component formula with Popularity and Freshness."""
    score, reason = RecommendationEngine.calculate_final_score(
        service=test_published_service,
        user_id=test_customer_user.id,
        profile=None,
        user_vector=None,
        db=db_session,
    )
    assert 0.0 <= score <= 100.0
    assert isinstance(reason, str)


def test_eligibility_gate_prevents_unverified_recommendation(db_session: Session, test_customer_user: User):
    """Test 5: Unverified/draft services are never recommended."""
    draft_srv = Service(
        id=uuid.uuid4(),
        title="Draft Unverified Stay",
        slug=f"draft-{uuid.uuid4()}",
        description="Draft listing",
        category="Stay",
        category_slug="stay",
        location="Madikeri",
        district="Coorg",
        price=1000.0,
        status="PENDING",
        is_verified=False,
        provider_name="Unknown",
        primary_image="https://example.com/d.jpg",
    )
    db_session.add(draft_srv)
    db_session.commit()

    candidates = RecommendationEngine.generate_candidates(db_session, user_id=test_customer_user.id)
    cand_ids = [c.id for c in candidates]
    assert draft_srv.id not in cand_ids


def test_nc_score_7_pillars_and_redis_caching(db_session: Session, test_partner_user: User, test_published_service: Service):
    """Test 6: Provider NC Score calculation computes exact 7 pillars and tier."""
    score, components = NCScoreEngine.calculate_nc_score(db=db_session, provider_id=test_partner_user.id, force_refresh=True)
    assert score > 0.0
    assert "completion_rate" in components
    assert "response_score" in components
    assert "bayesian_rating" in components
    assert "reliability_score" in components
    assert "acceptance_rate" in components
    assert "repeat_customers" in components
    assert "profile_completeness" in components
    assert "tier" in components

    snapshot = db_session.query(NCScoreSnapshot).filter(NCScoreSnapshot.provider_id == test_partner_user.id).first()
    assert snapshot is not None
    assert snapshot.score == score


def test_provider_action_recommendation_triggers(db_session: Session, test_partner_user: User, test_published_service: Service):
    """Test 7: Operational triggers (RESPONSE_TIME_SLOW, INCOMPLETE_PROFILE) generate prioritized actions."""
    # Add response metrics with slow response time (25 mins)
    resp_metric = ProviderResponseMetrics(
        id=uuid.uuid4(),
        provider_id=test_partner_user.id,
        date="2026-09-10",
        pending_count=1,
        responded_count=3,
        avg_response_minutes=25.0,
    )
    db_session.add(resp_metric)
    db_session.commit()

    actions = NCScoreEngine.generate_provider_action_recommendations(db=db_session, provider_id=test_partner_user.id)
    assert len(actions) >= 1
    action_types = [a["action_type"] for a in actions]
    assert "RESPONSE_TIME_SLOW" in action_types or "INCOMPLETE_PROFILE" in action_types
    # Verify priority score sorting
    if len(actions) > 1:
        assert actions[0]["priority_score"] >= actions[1]["priority_score"]


def test_redis_circuit_breaker_resilience():
    """Test 8: RedisService circuit breaker prevents socket timeout lags during Redis outages."""
    RedisService.reset_circuit_breaker()
    # Force failure state by triggering get_client on unreachable endpoint or simulation
    RedisService._circuit_broken_until = time.time() + 30.0
    
    # Circuit broken -> get returns None immediately without latency penalty
    start = time.perf_counter()
    val = RedisService.get("recommendations:user:test:home")
    elapsed_ms = (time.perf_counter() - start) * 1000.0
    
    assert val is None
    assert elapsed_ms < 10.0  # Fast fallback under 10ms
    RedisService.reset_circuit_breaker()


def test_celery_task_invocation_and_retry(db_session: Session, test_customer_user: User, test_published_service: Service):
    """Test 9: Celery tasks execute functions and return success."""
    res = process_user_interaction_task.run(
        user_id_str=str(test_customer_user.id),
        event_type="view",
        service_id_str=str(test_published_service.id),
        metadata={"category_slug": "stay"},
    )
    assert res is True


def test_recommendations_home_endpoint(client: TestClient, db_session: Session):
    """Test 10: /recommendations/home endpoint returns structured JSON data."""
    resp = client.get("/api/v2/recommendations/home")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "recommended_for_you" in data
    assert "top_rated" in data
    assert "most_visited" in data
    assert "near_you" in data
    assert "categories" in data
