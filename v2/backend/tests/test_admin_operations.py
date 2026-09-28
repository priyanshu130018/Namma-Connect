"""Integration tests for Admin Operations and System Governance."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.service import Service


@pytest.fixture
def auth_headers_admin(client: TestClient) -> dict:
    """Create test admin user."""
    user_payload = {
        "email": "superuser.admin@example.com",
        "password": "SecurePassword123!",
        "full_name": "Super Admin",
        "role": "admin",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_partner(client: TestClient) -> dict:
    """Create test partner user."""
    user_payload = {
        "email": "host.admincheck@example.com",
        "password": "SecurePassword123!",
        "full_name": "Host AdminCheck",
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
    """Create test customer user."""
    user_payload = {
        "email": "traveler.admincheck@example.com",
        "password": "SecurePassword123!",
        "full_name": "Traveler AdminCheck",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_endpoints_unauthenticated_fails(client: TestClient):
    """Verify unauthenticated requests to admin endpoints return 401."""
    resp = client.get("/api/v2/admin/overview")
    assert resp.status_code == 401


def test_admin_endpoints_customer_forbidden(client: TestClient, auth_headers_customer: dict):
    """Verify regular customer cannot access admin endpoints (403)."""
    resp = client.get("/api/v2/admin/overview", headers=auth_headers_customer)
    assert resp.status_code == 403


def test_admin_endpoints_partner_forbidden(client: TestClient, auth_headers_partner: dict):
    """Verify partner host cannot access admin endpoints (403)."""
    resp = client.get("/api/v2/admin/overview", headers=auth_headers_partner)
    assert resp.status_code == 403


def test_admin_full_operations_workflow(
    client: TestClient,
    db_session: Session,
    auth_headers_admin: dict,
    auth_headers_partner: dict,
):
    """Verify complete admin management workflow: overview, user list, partner verification, service moderation, payouts, settings."""
    # 1. Overview metrics
    overview_resp = client.get("/api/v2/admin/overview", headers=auth_headers_admin)
    assert overview_resp.status_code == 200
    ov_data = overview_resp.json()["data"]
    assert "total_users" in ov_data
    assert "published_services" in ov_data

    # 2. List users (ensure no password hashes or tokens leaked)
    users_resp = client.get("/api/v2/admin/users", headers=auth_headers_admin)
    assert users_resp.status_code == 200
    users_data = users_resp.json()["data"]
    assert len(users_data) > 0
    for u in users_data:
        assert "password_hash" not in u
        assert "hashed_password" not in u
        assert "access_token" not in u

    # 3. List partners
    partners_resp = client.get("/api/v2/admin/partners", headers=auth_headers_admin)
    assert partners_resp.status_code == 200
    partners_data = partners_resp.json()["data"]
    assert len(partners_data) > 0

    # 4. KYC Verification Action (Approve Partner)
    partner_user = db_session.query(User).filter(User.email == "host.admincheck@example.com").first()
    assert partner_user is not None
    verify_resp = client.post(
        f"/api/v2/admin/partners/{partner_user.id}/verify",
        headers=auth_headers_admin,
        json={"action": "APPROVE", "notes": "Documents verified against Land Record registry."},
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["data"]["is_verified"] is True

    # 5. Seed and List Services
    from app.services.marketplace import MarketplaceService
    MarketplaceService.ensure_seeded(db_session)

    services_resp = client.get("/api/v2/admin/services", headers=auth_headers_admin)
    assert services_resp.status_code == 200
    srv_list = services_resp.json()["data"]
    assert len(srv_list) > 0
    test_srv = srv_list[0]

    # 6. Service Moderation Action
    mod_resp = client.post(
        f"/api/v2/admin/services/{test_srv['id']}/status",
        headers=auth_headers_admin,
        json={"status": "PUBLISHED"},
    )
    assert mod_resp.status_code == 200
    assert mod_resp.json()["data"]["status"] == "PUBLISHED"

    # 7. List Bookings
    bookings_resp = client.get("/api/v2/admin/bookings", headers=auth_headers_admin)
    assert bookings_resp.status_code == 200

    # 8. List Payments Audit Ledger (ensure no payment secret/signatures leaked)
    payments_resp = client.get("/api/v2/admin/payments", headers=auth_headers_admin)
    assert payments_resp.status_code == 200
    for p in payments_resp.json()["data"]:
        assert "razorpay_signature" not in p
        assert "key_secret" not in p

    # 9. List Payouts
    payouts_resp = client.get("/api/v2/admin/payouts", headers=auth_headers_admin)
    assert payouts_resp.status_code == 200

    # 10. List Support Tickets
    support_resp = client.get("/api/v2/admin/support", headers=auth_headers_admin)
    assert support_resp.status_code == 200
    assert isinstance(support_resp.json()["data"], list)

    # 11. Platform Settings
    settings_resp = client.get("/api/v2/admin/settings", headers=auth_headers_admin)
    assert settings_resp.status_code == 200
    assert settings_resp.json()["data"]["platform_name"] == "NammaConnect"
    assert settings_resp.json()["data"]["commission_rate"] == 0.05

    # 12. Providers Directory Endpoint (with masked KYC ID and service count)
    providers_resp = client.get("/api/v2/admin/providers", headers=auth_headers_admin)
    assert providers_resp.status_code == 200
    providers_list = providers_resp.json()["data"]
    assert len(providers_list) > 0
    for prov in providers_list:
        if prov.get("masked_id_number") and prov["masked_id_number"] != "Not Provided":
            assert "••••" in prov["masked_id_number"]

    # 13. Reviews Management and Moderation
    reviews_resp = client.get("/api/v2/admin/reviews", headers=auth_headers_admin)
    assert reviews_resp.status_code == 200
    rev_data = reviews_resp.json()["data"]
    if len(rev_data) > 0:
        first_rev = rev_data[0]
        mod_rev_resp = client.post(
            f"/api/v2/admin/reviews/{first_rev['id']}/moderate",
            headers=auth_headers_admin,
            json={"status": "HIDDEN", "notes": "Temporarily hidden for review"},
        )
        assert mod_rev_resp.status_code == 200
        assert mod_rev_resp.json()["data"]["status"] == "HIDDEN"

    # 14. Performance & Governance Reports (Aggregated Real DB metrics)
    reports_resp = client.get("/api/v2/admin/reports?period=monthly", headers=auth_headers_admin)
    assert reports_resp.status_code == 200
    rep_data = reports_resp.json()["data"]
    assert "total_users" in rep_data
    assert "published_services" in rep_data
    assert "total_revenue" in rep_data
    assert "time_series" in rep_data

