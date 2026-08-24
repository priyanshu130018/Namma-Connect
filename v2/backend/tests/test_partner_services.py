"""Integration tests for Provider Service Management & Ownership Enforcement."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User


@pytest.fixture
def auth_headers_partner_a(client: TestClient) -> dict:
    """Create test partner A."""
    user_payload = {
        "email": "host.alpha@example.com",
        "password": "SecurePassword123!",
        "full_name": "Host Alpha",
        "role": "partner",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_partner_b(client: TestClient) -> dict:
    """Create test partner B."""
    user_payload = {
        "email": "host.beta@example.com",
        "password": "SecurePassword123!",
        "full_name": "Host Beta",
        "role": "farmer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_customer(client: TestClient) -> dict:
    """Create test customer user."""
    user_payload = {
        "email": "traveler.services@example.com",
        "password": "SecurePassword123!",
        "full_name": "Traveler Services",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_partner_services_unauthenticated_fails(client: TestClient):
    """Verify unauthenticated access to partner services returns 401."""
    resp = client.get("/api/v2/services/partner/me")
    assert resp.status_code == 401


def test_partner_services_customer_role_rejected(client: TestClient, auth_headers_customer: dict):
    """Verify customer role cannot access partner services (403)."""
    resp = client.get("/api/v2/services/partner/me", headers=auth_headers_customer)
    assert resp.status_code == 403


def test_partner_service_crud_and_isolation_workflow(
    client: TestClient,
    auth_headers_partner_a: dict,
    auth_headers_partner_b: dict,
):
    """Verify partner service creation, draft privacy, cross-partner protection, editing, and submission for review."""
    # 1. Create a draft service as Partner A
    create_payload = {
        "title": "Coorg Spice Plantation Homestay",
        "description": "Authentic cardamom and pepper estate homestay in Western Ghats.",
        "category": "Stay",
        "category_slug": "stay",
        "location": "Madikeri, Kodagu",
        "district": "Kodagu",
        "state": "Karnataka",
        "price": 4500.0,
        "unit": "night",
        "max_capacity": 6,
        "primary_image": "/images/services/coorg-spice.jpg",
        "images": ["/images/services/coorg-spice.jpg", "/images/services/room.jpg"],
        "inclusions": ["Traditional Kodava Breakfast", "Estate Nature Walk"],
        "amenities": ["Wi-Fi", "Hot Water", "Farm Tour"],
        "status": "DRAFT",
    }
    create_resp = client.post("/api/v2/services", headers=auth_headers_partner_a, json=create_payload)
    assert create_resp.status_code in [200, 201]
    created_service = create_resp.json()["data"]
    service_id = created_service["id"]
    assert created_service["title"] == "Coorg Spice Plantation Homestay"
    assert created_service["status"] == "DRAFT"
    assert created_service["provider_name"] == "Host Alpha"

    # 2. Verify Draft service does NOT appear in public catalog
    public_resp = client.get("/api/v2/services")
    assert public_resp.status_code == 200
    public_ids = [s["id"] for s in public_resp.json()["data"]["services"]]
    assert service_id not in public_ids

    # 3. Partner A can list their services and see the draft
    list_a_resp = client.get("/api/v2/services/partner/me", headers=auth_headers_partner_a)
    assert list_a_resp.status_code == 200
    a_services = list_a_resp.json()["data"]
    assert any(s["id"] == service_id for s in a_services)

    # 4. Partner B lists services and does NOT see Partner A's service
    list_b_resp = client.get("/api/v2/services/partner/me", headers=auth_headers_partner_b)
    assert list_b_resp.status_code == 200
    b_services = list_b_resp.json()["data"]
    assert not any(s["id"] == service_id for s in b_services)

    # 5. Partner B cannot view Partner A's service (403 Forbidden)
    cross_get_resp = client.get(f"/api/v2/services/partner/{service_id}", headers=auth_headers_partner_b)
    assert cross_get_resp.status_code == 403

    # 6. Partner B cannot modify Partner A's service (403 Forbidden)
    cross_put_resp = client.put(
        f"/api/v2/services/partner/{service_id}",
        headers=auth_headers_partner_b,
        json={"price": 9999.0},
    )
    assert cross_put_resp.status_code == 403

    # 7. Partner A can view and update their service
    update_resp = client.put(
        f"/api/v2/services/partner/{service_id}",
        headers=auth_headers_partner_a,
        json={"price": 4800.0, "description": "Updated serene estate homestay."},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["price"] == 4800.0
    assert update_resp.json()["data"]["description"] == "Updated serene estate homestay."

    # 8. Partner B cannot submit Partner A's service for review (403 Forbidden)
    cross_submit_resp = client.post(
        f"/api/v2/services/partner/{service_id}/submit-review",
        headers=auth_headers_partner_b,
    )
    assert cross_submit_resp.status_code == 403

    # 9. Partner A submits service for review
    submit_resp = client.post(
        f"/api/v2/services/partner/{service_id}/submit-review",
        headers=auth_headers_partner_a,
    )
    assert submit_resp.status_code == 200
    assert submit_resp.json()["data"]["status"] == "UNDER REVIEW"
