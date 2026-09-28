"""Comprehensive test suite for Namma Connect V2 Behavioral Data Pipeline and Hybrid Recommendation Engine."""

import pytest
import uuid
import json
import math
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.modules.user.domain.models import User
from app.modules.marketplace.domain.models import MarketplaceCategory, Service
from app.modules.booking.domain.models import Booking
from app.modules.recommendation.domain.models import (
    UserInteraction,
    UserInterestProfile,
    UserSimilarity,
    RecommendationResult,
    RecommendationImpression,
    RecommendationFeedback,
)
from app.modules.recommendation.features.feature_extractor import (
    InteractionWeights,
    FeatureExtractor,
)
from app.modules.recommendation.content_based.content_recommender import (
    ContentBasedRecommender,
    cosine_similarity,
)
from app.modules.recommendation.collaborative.user_similarity_calculator import (
    UserSimilarityCalculator,
)
from app.modules.recommendation.collaborative.collaborative_recommender import (
    CollaborativeRecommender,
)
from app.modules.recommendation.candidate_generation.candidate_generator import (
    CandidateGenerator,
)
from app.modules.recommendation.ranking.hybrid_ranker import (
    HybridRanker,
    HybridRankingWeights,
)
from app.modules.recommendation.feedback.feedback_handler import (
    FeedbackHandler,
)
from app.modules.recommendation.infrastructure.repository import (
    RecommendationRepository,
)
from app.modules.marketplace.infrastructure.repository import (
    MarketplaceRepository,
)
from app.modules.recommendation.application.service import (
    RecommendationService,
)
from app.modules.recommendation.presentation.schemas import (
    RecordInteractionRequest,
    RecordImpressionRequest,
    RecommendationFeedbackRequest,
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

    # Pre-seed test categories
    cat1 = MarketplaceCategory(
        id=uuid.uuid4(),
        slug="farm-stays",
        name="Farm Stays",
        marketplace_type="STAY",
        is_active=True,
    )
    cat2 = MarketplaceCategory(
        id=uuid.uuid4(),
        slug="agro-tours",
        name="Agro Tours",
        marketplace_type="ACTIVITY",
        is_active=True,
    )
    session.add_all([cat1, cat2])
    session.commit()

    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def sample_users(db_session):
    """Seed sample customer and provider users."""
    provider1 = User(
        id=uuid.uuid4(),
        email="farmer.somesh@test.com",
        full_name="Somesh Gowda",
        role="PARTNER",
        is_active=True,
    )
    provider2 = User(
        id=uuid.uuid4(),
        email="farmer.ravi@test.com",
        full_name="Ravi Kumar",
        role="PARTNER",
        is_active=True,
    )
    customer1 = User(
        id=uuid.uuid4(),
        email="traveler.anita@test.com",
        full_name="Anita Roy",
        role="CUSTOMER",
        is_active=True,
    )
    customer2 = User(
        id=uuid.uuid4(),
        email="traveler.vikram@test.com",
        full_name="Vikram Seth",
        role="CUSTOMER",
        is_active=True,
    )
    db_session.add_all([provider1, provider2, customer1, customer2])
    db_session.commit()
    return {
        "provider1": provider1,
        "provider2": provider2,
        "customer1": customer1,
        "customer2": customer2,
    }


@pytest.fixture
def sample_services(db_session, sample_users):
    """Seed sample published and draft marketplace services."""
    p1 = sample_users["provider1"]
    p2 = sample_users["provider2"]

    s1 = Service(
        id=uuid.uuid4(),
        title="Coorg Organic Coffee Plantation Stay",
        slug="coorg-organic-coffee-stay",
        description="Immerse in heritage coffee blossom picking and organic plantation living.",
        category="Farm Stays",
        category_slug="farm-stays",
        location="Madikeri",
        district="Kodagu",
        price=Decimal("3500.00"),
        rating=4.9,
        reviews_count=24,
        is_verified=True,
        status="PUBLISHED",
        provider_id=p1.id,
        provider_name=p1.full_name,
        primary_image="https://img.test/coorg.jpg",
    )
    s2 = Service(
        id=uuid.uuid4(),
        title="Chikkamagaluru Spice Trail & Homestay",
        slug="chikkamagaluru-spice-trail",
        description="Guided cardamom and pepper trails with traditional Malnad culinary dining.",
        category="Agro Tours",
        category_slug="agro-tours",
        location="Mudigere",
        district="Chikkamagaluru",
        price=Decimal("2200.00"),
        rating=4.8,
        reviews_count=18,
        is_verified=True,
        status="PUBLISHED",
        provider_id=p2.id,
        provider_name=p2.full_name,
        primary_image="https://img.test/chik.jpg",
    )
    s3 = Service(
        id=uuid.uuid4(),
        title="Kabini Wildlife & Riverside Farm Cottage",
        slug="kabini-riverside-farm-cottage",
        description="Peaceful riverside rustic cottages surrounded by organic paddy fields.",
        category="Farm Stays",
        category_slug="farm-stays",
        location="HD Kote",
        district="Mysuru",
        price=Decimal("4500.00"),
        rating=4.95,
        reviews_count=35,
        is_verified=True,
        status="PUBLISHED",
        provider_id=p1.id,
        provider_name=p1.full_name,
        primary_image="https://img.test/kabini.jpg",
    )
    draft_service = Service(
        id=uuid.uuid4(),
        title="Unverified Draft Experience",
        slug="draft-experience",
        description="Not yet approved by moderation.",
        category="Agro Tours",
        category_slug="agro-tours",
        location="Shimoga",
        district="Shivamogga",
        price=Decimal("1500.00"),
        rating=0.0,
        reviews_count=0,
        is_verified=False,
        status="PENDING",
        provider_id=p2.id,
        provider_name=p2.full_name,
        primary_image="https://img.test/draft.jpg",
    )
    db_session.add_all([s1, s2, s3, draft_service])
    db_session.commit()
    return {
        "s1": s1,
        "s2": s2,
        "s3": s3,
        "draft": draft_service,
    }


# ============================================================================
# 1. Event Tracking & Feature Extraction Tests
# ============================================================================

def test_interaction_weights_and_time_decay():
    """Verify event weights and exponential half-life decay calculation."""
    assert InteractionWeights.get_weight("BOOK") == 5.0
    assert InteractionWeights.get_weight("SAVE") == 3.0
    assert InteractionWeights.get_weight("CLICK") == 1.5
    assert InteractionWeights.get_weight("VIEW") == 1.0
    assert InteractionWeights.get_weight("DISMISS") == -2.0

    # Test exact 7-day half life
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)

    decay_0 = InteractionWeights.calculate_decayed_weight(5.0, now)
    decay_7 = InteractionWeights.calculate_decayed_weight(5.0, seven_days_ago)
    decay_14 = InteractionWeights.calculate_decayed_weight(5.0, fourteen_days_ago)

    assert round(decay_0, 2) == 5.0
    assert round(decay_7, 2) == 2.5   # 50% remaining
    assert round(decay_14, 2) == 1.25 # 25% remaining


