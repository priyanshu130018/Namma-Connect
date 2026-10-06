"""Integration tests for Booking Cancellations and Refund Management."""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_customer1(client: TestClient) -> dict:
    """Create test customer 1."""
    user_payload = {
        "email": "cust1.refund@example.com",
        "password": "SecurePassword123!",
        "full_name": "Customer One Refund",
        "role": "customer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_customer2(client: TestClient) -> dict:
    """Create test customer 2."""
    user_payload = {
        "email": "cust2.refund@example.com",
        "password": "SecurePassword123!",
        "full_name": "Customer Two Refund",
        "role": "customer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_admin(client: TestClient) -> dict:
    """Create test admin."""
    user_payload = {
        "email": "admin.refund@example.com",
        "password": "SecurePassword123!",
        "full_name": "Admin Refund Officer",
        "role": "admin",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_cancellation_unauthenticated_fails(client: TestClient):
    """Unauthenticated cancel requests must be rejected."""
    resp = client.post("/api/v2/bookings/NC-BKG-SAMPLE/cancel")
    assert resp.status_code == 401


def test_unpaid_booking_cancellation_flow(
    client: TestClient,
    auth_headers_customer1: dict,
    auth_headers_customer2: dict,
):
    """Cancelling an unpaid booking marks it CANCELLED with NOT_ELIGIBLE refund."""
    # 1. Fetch available service
    services_resp = client.get("/api/v2/services")
    service_id = services_resp.json()["data"]["services"][0]["id"]

    start_date = (date.today() + timedelta(days=7)).isoformat()

    # 2. Customer 1 creates booking
    booking_resp = client.post(
        "/api/v2/bookings",
        headers=auth_headers_customer1,
        json={
            "service_id": service_id,
            "start_date": start_date,
            "guest_count": 2,
        },
    )
    assert booking_resp.status_code == 201
    booking = booking_resp.json()["data"]
    booking_id = booking["id"]
    assert booking["status"] == "PENDING"
    assert booking["is_cancellable"] is True

    # 3. Customer 2 cannot cancel Customer 1's booking (403 Forbidden)
    intruder_resp = client.post(f"/api/v2/bookings/{booking_id}/cancel", headers=auth_headers_customer2)
    assert intruder_resp.status_code == 403

    # 4. Customer 1 cancels their booking
    cancel_resp = client.post(f"/api/v2/bookings/{booking_id}/cancel", headers=auth_headers_customer1)
    assert cancel_resp.status_code == 200
    cancelled_bkg = cancel_resp.json()["data"]
    assert cancelled_bkg["status"] == "CANCELLED"
    assert cancelled_bkg["is_cancellable"] is False
    assert cancelled_bkg["refund_status"] == "NOT_ELIGIBLE"

    # 5. Idempotent re-cancellation fails cleanly
    dup_cancel = client.post(f"/api/v2/bookings/{booking_id}/cancel", headers=auth_headers_customer1)
    assert dup_cancel.status_code == 400


def test_paid_booking_cancellation_and_refund_calculation(
    client: TestClient,
    auth_headers_customer1: dict,
    auth_headers_admin: dict,
):
    """Cancelling a paid booking >= 48h before checkin issues 100% refund."""
    # 1. Get service
    services_resp = client.get("/api/v2/services")
    service_id = services_resp.json()["data"]["services"][0]["id"]

    start_date = (date.today() + timedelta(days=5)).isoformat()

    # 2. Create booking
    bkg_resp = client.post(
        "/api/v2/bookings",
        headers=auth_headers_customer1,
        json={
            "service_id": service_id,
            "start_date": start_date,
            "guest_count": 1,
        },
    )
    booking = bkg_resp.json()["data"]
    booking_id = booking["id"]

    # 3. Create payment order and verify payment (simulate paid booking)
    order_resp = client.post(
        "/api/v2/payments/create-order",
        headers=auth_headers_customer1,
        json={"booking_id": booking_id},
    )
    order_data = order_resp.json()["data"]

    verify_resp = client.post(
        "/api/v2/payments/verify",
        headers=auth_headers_customer1,
        json={
            "booking_id": booking_id,
            "razorpay_order_id": order_data["order_id"],
            "razorpay_payment_id": f"pay_test_{order_data['order_id']}",
            "razorpay_signature": "mock_sig_valid",
        },
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["data"]["status"] == "CONFIRMED"

    # 4. Customer 1 cancels the paid booking
    cancel_resp = client.post(f"/api/v2/bookings/{booking_id}/cancel", headers=auth_headers_customer1)
    assert cancel_resp.status_code == 200
    cancelled_bkg = cancel_resp.json()["data"]
    assert cancelled_bkg["status"] == "CANCELLED"
    assert cancelled_bkg["refund_status"] == "COMPLETED"
    assert cancelled_bkg["refund_amount"] == cancelled_bkg["total_amount"]
    assert cancelled_bkg["refund_code"] is not None

    # 5. Admin lists platform refunds and finds the completed refund
    admin_refunds_resp = client.get("/api/v2/admin/refunds", headers=auth_headers_admin)
    assert admin_refunds_resp.status_code == 200
    refunds = admin_refunds_resp.json()["data"]["refunds"]
    assert any(r["refund_code"] == cancelled_bkg["refund_code"] for r in refunds)
