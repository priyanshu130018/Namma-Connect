"""Tests for Provider APIs and Authorization Rules."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User
from app.models.service import Service
from app.models.partner_application import PartnerApplication
from app.core.security import create_access_token


import uuid


@pytest.fixture
def test_customer(db_session: Session) -> User:
    uid = uuid.uuid4().hex[:8]
    user = User(
        email=f"regular_user_{uid}@example.com",
        full_name="Regular Customer",
        role="user",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_unverified_provider(db_session: Session) -> User:
    uid = uuid.uuid4().hex[:8]
    user = User(
        email=f"unverified_partner_{uid}@example.com",
        full_name="Unverified Partner",
        role="partner",
        is_active=True,
        is_verified=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_verified_provider(db_session: Session) -> User:
    uid = uuid.uuid4().hex[:8]
    user = User(
        email=f"verified_partner_{uid}@example.com",
        full_name="Verified Partner",
        role="partner",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()

    # Create approved KYC partner application
    partner_app = PartnerApplication(
        application_code=f"APP-VERIFIED-{uid}",
        user_id=user.id,
        role_type="farmer",
        full_name=user.full_name,
        email=user.email,
        mobile="+91 9876543210",
        address="Coorg Estate",
        district="Kodagu",
        state="Karnataka",
        business_name="Coorg Plantation Stays",
        id_type="Aadhaar",
        id_number="123456789012",
        status="APPROVED",
    )
    db_session.add(partner_app)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def customer_headers(test_customer: User) -> dict:
    token = create_access_token(str(test_customer.id), role=test_customer.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def unverified_provider_headers(test_unverified_provider: User) -> dict:
    token = create_access_token(str(test_unverified_provider.id), role=test_unverified_provider.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def verified_provider_headers(test_verified_provider: User) -> dict:
    token = create_access_token(str(test_verified_provider.id), role=test_verified_provider.role)
    return {"Authorization": f"Bearer {token}"}


def test_provider_access_unauthenticated_fails():
    client = TestClient(app)
    response = client.get("/api/v2/provider/dashboard")
    assert response.status_code == 401


def test_customer_access_provider_api_fails(customer_headers):
    client = TestClient(app)
    response = client.get("/api/v2/provider/dashboard", headers=customer_headers)
    assert response.status_code == 403
    assert "Provider role required" in response.json()["detail"]


def test_unverified_provider_access_fails_kyc(unverified_provider_headers):
    client = TestClient(app)
    # Unverified provider attempts to create listing
    payload = {
        "title": "Test Unverified Farm Tour",
        "description": "A tour around organic farm",
        "category": "farm",
        "location": "Mandya",
        "price": 500,
    }
    response = client.post("/api/v2/provider/listings", json=payload, headers=unverified_provider_headers)
    assert response.status_code == 403
    assert "verification required" in response.json()["detail"].lower()


def test_verified_provider_profile_and_kyc(verified_provider_headers):
    client = TestClient(app)
    # 1. Get Profile
    response = client.get("/api/v2/provider/profile", headers=verified_provider_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"].startswith("verified_partner_")
    assert data["is_verified"] is True
    assert data["kyc_status"] == "APPROVED"
    assert data["business_name"] == "Coorg Plantation Stays"

    # 2. Update Profile
    update_res = client.put(
        "/api/v2/provider/profile",
        json={"bio": "Master coffee grower in Western Ghats", "location": "Madikeri, Coorg"},
        headers=verified_provider_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["bio"] == "Master coffee grower in Western Ghats"

    # 3. Get KYC Details
    kyc_res = client.get("/api/v2/provider/kyc", headers=verified_provider_headers)
    assert kyc_res.status_code == 200
    assert kyc_res.json()["data"]["status"] == "APPROVED"


def test_verified_provider_dashboard_summary(verified_provider_headers):
    client = TestClient(app)
    response = client.get("/api/v2/provider/dashboard", headers=verified_provider_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "greeting" in data
    assert data["is_verified"] is True
    assert data["badge_text"] == "✓ Verified Provider"
    assert "overview_cards" in data
    assert "action_required" in data
    assert "booking_overview" in data


def test_verified_provider_listings_crud(verified_provider_headers):
    client = TestClient(app)
    # 1. Create Listing
    create_payload = {
        "title": "Coorg Organic Coffee Plantation Walk",
        "description": "Walk through estate trails, pick berries, and taste fresh filter coffee.",
        "category": "farm",
        "category_slug": "farm",
        "location": "Madikeri, Coorg",
        "price": 750.0,
        "unit": "person",
        "max_capacity": 15,
    }
    create_res = client.post("/api/v2/provider/listings", json=create_payload, headers=verified_provider_headers)
    assert create_res.status_code == 200
    listing_id = create_res.json()["data"]["id"]
    assert create_res.json()["data"]["title"] == "Coorg Organic Coffee Plantation Walk"

    # 2. List Listings
    list_res = client.get("/api/v2/provider/listings", headers=verified_provider_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 1

    # 3. Update Listing
    patch_res = client.patch(
        f"/api/v2/provider/listings/{listing_id}",
        json={"price": 850.0, "description": "Updated trail walk description."},
        headers=verified_provider_headers,
    )
    assert patch_res.status_code == 200

    # 4. Delete/Archive Listing
    del_res = client.delete(f"/api/v2/provider/listings/{listing_id}", headers=verified_provider_headers)
    assert del_res.status_code == 200


def test_verified_provider_analytics_suite(verified_provider_headers):
    client = TestClient(app)
    # 1. Overview
    res1 = client.get("/api/v2/provider/analytics/overview?period=30d", headers=verified_provider_headers)
    assert res1.status_code == 200
    assert "total_bookings" in res1.json()["data"]

    # 2. Trends
    res2 = client.get("/api/v2/provider/analytics/trends?period=30d", headers=verified_provider_headers)
    assert res2.status_code == 200
    assert "series" in res2.json()["data"]

    # 3. Best Services
    res3 = client.get("/api/v2/provider/analytics/best-services?sort_by=bookings", headers=verified_provider_headers)
    assert res3.status_code == 200

    # 4. Demand Analysis
    res4 = client.get("/api/v2/provider/analytics/demand", headers=verified_provider_headers)
    assert res4.status_code == 200

    # 5. Smart Recommendations
    res5 = client.get("/api/v2/provider/analytics/recommendations", headers=verified_provider_headers)
    assert res5.status_code == 200
    assert "pricing_insight" in res5.json()["data"]

    # 6. Export CSV
    res6 = client.get("/api/v2/provider/analytics/export", headers=verified_provider_headers)
    assert res6.status_code == 200
    assert "text/csv" in res6.headers["content-type"]