def test_feature_extractor_affinity_aggregation():
    """Verify aggregate category, destination, and budget affinities derived from interactions."""
    u_id = uuid.uuid4()
    s1_id = uuid.uuid4()
    s2_id = uuid.uuid4()

    inter1 = UserInteraction(
        id=uuid.uuid4(),
        user_id=u_id,
        service_id=s1_id,
        event_type="BOOK",
        weight=5.0,
        metadata_json=json.dumps({"category_slug": "farm-stays", "district": "Kodagu", "price": 3500}),
        created_at=datetime.utcnow(),
    )
    inter2 = UserInteraction(
        id=uuid.uuid4(),
        user_id=u_id,
        service_id=s2_id,
        event_type="SAVE",
        weight=3.0,
        metadata_json=json.dumps({"category_slug": "farm-stays", "district": "Kodagu", "price": 4000}),
        created_at=datetime.utcnow(),
    )
    inter3 = UserInteraction(
        id=uuid.uuid4(),
        user_id=u_id,
        service_id=uuid.uuid4(),
        event_type="CLICK",
        weight=1.5,
        metadata_json=json.dumps({"category_slug": "agro-tours", "district": "Chikkamagaluru", "price": 2000}),
        created_at=datetime.utcnow(),
    )

    affinities = FeatureExtractor.extract_affinities_from_interactions([inter1, inter2, inter3])

    assert "farm-stays" in affinities["category_affinity"]
    assert affinities["category_affinity"]["farm-stays"] > affinities["category_affinity"]["agro-tours"]
    assert "kodagu" in affinities["destination_affinity"]
    assert affinities["destination_affinity"]["kodagu"] > affinities["destination_affinity"]["chikkamagaluru"]
    assert affinities["budget_band"]["min"] == 2000
    assert affinities["budget_band"]["max"] == 4000
    assert affinities["confidence_score"] > 0.0


# ============================================================================
# 2. Content-Based Recommender Tests
# ============================================================================

