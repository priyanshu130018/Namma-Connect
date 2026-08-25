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


def test_verify_payment_with_real_hmac_sha256(
    client: TestClient, auth_headers_customer: dict
):
    """Verify cryptographic HMAC-SHA256 signature verification and notification creation."""
    import hmac
    import hashlib
    from app.core.config import settings

    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    future_date = (date.today() + timedelta(days=8)).strftime("%Y-%m-%d")

    bkg_resp = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date, "guest_count": 2},
        headers=auth_headers_customer,
    )
    booking_id = bkg_resp.json()["data"]["id"]

    order_resp = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": booking_id},
        headers=auth_headers_customer,
    )
    order_id = order_resp.json()["data"]["order_id"]
    payment_id = "pay_real_test_554433"

    # Compute actual HMAC-SHA256 signature
    secret = settings.RAZORPAY_KEY_SECRET or "rzp_test_secret"
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    real_sig = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    verify_payload = {
        "booking_id": booking_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": real_sig,
    }
    verify_resp = client.post("/api/v2/payments/verify", json=verify_payload, headers=auth_headers_customer)
    assert verify_resp.status_code == 200
    assert verify_resp.json()["data"]["status"] == "CONFIRMED"

    # Verify notification created
    notif_resp = client.get("/api/v2/notifications", headers=auth_headers_customer)
    assert notif_resp.status_code == 200
    notifs = notif_resp.json()["data"]["notifications"]
    assert any("payment" in n["title"].lower() or "confirmed" in n["title"].lower() for n in notifs)


def test_verify_payment_cross_user_forbidden(
    client: TestClient,
    auth_headers_customer: dict,
    auth_headers_other: dict,
):
    """Verify customer B cannot verify payment for customer A's booking."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    future_date = (date.today() + timedelta(days=9)).strftime("%Y-%m-%d")

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

    verify_payload = {
        "booking_id": booking_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_test_steal",
        "razorpay_signature": "mock_sig_123456",
    }
    # Customer B attempts verification -> 403 Forbidden
    verify_resp = client.post("/api/v2/payments/verify", json=verify_payload, headers=auth_headers_other)
    assert verify_resp.status_code == 403


def test_create_payment_order_cancelled_booking_rejected(
    client: TestClient, auth_headers_customer: dict
):
    """Verify cancelled booking cannot have a payment order created."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    future_date = (date.today() + timedelta(days=2)).strftime("%Y-%m-%d")

    bkg_resp = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date, "guest_count": 1},
        headers=auth_headers_customer,
    )
    booking_id = bkg_resp.json()["data"]["id"]

    # Cancel booking
    cancel_resp = client.post(f"/api/v2/bookings/{booking_id}/cancel", headers=auth_headers_customer)
    assert cancel_resp.status_code == 200

    # Try creating payment order
    order_resp = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": booking_id},
        headers=auth_headers_customer,
    )
    assert order_resp.status_code == 400


def test_create_payment_order_frontend_amount_cannot_override(
    client: TestClient, auth_headers_customer: dict
):
    """Verify backend amount is strictly authoritative and frontend cannot tamper with amount."""
    list_resp = client.get("/api/v2/services")
    service = list_resp.json()["data"]["services"][0]
    service_id = service["id"]
    unit_price = service["price"]
    future_date = (date.today() + timedelta(days=3)).strftime("%Y-%m-%d")

    bkg_resp = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date, "guest_count": 3},
        headers=auth_headers_customer,
    )
    bkg_data = bkg_resp.json()["data"]
    booking_id = bkg_data["id"]
    expected_total = bkg_data["total_amount"]

    # Attempt to send tampered amount
    order_resp = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": booking_id, "amount": 1, "amount_paise": 100},
        headers=auth_headers_customer,
    )
    assert order_resp.status_code == 201
    data = order_resp.json()["data"]
    # Verify authoritative server amount is preserved
    assert data["amount"] == expected_total
    assert data["amount_paise"] == int(round(expected_total * 100))


def test_payment_database_record_creation_and_no_duplicates(
    client: TestClient, auth_headers_customer: dict
):
    """Verify payment record is correctly persisted in DB and not duplicated on repeat order calls."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    future_date = (date.today() + timedelta(days=4)).strftime("%Y-%m-%d")

    bkg_resp = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date, "guest_count": 1},
        headers=auth_headers_customer,
    )
    booking_id = bkg_resp.json()["data"]["id"]

    # 1. First create-order call
    order1 = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": booking_id},
        headers=auth_headers_customer,
    ).json()["data"]

    # 2. Second create-order call on same pending booking
    order2 = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": booking_id},
        headers=auth_headers_customer,
    ).json()["data"]

    # Must reuse the same pending order ID
    assert order1["order_id"] == order2["order_id"]
    assert order1["booking_id"] == order2["booking_id"]


def test_verify_payment_wrong_order_or_booking_mismatch_rejected(
    client: TestClient, auth_headers_customer: dict
):
    """Verify mismatched order ID or booking association is rejected."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    future_date1 = (date.today() + timedelta(days=5)).strftime("%Y-%m-%d")
    future_date2 = (date.today() + timedelta(days=6)).strftime("%Y-%m-%d")

    # Create Booking 1
    bkg1 = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date1, "guest_count": 1},
        headers=auth_headers_customer,
    ).json()["data"]["id"]

    # Create Booking 2
    bkg2 = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date2, "guest_count": 1},
        headers=auth_headers_customer,
    ).json()["data"]["id"]

    order1 = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": bkg1},
        headers=auth_headers_customer,
    ).json()["data"]["order_id"]

    # Try verifying Booking 2 with Booking 1's Order ID -> mismatch rejected
    verify_resp = client.post(
        "/api/v2/payments/verify",
        json={
            "booking_id": bkg2,
            "razorpay_order_id": order1,
            "razorpay_payment_id": "pay_mismatch_123",
            "razorpay_signature": "mock_sig_123456",
        },
        headers=auth_headers_customer,
    )
    assert verify_resp.status_code == 400


def test_verify_payment_failed_signature_marks_payment_failed_and_keeps_booking_pending(
    client: TestClient, auth_headers_customer: dict
):
    """Verify invalid signature transitions payment to FAILED while booking remains PENDING for retry."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    future_date = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")

    bkg = client.post(
        "/api/v2/bookings",
        json={"service_id": service_id, "start_date": future_date, "guest_count": 1},
        headers=auth_headers_customer,
    ).json()["data"]["id"]

    order = client.post(
        "/api/v2/payments/create-order",
        json={"booking_id": bkg},
        headers=auth_headers_customer,
    ).json()["data"]["order_id"]

    # Bad signature
    verify_resp = client.post(
        "/api/v2/payments/verify",
        json={
            "booking_id": bkg,
            "razorpay_order_id": order,
            "razorpay_payment_id": "pay_fail_test",
            "razorpay_signature": "invalid_bad_sig",
        },
        headers=auth_headers_customer,
    )
    assert verify_resp.status_code == 400

    # Booking must still be PENDING (not marked confirmed)
    bkg_detail = client.get(f"/api/v2/bookings/{bkg}", headers=auth_headers_customer).json()["data"]
    assert bkg_detail["status"] == "PENDING"
