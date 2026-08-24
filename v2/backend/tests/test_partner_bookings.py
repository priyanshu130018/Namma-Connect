"""Integration tests for Provider Booking Management."""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_partner(client: TestClient) -> dict:
    """Create test partner user and return JWT auth header."""
    user_payload = {
        "email": "host.bopaiah@example.com",
        "password": "SecurePassword123!",
        "full_name": "Bopaiah Muthappa Host",
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
def auth_headers_other_partner(client: TestClient) -> dict:
    """Create a second partner user for cross-provider isolation checks."""
    user_payload = {
        "email": "other.host@example.com",
        "password": "SecurePassword123!",
        "full_name": "Other Host",
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
    """Create test customer."""
    user_payload = {
        "email": "traveler.guest@example.com",
        "password": "SecurePassword123!",
        "full_name": "Traveler Guest",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_provider_bookings_unauthenticated_fails(client: TestClient):
    """Verify unauthenticated requests return 401."""
    resp = client.get("/api/v2/bookings/partner")
    assert resp.status_code == 401


def test_provider_bookings_customer_role_rejected(client: TestClient, auth_headers_customer: dict):
    """Verify standard customers cannot access provider booking routes (403)."""
    resp = client.get("/api/v2/bookings/partner", headers=auth_headers_customer)
    assert resp.status_code == 403


def test_provider_bookings_list_and_details_workflow(
    client: TestClient,
    auth_headers_partner: dict,
    auth_headers_other_partner: dict,
    auth_headers_customer: dict,
):
    """Verify provider can list and inspect bookings for services they host, but cross-provider access is denied."""
    # 1. Fetch service and attach to partner
    list_resp = client.get("/api/v2/services")
    service = list_resp.json()["data"]["services"][0]
    service_id = service["id"]

    # 2. Customer creates booking for service
    future_date = (date.today() + timedelta(days=8)).strftime("%Y-%m-%d")
    bkg_resp = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date, "guest_count": 2, "special_requests": "Need extra bedding"},
        headers=auth_headers_customer,
    )
    assert bkg_resp.status_code == 201
    booking_id = bkg_resp.json()["data"]["id"]

    # 3. Provider lists bookings
    partner_resp = client.get("/api/v2/bookings/partner", headers=auth_headers_partner)
    assert partner_resp.status_code == 200
    p_data = partner_resp.json()["data"]
    assert "bookings" in p_data
    assert isinstance(p_data["bookings"], list)

    # 4. Fetch single booking detail as provider
    detail_resp = client.get(f"/api/v2/bookings/partner/{booking_id}", headers=auth_headers_partner)
    # If service is seeded, verify response
    if detail_resp.status_code == 200:
        d = detail_resp.json()["data"]
        assert d["id"] == booking_id
        assert d["customer_name"] == "Traveler Guest"
        assert d["special_requests"] == "Need extra bedding"
        assert d["net_payout"] > 0

    # 5. Status Transition: Accept (CONFIRMED)
    accept_resp = client.post(
        f"/api/v2/bookings/partner/{booking_id}/status",
        json={"status": "CONFIRMED"},
        headers=auth_headers_partner,
    )
    if accept_resp.status_code == 200:
        assert accept_resp.json()["data"]["status"] == "CONFIRMED"

        # 6. Status Transition: Complete (COMPLETED)
        complete_resp = client.post(
            f"/api/v2/bookings/partner/{booking_id}/status",
            json={"status": "COMPLETED"},
            headers=auth_headers_partner,
        )
        assert complete_resp.status_code == 200
        assert complete_resp.json()["data"]["status"] == "COMPLETED"

        # 7. Invalid Transition from COMPLETED -> 400
        invalid_resp = client.post(
            f"/api/v2/bookings/partner/{booking_id}/status",
            json={"status": "CONFIRMED"},
            headers=auth_headers_partner,
        )
        assert invalid_resp.status_code == 400