def test_cosine_similarity_edge_cases():
    """Test vector similarity edge cases."""
    assert cosine_similarity([1.0, 0.0], [1.0, 0.0]) == 1.0
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0
    assert cosine_similarity([], [1.0, 0.0]) == 0.0
    assert cosine_similarity(None, [1.0, 0.0]) == 0.0


def test_content_based_scoring(sample_services):
    """Test matching score for category, district, and budget."""
    s1 = sample_services["s1"]
    profile = UserInterestProfile(
        category_affinity_json=json.dumps({"farm-stays": 0.8, "agro-tours": 0.2}),
        destination_affinity_json=json.dumps({"kodagu": 0.9}),
        budget_band_json=json.dumps({"min": 3000, "max": 5000}),
    )

    res = ContentBasedRecommender.score_service_content(s1, profile=profile)
    assert res["score"] > 0.8
    assert "Farm Stays" in res["reason"] or "Kodagu" in res["reason"]


def test_content_based_missing_embeddings_graceful(sample_services):
    """Verify that absence of vector embeddings does NOT crash or synthesize fake coordinates."""
    s1 = sample_services["s1"]
    s1.embedding = None  # Explicitly None

    res = ContentBasedRecommender.score_service_content(s1, user_vector=None)
    assert 0.0 <= res["score"] <= 1.0


# ============================================================================
# 3. Collaborative Filtering & User Similarity Tests
# ============================================================================

def test_user_similarity_canonical_pair_ordering(db_session, sample_users, sample_services):
    """Verify user similarity computation and canonical (user_id_1 < user_id_2) ordering."""
    u1 = sample_users["customer1"]
    u2 = sample_users["customer2"]
    s1 = sample_services["s1"]
    s2 = sample_services["s2"]

    # Record shared interactions for both users
    inter1 = UserInteraction(user_id=u1.id, service_id=s1.id, event_type="BOOK", weight=5.0)
    inter2 = UserInteraction(user_id=u1.id, service_id=s2.id, event_type="SAVE", weight=3.0)
    inter3 = UserInteraction(user_id=u2.id, service_id=s1.id, event_type="BOOK", weight=5.0)
    inter4 = UserInteraction(user_id=u2.id, service_id=s2.id, event_type="SAVE", weight=3.0)
    db_session.add_all([inter1, inter2, inter3, inter4])
    db_session.commit()

    saved_pairs = UserSimilarityCalculator.compute_and_store_similarities_for_user(db_session, u1.id)
    assert len(saved_pairs) == 1
    pair = saved_pairs[0]

    # Verify canonical ordering
    assert str(pair.user_id_1) < str(pair.user_id_2)
    assert pair.similarity_score == pytest.approx(1.0, abs=1e-6)  # Identical interaction profiles
    assert pair.evidence_count == 2


def test_collaborative_candidate_generation(db_session, sample_users, sample_services):
    """Verify collaborative candidate discovery from similar users."""
    u1 = sample_users["customer1"]
    u2 = sample_users["customer2"]
    s1 = sample_services["s1"]
    s3 = sample_services["s3"]

    # Pre-seed similarity pair
    uid1, uid2 = (u1.id, u2.id) if str(u1.id) < str(u2.id) else (u2.id, u1.id)
    sim_pair = UserSimilarity(
        user_id_1=uid1,
        user_id_2=uid2,
        similarity_score=0.85,
        evidence_count=3,
    )
    db_session.add(sim_pair)

    # u2 interacts with s3 (which u1 has not interacted with)
    db_session.add(UserInteraction(user_id=u2.id, service_id=s3.id, event_type="BOOK", weight=5.0))
    db_session.commit()

    candidates = CollaborativeRecommender.generate_candidates(db_session, user_id=u1.id)
    assert len(candidates) >= 1
    cand_ids = [c["service_id"] for c in candidates]
    assert s3.id in cand_ids


# ============================================================================
# 4. Hybrid Ranking & Eligibility Gating Tests
# ============================================================================

