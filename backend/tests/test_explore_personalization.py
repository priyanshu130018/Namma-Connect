"""Integration and progressive personalization tests for Namma Connect V2 Explore Section.

Tests all required user scenarios:
1. Brand-new cold-start user (no history, no location)
2. User with preferences only (explicit travel preferences, no interaction history)
3. User with search/view history
4. User with saved/booked services
5. User with location
6. User with strong personalized history (e.g. Priyanshu)
7. User with no location permission (verifies no fabricated nearby claims)
"""

import uuid
import json
import pytest
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.user import User
from app.models.service import Service, MarketplaceCategory
from app.models.booking import Booking
from app.models.saved_service import SavedService
from app.models.recommendation import UserInteraction, UserInterestProfile
from app.services.recommendation_engine import RecommendationEngine


@pytest.fixture(scope="function")
def db_session():
    db = SessionLocal()
    yield db
    db.rollback()
    db.close()


def test_scenario_1_cold_start_no_location(db_session: Session):
    """Scenario 1: Brand-new user with no history and no location.
    Must show all 10 categories, Top & Most Visited, and NO fake nearby/visited claims.
    """
    cold_user = User(
        id=uuid.uuid4(),
        email=f"test_cold_{uuid.uuid4().hex[:6]}@gmail.com",
        hashed_password="$2b$12$eXampleHashedPasswordForTestOnly",
        full_name="Cold Start User",
        role="user",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
    )
    db_session.add(cold_user)
    db_session.commit()

    try:
        feed = RecommendationEngine.get_explore_feed(user=cold_user, db=db_session, location=None, force_refresh=True)

        # 1. 10 categories in randomized order
        assert len(feed["categories"]) == 10
        slugs = {c["slug"] for c in feed["categories"]}
        expected_slugs = {
            "farm", "adventure", "water-sports", "wildlife", "food",
            "cultural-historical", "photography", "videography", "drone-aerial", "travel-reels"
        }
        assert slugs == expected_slugs

        # 2. Section progression: Categories -> Top & Most Visited
        assert feed["active_sections"] == ["categories", "top_and_most_visited"]

        # 3. No fabricated sections
        assert feed["nearby_places"] is None
        assert feed["because_you_visited"] is None
        assert feed["personalized_for_you"] is None

        # 4. Top & Most Visited present
        assert len(feed["top_and_most_visited"]) > 0
        assert feed["user_signals"]["is_cold_start"] is True
        assert feed["user_signals"]["has_location"] is False
    finally:
        db_session.query(User).filter(User.id == cold_user.id).delete()
        db_session.commit()


def test_scenario_2_preferences_only(db_session: Session):
    """Scenario 2: User with preferences only (explicit travel preferences, no interactions).
    Must show Categories -> Personalized For You -> Top & Most Visited (no fabricated visits).
    """
    prefs_payload = {
        "interests": ["water-sports", "wildlife"],
        "preferred_destinations": ["Udupi", "Uttara Kannada"],
        "budget_band": {"min": 1000, "max": 5000},
    }
    pref_user = User(
        id=uuid.uuid4(),
        email=f"test_pref_{uuid.uuid4().hex[:6]}@gmail.com",
        hashed_password="$2b$12$eXampleHashedPasswordForTestOnly",
        full_name="Preferences Only User",
        role="user",
        is_active=True,
        is_verified=True,
        travel_preferences=json.dumps(prefs_payload),
        is_synthetic=True,
    )
    db_session.add(pref_user)
    db_session.commit()

    try:
        feed = RecommendationEngine.get_explore_feed(user=pref_user, db=db_session, location=None, force_refresh=True)

        # Active sections must include personalized_for_you
        assert "personalized_for_you" in feed["active_sections"]
        assert "categories" in feed["active_sections"]
        assert "top_and_most_visited" in feed["active_sections"]

        # No fabricated visits or nearby places
        assert feed["because_you_visited"] is None
        assert feed["nearby_places"] is None
        assert feed["personalized_for_you"] is not None
        assert len(feed["personalized_for_you"]) > 0
    finally:
        db_session.query(UserInterestProfile).filter(UserInterestProfile.user_id == pref_user.id).delete()
        db_session.query(User).filter(User.id == pref_user.id).delete()
        db_session.commit()


