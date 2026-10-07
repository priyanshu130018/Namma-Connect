"""Comprehensive tests for Provider Marketplace Workflow (Phase 1 & Phase 2).

Covers:
- Phase 1: Service creation (Draft vs Published), Validation, Duplicate Listing, Authoritative Availability Management.
- Cross-Provider Isolation & Security.
- Phase 2: Analytics & Reporting (GMV vs 90% Net Host Earnings, 10% Platform Fee, Interaction Funnel, Lead Time Buckets).
- Deterministic Recommendation Engine & Confidence Thresholds.
"""

import uuid
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import (
    User,
    Service,
    ServiceAvailability,
    Booking,
    PartnerApplication,
    UserInteraction,
)
from app.core.security import create_access_token


@pytest.fixture
def provider_alpha(db_session: Session) -> User:
    uid = uuid.uuid4().hex[:8]
    user = User(
        email=f"alpha_provider_{uid}@example.com",
        full_name="Alpha Provider",
        role="partner",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
    )
    db_session.add(user)
    db_session.commit()

    app_record = PartnerApplication(
        application_code=f"APP-ALPHA-{uid}",
        user_id=user.id,
        role_type="farmer",
        full_name=user.full_name,
        email=user.email,
        mobile="+91 9888811111",
        address="Sakleshpur Estate",
        district="Hassan",
        state="Karnataka",
        business_name="Alpha Eco Adventures",
        id_type="Aadhaar",
        id_number="123456789012",
        status="APPROVED",
    )
    db_session.add(app_record)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def provider_beta(db_session: Session) -> User:
    uid = uuid.uuid4().hex[:8]
    user = User(
        email=f"beta_provider_{uid}@example.com",
        full_name="Beta Provider",
        role="partner",
        is_active=True,
        is_verified=True,
        is_synthetic=True,
    )
    db_session.add(user)
    db_session.commit()

    app_record = PartnerApplication(
        application_code=f"APP-BETA-{uid}",
        user_id=user.id,
        role_type="creator",
        full_name=user.full_name,
        email=user.email,
        mobile="+91 9777722222",
        address="Kabini River Campsite",
        district="Mysuru",
        state="Karnataka",
        business_name="Beta Wild Visuals",
        id_type="Passport",
        id_number="P1234567",
        status="APPROVED",
    )
    db_session.add(app_record)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def alpha_headers(provider_alpha: User) -> dict:
    token = create_access_token(str(provider_alpha.id), role=provider_alpha.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def beta_headers(provider_beta: User) -> dict:
    token = create_access_token(str(provider_beta.id), role=provider_beta.role)
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# PHASE 1: LISTING CREATION, DRAFTS, VALIDATION & DUPLICATION
# ==============================================================================

def test_draft_listing_creation_relaxed_validation(alpha_headers):
    client = TestClient(app)
    # Draft should succeed even with minimal fields
    draft_payload = {
        "title": "Sakleshpur Coffee Trail Draft",
        "category": "farm",
        "status": "DRAFT",
    }
    response = client.post("/api/v2/provider/listings", json=draft_payload, headers=alpha_headers)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["title"] == "Sakleshpur Coffee Trail Draft"
    assert data["status"] == "DRAFT"
    assert data["category_slug"] == "farm"


def test_published_listing_creation_strict_validation(alpha_headers):
    client = TestClient(app)
    # Publishing directly requires valid price, location, description
    invalid_pub_payload = {
        "title": "Incomplete Adventure Listing",
        "category": "adventure",
        "description": "Guided 8km ridge trail through shola grasslands.",
        "location": "Sakleshpur, Hassan",
        "status": "PUBLISHED",
        "price": 0,  # Invalid for published
    }
    resp = client.post("/api/v2/provider/listings", json=invalid_pub_payload, headers=alpha_headers)
    assert resp.status_code == 400
    assert "greater than zero" in resp.json()["detail"].lower()

    # Valid published listing
    valid_pub_payload = {
        "title": "Western Ghats Ridge Trek",
        "category": "adventure",
        "status": "PUBLISHED",
        "description": "Guided 8km ridge trail through shola grasslands and waterfalls.",
        "location": "Sakleshpur, Hassan",
        "district": "Hassan",
        "price": 1200.0,
        "unit": "person",
        "max_capacity": 12,
        "specific_details": {
            "trekDifficulty": "Moderate",
            "trailDistanceKm": "8 km",
            "gearProvided": "Poles and poncho",
        },
    }
    resp_valid = client.post("/api/v2/provider/listings", json=valid_pub_payload, headers=alpha_headers)
    assert resp_valid.status_code == 200, resp_valid.text
    data = resp_valid.json()["data"]
    assert data["status"] == "PUBLISHED"
    assert data["price"] == 1200.0
    assert data["category_slug"] == "adventure"

    # Verify detail retrieval
    detail_res = client.get(f"/api/v2/provider/listings/{data['id']}", headers=alpha_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["data"]["specific_details"]["trekDifficulty"] == "Moderate"


def test_duplicate_listing_workflow(alpha_headers):
    client = TestClient(app)
    # 1. Create original service
    original_payload = {
        "title": "Kabini Wildlife Boat Safari",
        "category": "wildlife",
        "status": "PUBLISHED",
        "description": "Silent electric boat safari sighting elephants and river birds.",
        "location": "Kabini Reservoir, Mysuru",
        "price": 2500.0,
        "unit": "person",
        "max_capacity": 8,
    }
    create_res = client.post("/api/v2/provider/listings", json=original_payload, headers=alpha_headers)
    assert create_res.status_code == 200
    orig_id = create_res.json()["data"]["id"]

    # 2. Duplicate it
    dup_res = client.post(f"/api/v2/provider/listings/{orig_id}/duplicate", headers=alpha_headers)
    assert dup_res.status_code == 200, dup_res.text
    dup_data = dup_res.json()["data"]
    assert dup_data["id"] != orig_id
    assert "Copy" in dup_data["title"]
    assert dup_data["status"] == "DRAFT"
    assert float(dup_data["price"]) == 2500.0
    assert dup_data["category_slug"] == "wildlife"


# ==============================================================================
# PHASE 1: AUTHORITATIVE AVAILABILITY MANAGEMENT
# ==============================================================================

def test_provider_availability_slots_crud(alpha_headers):
    client = TestClient(app)
    # Create service
    create_payload = {
        "title": "Heritage Pottery Workshop",
        "category": "cultural-historical",
        "description": "Traditional terracotta and pottery craft workshop in Bidar.",
        "status": "PUBLISHED",
        "location": "Bidar",
        "price": 800.0,
        "max_capacity": 10,
    }
    svc_res = client.post("/api/v2/provider/listings", json=create_payload, headers=alpha_headers)
    service_id = svc_res.json()["data"]["id"]

    # Add availability slots
    target_date = (date.today() + timedelta(days=3)).isoformat()
    avail_payload = {
        "date": target_date,
        "slots": [
            {
                "date": target_date,
                "start_time": "10:00",
                "end_time": "12:00",
                "slot_label": "Morning Batch",
                "capacity": 10,
                "price_override": None,
            },
            {
                "date": target_date,
                "start_time": "15:00",
                "end_time": "17:00",
                "slot_label": "Afternoon Batch",
                "capacity": 10,
                "price_override": 950.0,
            },
        ],
    }
    add_avail_res = client.post(f"/api/v2/provider/listings/{service_id}/availability", json=avail_payload, headers=alpha_headers)
    assert add_avail_res.status_code == 200, add_avail_res.text
    assert add_avail_res.json()["data"]["slots_processed"] >= 2

    # Query availability slots
    get_avail_res = client.get(f"/api/v2/provider/listings/{service_id}/availability", headers=alpha_headers)
    assert get_avail_res.status_code == 200
    listed_slots = get_avail_res.json()["data"]
    assert len(listed_slots) >= 2
    slot_id_to_delete = listed_slots[0]["id"]

    # Block a slot date
    block_res = client.post(
        f"/api/v2/provider/listings/{service_id}/availability/block",
        json={"date": target_date, "is_blocked": True, "notes": "Private event scheduled"},
        headers=alpha_headers,
    )
    assert block_res.status_code == 200
    assert block_res.json()["data"]["is_blocked"] is True

    # Delete slot
    del_res = client.delete(f"/api/v2/provider/listings/{service_id}/availability/{slot_id_to_delete}", headers=alpha_headers)
    assert del_res.status_code == 200


# ==============================================================================
# SECURITY: CROSS-PROVIDER ISOLATION
# ==============================================================================

def test_cross_provider_isolation(alpha_headers, beta_headers):
    client = TestClient(app)
    # Alpha creates a listing
    alpha_svc = client.post(
        "/api/v2/provider/listings",
        json={
            "title": "Alpha Private Estate Walk",
            "category": "farm",
            "description": "Guided morning walking tour through private coffee estate.",
            "status": "PUBLISHED",
            "location": "Sakleshpur",
            "price": 1000.0,
        },
        headers=alpha_headers,
    ).json()["data"]
    alpha_svc_id = alpha_svc["id"]

    # Beta attempts to read Alpha's listing details via provider endpoint -> Should be 404 (or 403)
    read_res = client.get(f"/api/v2/provider/listings/{alpha_svc_id}", headers=beta_headers)
    assert read_res.status_code in [403, 404]

    # Beta attempts to duplicate Alpha's listing -> Should fail
    dup_res = client.post(f"/api/v2/provider/listings/{alpha_svc_id}/duplicate", headers=beta_headers)
    assert dup_res.status_code in [403, 404]

    # Beta attempts to modify Alpha's availability -> Should fail
    target_date = (date.today() + timedelta(days=5)).isoformat()
    avail_res = client.post(
        f"/api/v2/provider/listings/{alpha_svc_id}/availability",
        json={"date": target_date, "capacity": 5},
        headers=beta_headers,
    )
    assert avail_res.status_code in [403, 404]

    # Beta attempts to read Alpha's service-level analytics -> Should fail
    analytics_res = client.get(f"/api/v2/provider/analytics/service/{alpha_svc_id}", headers=beta_headers)
    assert analytics_res.status_code in [403, 404]


# ==============================================================================
# PHASE 2: ECONOMICS & ANALYTICS INTEGRITY
# ==============================================================================

def test_provider_economics_and_earnings(provider_alpha: User, alpha_headers, db_session: Session):
    client = TestClient(app)
    # Seed a service with confirmed bookings
    svc_res = client.post(
        "/api/v2/provider/listings",
        json={
            "title": "Agro-Tourism Plantation Stay",
            "category": "farm",
            "description": "Agro tourism stay in Western Ghats lush hills.",
            "status": "PUBLISHED",
            "location": "Sakleshpur",
            "district": "Hassan",
            "price": 2000.0,
            "unit": "person",
            "max_capacity": 10,
        },
        headers=alpha_headers,
    )
    assert svc_res.status_code == 200, svc_res.text
    service_id = uuid.UUID(svc_res.json()["data"]["id"])

    # Confirmed booking: 2 guests * 2000 = 4000
    b1 = Booking(
        booking_code=f"BK-{uuid.uuid4().hex[:6].upper()}",
        customer_id=provider_alpha.id,
        service_id=service_id,
        provider_id=provider_alpha.id,
        guest_count=2,
        unit_price=2000.0,
        total_amount=4000.0,
        status="CONFIRMED",
        start_date=(date.today() + timedelta(days=2)).isoformat(),
        end_date=(date.today() + timedelta(days=3)).isoformat(),
        is_synthetic=True,
    )
    # Cancelled booking: 1 guest * 2000 = 2000 (Should be excluded from net realized earnings)
    b2 = Booking(
        booking_code=f"BK-{uuid.uuid4().hex[:6].upper()}",
        customer_id=provider_alpha.id,
        service_id=service_id,
        provider_id=provider_alpha.id,
        guest_count=1,
        unit_price=2000.0,
        total_amount=2000.0,
        status="CANCELLED",
        start_date=(date.today() + timedelta(days=5)).isoformat(),
        end_date=(date.today() + timedelta(days=6)).isoformat(),
        is_synthetic=True,
    )
    db_session.add_all([b1, b2])
    db_session.commit()

    # Check Overview Endpoint
    overview_res = client.get("/api/v2/provider/analytics/overview?period=30d", headers=alpha_headers)
    assert overview_res.status_code == 200
    overview_data = overview_res.json()["data"]
    assert overview_data["total_bookings"] >= 2
    assert overview_data["total_revenue"] >= 4000.0
    # Net earnings must be 90% of confirmed GMV: 4000 * 0.90 = 3600
    assert overview_data["net_earnings"] >= 3600.0
    assert overview_data["financials"]["platform_commission"] >= 400.0
    assert overview_data["financials"]["commission_rate"] == "10%"
    assert overview_data["financials"]["payout_rate"] == "90%"

    # Check Detailed Earnings Report
    earnings_res = client.get("/api/v2/provider/analytics/earnings?period=30d", headers=alpha_headers)
    assert earnings_res.status_code == 200
    earnings_data = earnings_res.json()["data"]
    assert earnings_data["gross_booking_value"] >= 4000.0
    assert earnings_data["net_realized_earnings"] >= 3600.0
    assert earnings_data["platform_commission"] >= 400.0
    assert earnings_data["commission_rate_percent"] == 10.0
    assert earnings_data["provider_share_percent"] == 90.0


def test_interaction_funnel_and_bookings_report(provider_alpha: User, alpha_headers, db_session: Session):
    client = TestClient(app)
    # Seed interactions
    svc = db_session.query(Service).filter(Service.provider_id == provider_alpha.id).first()
    if svc:
        interaction = UserInteraction(
            user_id=provider_alpha.id,
            service_id=svc.id,
            interaction_type="view",
            is_synthetic=True,
        )
        db_session.add(interaction)
        db_session.commit()

    # Interaction Funnel
    funnel_res = client.get("/api/v2/provider/analytics/interactions?period=30d", headers=alpha_headers)
    assert funnel_res.status_code == 200
    funnel_data = funnel_res.json()["data"]
    assert "funnel_steps" in funnel_data
    assert "overall_conversion_rate" in funnel_data

    # Bookings Report
    bookings_res = client.get("/api/v2/provider/analytics/bookings-report?period=30d", headers=alpha_headers)
    assert bookings_res.status_code == 200
    b_data = bookings_res.json()["data"]
    assert "lead_time_distribution" in b_data
    assert "status_distribution" in b_data
    assert "average_lead_time_days" in b_data


def test_deterministic_recommendation_engine(alpha_headers):
    client = TestClient(app)
    recs_res = client.get("/api/v2/provider/analytics/recommendations", headers=alpha_headers)
    assert recs_res.status_code == 200
    recs_data = recs_res.json()["data"]
    assert "recommendations" in recs_data
    assert "confidence_level" in recs_data
    assert recs_data["confidence_level"] in ["LOW_DATA", "SUFFICIENT_DATA", "HIGH_CONFIDENCE"]
    assert "smart_slots" in recs_data
    assert "pricing_insight" in recs_data