def test_eligibility_gating_filters_draft_and_self_service(db_session, sample_users, sample_services):
    """Verify draft, unverified, and provider self-services are excluded."""
    provider = sample_users["provider1"]
    customer = sample_users["customer1"]
    draft = sample_services["draft"]
    s1 = sample_services["s1"]  # Owned by provider1

    candidates = CandidateGenerator.generate_all_candidates(db_session, user_id=provider.id)

    # Provider ranking (should exclude their own service s1 and draft)
    eligible_for_provider = HybridRanker.filter_eligible_candidates(
        candidates=candidates,
        user_id=provider.id,
    )
    eligible_ids_for_prov = [c.service_id for c in eligible_for_provider]
    assert draft.id not in eligible_ids_for_prov
    assert s1.id not in eligible_ids_for_prov  # Self-booking prevention

    # Customer ranking (can see s1, but cannot see draft)
    eligible_for_cust = HybridRanker.filter_eligible_candidates(
        candidates=candidates,
        user_id=customer.id,
    )
    eligible_ids_for_cust = [c.service_id for c in eligible_for_cust]
    assert draft.id not in eligible_ids_for_cust
    assert s1.id in eligible_ids_for_cust


def test_hybrid_ranker_multi_signal_scoring(db_session, sample_users, sample_services):
    """Verify multi-signal weighted hybrid formula."""
    customer = sample_users["customer1"]
    candidates = CandidateGenerator.generate_all_candidates(db_session, user_id=customer.id)

    profile = UserInterestProfile(
        category_affinity_json=json.dumps({"farm-stays": 0.9}),
        destination_affinity_json=json.dumps({"kodagu": 0.9}),
    )

    ranked = HybridRanker.rank(candidates, profile=profile, limit=5)
    assert len(ranked) >= 1
    for item in ranked:
        assert 0.0 <= item["score"] <= 100.0
        assert "algorithm" in item
        assert "explanation" in item

    # Verify descending score order
    scores = [r["score"] for r in ranked]
    assert scores == sorted(scores, reverse=True)


# ============================================================================
# 5. Service Layer & End-to-End Recommendations
# ============================================================================

def test_recommendation_service_full_lifecycle(db_session, sample_users, sample_services):
    """End-to-end test of interaction recording, profile derivation, feed generation, impressions, and feedback."""
    rec_repo = RecommendationRepository(db_session)
    marketplace_repo = MarketplaceRepository(db_session)
    rec_service = RecommendationService(rec_repo, marketplace_repo)

    customer = sample_users["customer1"]
    s1 = sample_services["s1"]

    # 1. Track interaction
    track_res = rec_service.track_interaction(
        user_id=customer.id,
        payload=RecordInteractionRequest(
            service_id=str(s1.id),
            event_type="BOOK",
            weight=5.0,
            metadata={"category_slug": "farm-stays", "district": "Kodagu"},
        ),
    )
    assert track_res["success"] is True

    # 2. Verify interest profile updated
    profile_data = rec_service.get_user_interest_profile(customer.id)
    assert profile_data["interaction_count"] == 1
    assert "farm-stays" in profile_data["category_affinity"]

    # 3. Get personalized recommendations with persistence
    recs = rec_service.get_personalized_recommendations(user_id=customer.id, limit=5, persist=True)
    assert len(recs) >= 1
    assert recs[0]["service_details"] is not None

    # Check persistence in recommendation_results
    stored = db_session.query(RecommendationResult).filter(RecommendationResult.user_id == customer.id).all()
    assert len(stored) >= 1

    # 4. Record Impression
    imp_res = rec_service.track_impression(
        user_id=customer.id,
        payload=RecordImpressionRequest(
            service_id=str(s1.id),
            section="recommended_for_you",
            surface="HOME",
            position=1,
        ),
    )
    assert imp_res["success"] is True

    # 5. Submit Feedback (DISLIKE)
    feed_res = rec_service.submit_feedback(
        user_id=customer.id,
        payload=RecommendationFeedbackRequest(
            service_id=str(s1.id),
            feedback_type="DISLIKE",
            feedback_text="Too far from the airport",
        ),
    )
    assert feed_res["success"] is True

    # Check that dismissed service is now excluded from subsequent recommendations
    dismissed_ids = rec_repo.get_user_dismissed_service_ids(customer.id)
    assert s1.id in dismissed_ids


def test_home_page_structured_5_sections(db_session, sample_users, sample_services):
    """Verify the 5 structured sections on the Home page feed."""
    rec_repo = RecommendationRepository(db_session)
    marketplace_repo = MarketplaceRepository(db_session)
    rec_service = RecommendationService(rec_repo, marketplace_repo)

    customer = sample_users["customer1"]
    home_data = rec_service.get_home_recommendations(user_id=customer.id, location="Kodagu")

    assert "recommended_for_you" in home_data
    assert "top_rated" in home_data
    assert "most_visited" in home_data
    assert "near_you" in home_data
    assert "categories" in home_data
    assert len(home_data["categories"]) >= 2