def test_scenario_3_search_and_view_history(db_session: Session):
    """Scenario 3: User with search/view history.
    Must show 'Because You Visited' based on real interactions (no location).
    """
    sample_srv = db_session.query(Service).filter(Service.status == "PUBLISHED").first()
    assert sample_srv is not None

    view_user = User(
        id=uuid.uuid4(),
        email=f"test_view_{uuid.uuid4().hex[:6]}@gmail.com",
        hashed_password="$2b$12$eXampleHashedPasswordForTestOnly",
        full_name="View History User",
        role="user",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
    )
    db_session.add(view_user)
    db_session.commit()

    try:
        # Record a real behavioral view interaction
        RecommendationEngine.record_interaction(
            db=db_session,
            user_id=view_user.id,
            event_type="view",
            service_id=sample_srv.id,
            metadata={"category_slug": sample_srv.category_slug, "district": sample_srv.district},
        )

        feed = RecommendationEngine.get_explore_feed(user=view_user, db=db_session, location=None, force_refresh=True)

        assert "because_you_visited" in feed["active_sections"]
        assert feed["because_you_visited"] is not None
        assert len(feed["because_you_visited"]["items"]) > 0
        assert sample_srv.title in feed["because_you_visited"]["context"] or "explored" in feed["because_you_visited"]["context"].lower()
        assert feed["nearby_places"] is None
    finally:
        db_session.query(UserInteraction).filter(UserInteraction.user_id == view_user.id).delete()
        db_session.query(UserInterestProfile).filter(UserInterestProfile.user_id == view_user.id).delete()
        db_session.query(User).filter(User.id == view_user.id).delete()
        db_session.commit()


def test_scenario_4_saved_and_booked_services(db_session: Session):
    """Scenario 4: User with saved or booked services.
    Must show 'Because You Visited' referencing the booking/save.
    """
    sample_srv = db_session.query(Service).filter(
        Service.status == "PUBLISHED",
        Service.is_verified == True,
        Service.provider_id.isnot(None),
    ).first()
    assert sample_srv is not None

    book_user = User(
        id=uuid.uuid4(),
        email=f"test_book_{uuid.uuid4().hex[:6]}@gmail.com",
        hashed_password="$2b$12$eXampleHashedPasswordForTestOnly",
        full_name="Booked User",
        role="user",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
    )
    db_session.add(book_user)
    db_session.commit()

    test_booking = Booking(
        id=uuid.uuid4(),
        booking_code=f"BK-{uuid.uuid4().hex[:8].upper()}",
        customer_id=book_user.id,
        service_id=sample_srv.id,
        provider_id=sample_srv.provider_id,
        start_date=datetime.utcnow().strftime("%Y-%m-%d"),
        unit_price=sample_srv.price,
        total_amount=sample_srv.price,
        status="COMPLETED",
        is_synthetic=True,
    )
    db_session.add(test_booking)
    db_session.commit()

    try:
        feed = RecommendationEngine.get_explore_feed(user=book_user, db=db_session, location=None, force_refresh=True)

        assert "because_you_visited" in feed["active_sections"]
        assert feed["because_you_visited"] is not None
        assert "visited" in feed["because_you_visited"]["context"].lower()
    finally:
        db_session.query(Booking).filter(Booking.customer_id == book_user.id).delete()
        db_session.query(UserInterestProfile).filter(UserInterestProfile.user_id == book_user.id).delete()
        db_session.query(User).filter(User.id == book_user.id).delete()
        db_session.commit()


