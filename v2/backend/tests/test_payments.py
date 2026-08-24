"""Integration tests for Payment & Razorpay Verification Engine."""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_customer(client: TestClient) -> dict:
    """Create test customer and return JWT auth header."""
    user_payload = {
        "email": "payer.customer@example.com",
        "password": "SecurePassword123!",
        "full_name": "Payer Customer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_other(client: TestClient) -> dict:
    """Create second customer for cross-user security checks."""
    user_payload = {
        "email": "other.payer@example.com",
        "password": "SecurePassword123!",
        "full_name": "Other Payer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_payment_order_unauthenticated_fails(client: TestClient):
    """Verify unauthenticated requests return 401."""
    resp = client.post("/api/v2/payments/create-order", json={"booking_id": "any-id"})
    assert resp.status_code == 401


def test_create_payment_order_success(client: TestClient, auth_headers_customer: dict):
    """Verify customer can create a payment order for their pending booking."""
    # 1. Create a pending booking
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    future_date = (date.today() + timedelta(days=3)).strftime("%Y-%m-%d")

    bkg_resp = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date, "guest_count": 2},
        headers=auth_headers_customer,
    )
    assert bkg_resp.status_code == 201
    booking_id = bkg_resp.json()["data"]["id"]

    # 2. Create Payment Order
    order_resp = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": booking_id},
        headers=auth_headers_customer,
    )
    assert order_resp.status_code == 201
    data = order_resp.json()["data"]

    assert data["order_id"].startswith("order_")
    assert data["amount"] > 0
    assert data["amount_paise"] == int(round(data["amount"] * 100))
    assert data["currency"] == "INR"
    assert "key_id" in data
    # Ensure NO secret is present in response
    assert "key_secret" not in data
    assert "secret" not in data


def test_create_payment_order_cross_user_forbidden(
    client: TestClient,
    auth_headers_customer: dict,
    auth_headers_other: dict,
):
    """Verify customer B cannot create a payment order for customer A's booking."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    future_date = (date.today() + timedelta(days=4)).strftime("%Y-%m-%d")

    bkg_resp = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date, "guest_count": 1},
        headers=auth_headers_customer,
    )
    booking_id = bkg_resp.json()["data"]["id"]

    order_resp = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": booking_id},
        headers=auth_headers_other,
    )
    assert order_resp.status_code == 403


def test_verify_payment_success_and_idempotency(client: TestClient, auth_headers_customer: dict):
    """Verify payment signature verification confirms booking and is safely idempotent."""
    # 1. Create booking
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    future_date = (date.today() + timedelta(days=6)).strftime("%Y-%m-%d")

    bkg_resp = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date, "guest_count": 1},
        headers=auth_headers_customer,
    )
    booking_id = bkg_resp.json()["data"]["id"]

    # 2. Create order
    order_resp = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": booking_id},
        headers=auth_headers_customer,
    )
    order_id = order_resp.json()["data"]["order_id"]

    # 3. Verify Payment with mock signature
    verify_payload = {
        "booking_id": booking_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_test_998877",
        "razorpay_signature": "mock_sig_123456",
    }
    verify_resp = client.post("/api/v2/payments/verify", json=verify_payload, headers=auth_headers_customer)
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()["data"]
    assert v_data["status"] == "CONFIRMED"
    assert v_data["payment_id"] == "pay_test_998877"

    # 4. Check Booking is now CONFIRMED
    detail_resp = client.get(f"/api/v2/bookings/{booking_id}", headers=auth_headers_customer)
    assert detail_resp.json()["data"]["status"] == "CONFIRMED"

    # 5. Idempotent re-verification returns success
    re_verify_resp = client.post("/api/v2/payments/verify", json=verify_payload, headers=auth_headers_customer)
    assert re_verify_resp.status_code == 200
    assert re_verify_resp.json()["data"]["status"] == "CONFIRMED"

    # 6. Cannot create another payment order for an already confirmed booking
    dup_order_resp = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": booking_id},
        headers=auth_headers_customer,
    )
    assert dup_order_resp.status_code == 409


def test_verify_payment_invalid_signature_rejected(client: TestClient, auth_headers_customer: dict):
    """Verify invalid signature is rejected with 400 Bad Request."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    future_date = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")

    bkg_resp = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date, "guest_count": 1},
        headers=auth_headers_customer,
    )
    booking_id = bkg_resp.json()["data"]["id"]

    order_resp = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": booking_id},
        headers=auth_headers_customer,
    )
    order_id = order_resp.json()["data"]["order_id"]

    # Invalid non-matching signature
    verify_payload = {
        "booking_id": booking_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_test_tampered",
        "razorpay_signature": "tampered_invalid_signature_abc",
    }
    verify_resp = client.post("/api/v2/payments/verify", json=verify_payload, headers=auth_headers_customer)
    assert verify_resp.status_code == 400
