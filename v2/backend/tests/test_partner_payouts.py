"""Integration tests for Provider Payouts and Settlement API."""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.service import Service
from app.models.booking import Booking
from app.models.payment import Payment


@pytest.fixture
def auth_headers_partner_a(client: TestClient) -> dict:
    """Create test partner A."""
    user_payload = {
        "email": "host.payout.a@example.com",
        "password": "SecurePassword123!",
        "full_name": "Host Payout Alpha",
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
        "email": "host.payout.b@example.com",
        "password": "SecurePassword123!",
        "full_name": "Host Payout Beta",
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
def auth_headers_customer(client: TestClient) -> dict:
    """Create test customer."""
    user_payload = {
        "email": "traveler.payout@example.com",
        "password": "SecurePassword123!",
        "full_name": "Traveler Payout",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_provider_payouts_unauthenticated_fails(client: TestClient):
    """Verify unauthenticated payout query returns 401."""
    resp = client.get("/api/v2/payouts/partner")
    assert resp.status_code == 401


def test_provider_payouts_customer_forbidden(client: TestClient, auth_headers_customer: dict):
    """Verify customer role cannot access provider payout API."""
    resp = client.get("/api/v2/payouts/partner", headers=auth_headers_customer)
    assert resp.status_code == 403


def test_provider_payout_zero_balance_rejected(client: TestClient, auth_headers_partner_a: dict):
    """Verify payout request fails if no eligible earnings exist."""
    resp = client.post(
        "/api/v2/payouts/request",
        headers=auth_headers_partner_a,
        json={"amount": 1000.0},
    )
    assert resp.status_code == 400
    assert "No unreleased earnings are available" in resp.json()["detail"]


def test_provider_payout_flow_and_idempotency(
    client: TestClient,
    db_session: Session,
    auth_headers_partner_a: dict,
    auth_headers_partner_b: dict,
):
    """Verify complete payout flow: eligible booking -> available balance -> payout request -> updated balance."""
    # 1. Look up Host A user
    host_a = db_session.query(User).filter(User.email == "host.payout.a@example.com").first()
    assert host_a is not None

    # 2. Seed a confirmed booking for Host A (gross 6000 -> net 5700)
    service_a = Service(
        provider_id=host_a.id,
        provider_name=host_a.full_name or "Host Alpha",
        title="Plantation Villa Stay",
        slug="plantation-villa-stay-unique-payout",
        description="Luxury eco stay",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg",
        district="Kodagu",
        price=6000.0,
        unit="night",
        status="PUBLISHED",
        primary_image="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb",
    )
    db_session.add(service_a)
    db_session.commit()
    db_session.refresh(service_a)

    booking = Booking(
        booking_code="NC-BKG-PAY01",
        customer_id=host_a.id,
        provider_id=host_a.id,
        service_id=service_a.id,
        start_date=str(date.today()),
        guest_count=1,
        unit_price=6000.0,
        total_amount=6000.0,
        status="CONFIRMED",
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)

    # 3. Check payout summary shows 5700 available
    sum_resp = client.get("/api/v2/payouts/partner", headers=auth_headers_partner_a)
    assert sum_resp.status_code == 200
    data = sum_resp.json()["data"]
    assert data["available_balance"] == 5700.0
    assert data["paid_out_balance"] == 0.0

    # 4. Request Payout
    payout_resp = client.post(
        "/api/v2/payouts/request",
        headers=auth_headers_partner_a,
        json={"amount": 5700.0, "bank_account_last4": "4092", "ifsc_code": "SBIN0001234"},
    )
    assert payout_resp.status_code == 201
    payout_data = payout_resp.json()["data"]
    payout_id = payout_data["id"]
    assert payout_data["amount"] == 5700.0
    assert payout_data["status"] == "COMPLETED"
    assert payout_data["bank_account_last4"] == "4092"

    # 5. Check payout summary again - available should be 0, paid_out should be 5700
    sum_resp2 = client.get("/api/v2/payouts/partner", headers=auth_headers_partner_a)
    assert sum_resp2.status_code == 200
    data2 = sum_resp2.json()["data"]
    assert data2["available_balance"] == 0.0
    assert data2["paid_out_balance"] == 5700.0
    assert len(data2["payouts"]) == 1

    # 6. Second payout request immediately rejected (double payout protection)
    dup_resp = client.post(
        "/api/v2/payouts/request",
        headers=auth_headers_partner_a,
        json={"amount": 5700.0},
    )
    assert dup_resp.status_code == 400

    # 7. Host A can view payout detail
    detail_resp = client.get(f"/api/v2/payouts/{payout_id}", headers=auth_headers_partner_a)
    assert detail_resp.status_code == 200

    # 8. Host B CANNOT view Host A's payout detail (403 Forbidden)
    forbidden_resp = client.get(f"/api/v2/payouts/{payout_id}", headers=auth_headers_partner_b)
    assert forbidden_resp.status_code == 403