def test_scenario_5_user_with_location(db_session: Session):
    """Scenario 5: User with location.
    Must show 'Nearby Places' matching the location (e.g. Kodagu).
    """
    loc_user = User(
        id=uuid.uuid4(),
        email=f"test_loc_{uuid.uuid4().hex[:6]}@gmail.com",
        hashed_password="$2b$12$eXampleHashedPasswordForTestOnly",
        full_name="Location User",
        role="user",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
    )
    db_session.add(loc_user)
    db_session.commit()

    try:
        feed = RecommendationEngine.get_explore_feed(user=loc_user, db=db_session, location="Kodagu (Coorg)", force_refresh=True)

        assert "nearby_places" in feed["active_sections"]
        assert feed["nearby_places"] is not None
        assert len(feed["nearby_places"]) > 0
        for item in feed["nearby_places"]:
            assert "Kodagu" in (item.get("district") or "") or "Coorg" in (item.get("location") or "")
    finally:
        db_session.query(User).filter(User.id == loc_user.id).delete()
        db_session.commit()


def test_scenario_6_strong_personalized_history_priyanshu(db_session: Session):
    """Scenario 6: User with strong personalized history (Priyanshu).
    Must show full progression: Categories -> Nearby Places -> Because You Visited -> Personalized For You -> Top & Most Visited.
    """
    priyanshu = db_session.query(User).filter(User.email == "priyanshu@gmail.com").first()
    assert priyanshu is not None

    feed = RecommendationEngine.get_explore_feed(
        user=priyanshu,
        db=db_session,
        location="Kodagu (Coorg)",
        force_refresh=True,
    )

    # Full progressive sections
    assert "categories" in feed["active_sections"]
    assert "nearby_places" in feed["active_sections"]
    assert "because_you_visited" in feed["active_sections"]
    assert "personalized_for_you" in feed["active_sections"]
    assert "top_and_most_visited" in feed["active_sections"]

    assert feed["nearby_places"] is not None
    assert feed["because_you_visited"] is not None
    assert feed["personalized_for_you"] is not None
    assert feed["top_and_most_visited"] is not None

    # Verify signals diagnostics
    assert feed["user_signals"]["is_authenticated"] is True
    assert feed["user_signals"]["has_location"] is True
    assert feed["user_signals"]["has_history"] is True
    assert feed["user_signals"]["has_preferences"] is True


def test_scenario_7_no_location_permission(db_session: Session):
    """Scenario 7: User with no location permission.
    Must verify that NO 'nearby_places' section is shown and no fake nearby claims are made.
    """
    no_loc_user = User(
        id=uuid.uuid4(),
        email=f"test_noloc_{uuid.uuid4().hex[:6]}@gmail.com",
        hashed_password="$2b$12$eXampleHashedPasswordForTestOnly",
        full_name="No Location User",
        role="user",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
    )
    db_session.add(no_loc_user)
    db_session.commit()

    try:
        feed = RecommendationEngine.get_explore_feed(user=no_loc_user, db=db_session, location=None, force_refresh=True)

        assert "nearby_places" not in feed["active_sections"]
        assert feed["nearby_places"] is None
        assert feed["user_signals"]["has_location"] is False
    finally:
        db_session.query(User).filter(User.id == no_loc_user.id).delete()
        db_session.commit()


def test_synthetic_data_flag_preservation(db_session: Session):
    """Requirement 9: All synthetic user interactions and profiles must have is_synthetic = True."""
    syn_user = User(
        id=uuid.uuid4(),
        email=f"test_syn_{uuid.uuid4().hex[:6]}@gmail.com",
        hashed_password="$2b$12$eXampleHashedPasswordForTestOnly",
        full_name="Synthetic Test User",
        role="user",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
    )
    db_session.add(syn_user)
    db_session.commit()

    try:
        interaction = RecommendationEngine.record_interaction(
            db=db_session,
            user_id=syn_user.id,
            event_type="category_click",
            metadata={"category_slug": "farm"},
        )
        assert interaction.is_synthetic is True

        profile = db_session.query(UserInterestProfile).filter(UserInterestProfile.user_id == syn_user.id).first()
        assert profile is not None
        assert profile.is_synthetic is True
    finally:
        db_session.query(UserInteraction).filter(UserInteraction.user_id == syn_user.id).delete()
        db_session.query(UserInterestProfile).filter(UserInterestProfile.user_id == syn_user.id).delete()
        db_session.query(User).filter(User.id == syn_user.id).delete()
        db_session.commit()
