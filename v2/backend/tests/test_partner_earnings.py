"""Integration tests for Provider Earnings API and Calculations."""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_partner(client: TestClient) -> dict:
    """Create test partner user and return JWT auth header."""
    user_payload = {
        "email": "host.plantation@example.com",
        "password": "SecurePassword123!",
        "full_name": "Plantation Host",
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
        "email": "traveler.earnings@example.com",
        "password": "SecurePassword123!",
        "full_name": "Traveler Earnings",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_provider_earnings_unauthenticated_fails(client: TestClient):
    """Verify unauthenticated request returns 401."""
    resp = client.get("/api/v2/earnings/partner")
    assert resp.status_code == 401


def test_provider_earnings_customer_forbidden(client: TestClient, auth_headers_customer: dict):
    """Verify regular customer cannot access provider earnings (403)."""
    resp = client.get("/api/v2/earnings/partner", headers=auth_headers_customer)
    assert resp.status_code == 403


def test_provider_earnings_periods_and_calculations(
    client: TestClient,
    auth_headers_partner: dict,
    auth_headers_customer: dict,
):
    """Verify provider earnings for 7d, 30d, 1y periods and accurate net calculations."""
    # 1. Fetch 7d earnings
    resp_7d = client.get("/api/v2/earnings/partner?period=7d", headers=auth_headers_partner)
    assert resp_7d.status_code == 200
    data_7d = resp_7d.json()["data"]
    assert data_7d["period"] == "7d"
    assert data_7d["currency"] == "INR"
    assert len(data_7d["data"]) == 7
    assert data_7d["total_earnings"] >= 0.0

    # 2. Fetch 30d earnings
    resp_30d = client.get("/api/v2/earnings/partner?period=30d", headers=auth_headers_partner)
    assert resp_30d.status_code == 200
    data_30d = resp_30d.json()["data"]
    assert data_30d["period"] == "30d"
    assert len(data_30d["data"]) == 30

    # 3. Fetch 1y earnings
    resp_1y = client.get("/api/v2/earnings/partner?period=1y", headers=auth_headers_partner)
    assert resp_1y.status_code == 200
    data_1y = resp_1y.json()["data"]
    assert data_1y["period"] == "1y"
    assert len(data_1y["data"]) == 12

    # 4. Verify 5% fee and 95% payout split consistency
    gross = data_30d["gross_revenue"]
    fee = data_30d["platform_fee"]
    net = data_30d["total_earnings"]
    assert fee == round(gross * 0.05, 2)
    assert net == round(gross * 0.95, 2)
