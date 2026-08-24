"""Integration tests for Customer Booking Engine & Lifecycle."""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_customer(client: TestClient) -> dict:
    """Create a test customer user and return valid Authorization Bearer header."""
    user_payload = {
        "email": "traveler.priya@example.com",
        "password": "SecurePassword123!",
        "full_name": "Priyanshu Traveler",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_other_customer(client: TestClient) -> dict:
    """Create a second customer user for authorization isolation testing."""
    user_payload = {
        "email": "other.traveler@example.com",
        "password": "SecurePassword123!",
        "full_name": "Other Traveler",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


def test_create_booking_unauthenticated_fails(client: TestClient):
    """Verify unauthenticated booking request returns 401."""
    resp = client.post("/api/v2/bookings", json={"service_id": "any", "start_date": "2026-09-10", "guest_count": 1})
    assert resp.status_code == 401


def test_create_booking_success(client: TestClient, auth_headers_customer: dict):
    """Verify authenticated customer can create a pending booking with server-calculated price."""
    list_resp = client.get("/api/v2/services")
    service = list_resp.json()["data"]["services"][0]
    service_id = service["id"]

    tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

    payload = {
        "service_id": service_id,
        "start_date": tomorrow,
        "guest_count": 2,
        "special_requests": "Vegetarian meal preference.",
    }

    resp = client.post("/api/v2/bookings", json=payload, headers=auth_headers_customer)
    assert resp.status_code == 201
    data = resp.json()["data"]

    assert "id" in data
    assert data["service_id"] == service_id
    assert data["status"] == "PENDING"
    assert data["guest_count"] == 2
    assert data["booking_code"].startswith("NC-BKG-")
    assert data["total_amount"] > 0
    assert data["special_requests"] == "Vegetarian meal preference."


def test_create_booking_past_date_rejected(client: TestClient, auth_headers_customer: dict):
    """Verify booking dates in the past are rejected with 400."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]

    payload = {
        "service_id": service_id,
        "start_date": "2020-01-01",
        "guest_count": 1,
    }
    resp = client.post("/api/v2/bookings", json=payload, headers=auth_headers_customer)
    assert resp.status_code == 400


def test_create_booking_capacity_exceeded_rejected(client: TestClient, auth_headers_customer: dict):
    """Verify exceeding capacity is rejected by server validation."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

    payload = {
        "service_id": service_id,
        "start_date": tomorrow,
        "guest_count": 99,  # Exceeds max capacity of farm
    }
    resp = client.post("/api/v2/bookings", json=payload, headers=auth_headers_customer)
    assert resp.status_code == 400


def test_get_my_bookings(client: TestClient, auth_headers_customer: dict):
    """Verify GET /api/v2/bookings/me returns customer's booking list."""
    resp = client.get("/api/v2/bookings/me", headers=auth_headers_customer)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "bookings" in data
    assert isinstance(data["bookings"], list)
    assert len(data["bookings"]) >= 1


def test_customer_isolation_on_single_booking(
    client: TestClient,
    auth_headers_customer: dict,
    auth_headers_other_customer: dict,
):
    """Verify customer A can access their booking, but customer B receives 403 Forbidden."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    tomorrow = (date.today() + timedelta(days=2)).strftime("%Y-%m-%d")

    create_resp = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": tomorrow, "guest_count": 1},
        headers=auth_headers_customer,
    )
    booking_id = create_resp.json()["data"]["id"]

    # Customer A gets their booking -> 200
    owner_resp = client.get(f"/api/v2/bookings/{booking_id}", headers=auth_headers_customer)
    assert owner_resp.status_code == 200
    assert owner_resp.json()["data"]["id"] == booking_id

    # Customer B attempts to access Customer A's booking -> 403
    other_resp = client.get(f"/api/v2/bookings/{booking_id}", headers=auth_headers_other_customer)
    assert other_resp.status_code == 403


def test_cancel_booking_success_and_lifecycle(
    client: TestClient,
    auth_headers_customer: dict,
    auth_headers_other_customer: dict,
):
    """Verify customer can cancel pending reservation, but other customer or double cancel is rejected."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    future_date = (date.today() + timedelta(days=5)).strftime("%Y-%m-%d")

    # 1. Create booking
    create_resp = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date, "guest_count": 1},
        headers=auth_headers_customer,
    )
    booking_id = create_resp.json()["data"]["id"]

    # 2. Other customer attempts to cancel -> 403
    other_cancel_resp = client.post(
        f"/api/v2/bookings/{booking_id}/cancel",
        headers=auth_headers_other_customer,
    )
    assert other_cancel_resp.status_code == 403

    # 3. Owner cancels booking -> 200
    owner_cancel_resp = client.post(
        f"/api/v2/bookings/{booking_id}/cancel",
        headers=auth_headers_customer,
    )
    assert owner_cancel_resp.status_code == 200
    assert owner_cancel_resp.json()["data"]["status"] == "CANCELLED"

    # 4. Double cancellation is rejected -> 400
    double_cancel_resp = client.post(
        f"/api/v2/bookings/{booking_id}/cancel",
        headers=auth_headers_customer,
    )
    assert double_cancel_resp.status_code == 400
