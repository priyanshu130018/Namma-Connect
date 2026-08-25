"""Integration tests for Customer Saved Services (Wishlist) Management."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_customer1(client: TestClient) -> dict:
    """Create test customer 1."""
    user_payload = {
        "email": "cust1.saved@example.com",
        "password": "SecurePassword123!",
        "full_name": "Aanya Traveler",
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
        "email": "cust2.saved@example.com",
        "password": "SecurePassword123!",
        "full_name": "Vikram Traveler",
        "role": "customer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_saved_services_unauthenticated_fails(client: TestClient):
    """Unauthenticated save, unsave, or list returns 401."""
    resp_save = client.post("/api/v2/services/srv-sample/save")
    assert resp_save.status_code == 401

    resp_unsave = client.delete("/api/v2/services/srv-sample/save")
    assert resp_unsave.status_code == 401

    resp_list = client.get("/api/v2/users/me/saved")
    assert resp_list.status_code == 401


def test_saved_services_lifecycle_and_customer_isolation(
    client: TestClient,
    auth_headers_customer1: dict,
    auth_headers_customer2: dict,
):
    """Test full saved services workflow: save, check status, list, customer isolation, duplicate prevention, and remove."""
    # 1. Fetch available services from catalog
    services_resp = client.get("/api/v2/services")
    assert services_resp.status_code == 200
    services = services_resp.json()["data"]["services"]
    assert len(services) >= 2
    service_a = services[0]
    service_b = services[1]
    service_a_id = service_a["id"]
    service_b_id = service_b["id"]

    # 2. Customer 1 initially has 0 saved services
    initial_saved_resp = client.get("/api/v2/users/me/saved", headers=auth_headers_customer1)
    assert initial_saved_resp.status_code == 200
    assert initial_saved_resp.json()["data"]["total"] == 0

    # 3. Check initial saved status for service A
    status_resp = client.get(f"/api/v2/services/{service_a_id}/save-status", headers=auth_headers_customer1)
    assert status_resp.status_code == 200
    assert status_resp.json()["data"]["is_saved"] is False

    # 4. Customer 1 saves service A
    save_resp = client.post(f"/api/v2/services/{service_a_id}/save", headers=auth_headers_customer1)
    assert save_resp.status_code == 200
    assert save_resp.json()["data"]["is_saved"] is True

    # 5. Check saved status is now True
    status_resp_after = client.get(f"/api/v2/services/{service_a_id}/save-status", headers=auth_headers_customer1)
    assert status_resp_after.status_code == 200
    assert status_resp_after.json()["data"]["is_saved"] is True

    # 6. Duplicate save is idempotent (no error, remains saved)
    duplicate_save = client.post(f"/api/v2/services/{service_a_id}/save", headers=auth_headers_customer1)
    assert duplicate_save.status_code == 200
    assert duplicate_save.json()["data"]["is_saved"] is True

    # 7. Customer 1 saves service B
    save_b_resp = client.post(f"/api/v2/services/{service_b_id}/save", headers=auth_headers_customer1)
    assert save_b_resp.status_code == 200

    # 8. Customer 1 lists saved services (total == 2)
    c1_saved = client.get("/api/v2/users/me/saved", headers=auth_headers_customer1).json()["data"]
    assert c1_saved["total"] == 2
    saved_ids = [s["id"] for s in c1_saved["services"]]
    assert service_a_id in saved_ids
    assert service_b_id in saved_ids

    # 9. Customer Isolation: Customer 2 must have 0 saved services
    c2_saved = client.get("/api/v2/users/me/saved", headers=auth_headers_customer2).json()["data"]
    assert c2_saved["total"] == 0

    c2_status_a = client.get(f"/api/v2/services/{service_a_id}/save-status", headers=auth_headers_customer2).json()["data"]
    assert c2_status_a["is_saved"] is False

    # 10. Customer 1 removes service A
    remove_resp = client.delete(f"/api/v2/services/{service_a_id}/save", headers=auth_headers_customer1)
    assert remove_resp.status_code == 200
    assert remove_resp.json()["data"]["is_saved"] is False

    # 11. Customer 1 list now has 1 item (service B)
    c1_after_remove = client.get("/api/v2/users/me/saved", headers=auth_headers_customer1).json()["data"]
    assert c1_after_remove["total"] == 1
    assert c1_after_remove["services"][0]["id"] == service_b_id

    # 12. Saving non-existent service returns 404
    fake_save = client.post("/api/v2/services/00000000-0000-0000-0000-000000000000/save", headers=auth_headers_customer1)
    assert fake_save.status_code == 404
