"""Tests for Admin workflow, RBAC permissions, Security Middleware, Rate Limiting, and Catalog Moderation."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import get_password_hash
from app.core.rate_limiter import RateLimiter


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Create or return an admin user."""
    admin = db_session.query(User).filter(User.email == "system.admin@nammaconnect.com").first()
    if not admin:
        admin = User(
            email="system.admin@nammaconnect.com",
            hashed_password=get_password_hash("AdminPass123!"),
            full_name="System Administrator",
            role="admin",
            is_active=True,
            is_verified=True,
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)
    return admin


@pytest.fixture
def partner_user(db_session: Session) -> User:
    """Create or return a partner provider user."""
    partner = db_session.query(User).filter(User.email == "coorg.host@example.com").first()
    if not partner:
        partner = User(
            email="coorg.host@example.com",
            hashed_password=get_password_hash("PartnerPass123!"),
            full_name="Coorg Plantation Host",
            role="partner",
            is_active=True,
            is_verified=True,
        )
        db_session.add(partner)
        db_session.commit()
        db_session.refresh(partner)
    return partner


@pytest.fixture
def customer_user(db_session: Session) -> User:
    """Create or return a normal customer user."""
    customer = db_session.query(User).filter(User.email == "normal.traveler@example.com").first()
    if not customer:
        customer = User(
            email="normal.traveler@example.com",
            hashed_password=get_password_hash("CustomerPass123!"),
            full_name="Normal Traveler",
            role="customer",
            is_active=True,
            is_verified=False,
        )
        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)
    return customer


@pytest.fixture
def admin_headers(client: TestClient, admin_user: User) -> dict:
    resp = client.post("/api/v2/auth/login", json={"email": admin_user.email, "password": "AdminPass123!"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def customer_headers(client: TestClient, customer_user: User) -> dict:
    resp = client.post("/api/v2/auth/login", json={"email": customer_user.email, "password": "CustomerPass123!"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def partner_headers(client: TestClient, partner_user: User) -> dict:
    resp = client.post("/api/v2/auth/login", json={"email": partner_user.email, "password": "PartnerPass123!"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_security_headers_and_request_id(client: TestClient):
    """Verify security middleware sets X-Request-ID and standard security headers."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert "x-request-id" in resp.headers
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert "strict-origin" in resp.headers.get("referrer-policy", "")


def test_customer_forbidden_from_admin_endpoints(client: TestClient, customer_headers: dict):
    """Customer role must be denied with 403 on admin endpoints."""
    # Overview
    resp1 = client.get("/api/v2/admin/overview", headers=customer_headers)
    assert resp1.status_code == 403

    # User directory
    resp2 = client.get("/api/v2/admin/users", headers=customer_headers)
    assert resp2.status_code == 403

    # Services moderation
    resp3 = client.get("/api/v2/admin/services", headers=customer_headers)
    assert resp3.status_code == 403


def test_admin_read_access_and_user_lookup(client: TestClient, admin_headers: dict, customer_user: User):
    """Admin can list users and inspect specific user by NC ID."""
    # List users
    resp = client.get("/api/v2/admin/users", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 1

    # Lookup customer by NC ID
    detail_resp = client.get(f"/api/v2/admin/users/{customer_user.id}", headers=admin_headers)
    assert detail_resp.status_code == 200
    user_data = detail_resp.json()["data"]
    assert user_data["id"] == str(customer_user.id)
    assert user_data["email"] == customer_user.email


def test_admin_service_moderation_workflow(
    client: TestClient,
    admin_headers: dict,
    partner_headers: dict,
    partner_user: User,
):
    """Admin can approve and reject services, enforcing provider validity and publishing state."""
    # 1. Partner creates a draft service
    create_resp = client.post(
        "/api/v2/services",
        headers=partner_headers,
        json={
            "title": "Sakleshpur Coffee Trail",
            "description": "Walk among arabica plants and fresh pepper vines in high elevation.",
            "category": "Experience",
            "location": "Sakleshpur, Karnataka",
            "price": 1499.0,
        },
    )
    assert create_resp.status_code == 200
    service_id = create_resp.json()["data"]["id"]

    # 2. Partner submits draft for review
    sub_resp = client.post(f"/api/v2/services/partner/{service_id}/submit-review", headers=partner_headers)
    assert sub_resp.status_code == 200
    assert sub_resp.json()["data"]["status"] == "PENDING"

    # 3. Admin inspects service
    inspect_resp = client.get(f"/api/v2/admin/services/{service_id}", headers=admin_headers)
    assert inspect_resp.status_code == 200
    assert inspect_resp.json()["data"]["id"] == service_id

    # 4. Admin approves service
    appr_resp = client.post(f"/api/v2/admin/services/{service_id}/approve", headers=admin_headers)
    assert appr_resp.status_code == 200
    assert appr_resp.json()["data"]["status"] == "PUBLISHED"

    # 5. Admin removes service (soft delete / unpublish)
    rem_resp = client.post(
        f"/api/v2/admin/services/{service_id}/remove",
        headers=admin_headers,
        json={"removal_reason": "Seasonal closure for monsoon maintenance"},
    )
    assert rem_resp.status_code == 200
    assert rem_resp.json()["data"]["status"] == "REMOVED"


def test_rate_limiter_in_memory_behavior():
    """Verify RateLimiter sliding window limits requests once threshold is hit."""
    test_key = "test_rate_key_unique_1"
    max_req = 3
    window = 10

    # 3 requests should pass
    assert RateLimiter.is_rate_limited(test_key, max_req, window) is False
    assert RateLimiter.is_rate_limited(test_key, max_req, window) is False
    assert RateLimiter.is_rate_limited(test_key, max_req, window) is False

    # 4th request must be rate limited
    assert RateLimiter.is_rate_limited(test_key, max_req, window) is True
