"""Tests for Partner Application submission, status, duplicate prevention, and review."""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_customer(client: TestClient) -> dict:
    """Create test customer."""
    user_payload = {
        "email": "traveler.partnerapp@example.com",
        "password": "SecurePassword123!",
        "full_name": "Traveler Applicant",
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
def auth_headers_customer_2(client: TestClient) -> dict:
    """Create second test customer."""
    user_payload = {
        "email": "traveler2.partnerapp@example.com",
        "password": "SecurePassword123!",
        "full_name": "Traveler Applicant Two",
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
        "email": "admin.partnerapp@example.com",
        "password": "AdminPassword123!",
        "full_name": "Admin Reviewer",
        "role": "admin",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_partner_application_unauthenticated_rejected(client: TestClient):
    response = client.get("/api/v2/partner/application")
    assert response.status_code == 401


def test_partner_application_full_lifecycle_and_reapplication(
    client: TestClient,
    auth_headers_customer: dict,
    auth_headers_admin: dict,
):
    headers = auth_headers_customer
    admin_headers = auth_headers_admin

    # 1. Initial state: no application
    get_res = client.get("/api/v2/partner/application", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["data"] is None

    # 2. Submit Farmer Application (Pending)
    payload = {
        "role_type": "farmer",
        "full_name": "Ramesh Gowda",
        "email": "ramesh.gowda@example.com",
        "mobile": "9876543210",
        "address": "Coffee Estate Road, Madikeri",
        "district": "Kodagu",
        "state": "Karnataka",
        "business_name": "Gowda Organic Coffee Estate",
        "experience_years": 8,
        "bio": "Specializing in organic Arabica cultivation and farm stays.",
        "id_type": "Land_RTC",
        "id_number": "RTC-12345-KD",
        "services": ["Farm Stay Accommodation", "Organic Farm Visit", "Coffee Estate Tour"],
        "activities": ["Coffee Picking", "Stream Trail Walk", "Bullock Cart Ride"],
    }

    create_res = client.post("/api/v2/partner/application", json=payload, headers=headers)
    assert create_res.status_code == 201
    data = create_res.json()["data"]
    assert data["status"] == "PENDING"
    assert data["role_type"] == "farmer"
    assert "Coffee Picking" in data["activities"]
    assert "PA-2026-" in data["application_code"]
    app_id = data["id"]

    # 3. Duplicate submission while pending is blocked (409 Conflict)
    dup_res = client.post("/api/v2/partner/application", json=payload, headers=headers)
    assert dup_res.status_code == 409

    # 4. Admin sees pending application in queue
    list_res = client.get("/api/v2/admin/partner-applications?status=PENDING", headers=admin_headers)
    assert list_res.status_code == 200
    app_codes = [a["application_code"] for a in list_res.json()["data"]]
    assert data["application_code"] in app_codes

    # 5. Admin opens single application details
    detail_res = client.get(f"/api/v2/admin/partner-applications/{app_id}", headers=admin_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["data"]["business_name"] == "Gowda Organic Coffee Estate"

    # 6. Non-admin cannot approve or reject
    cust_approve = client.post(f"/api/v2/admin/partner-applications/{app_id}/approve", headers=headers)
    assert cust_approve.status_code == 403
    cust_reject = client.post(f"/api/v2/admin/partner-applications/{app_id}/reject", json={"rejection_reason": "test"}, headers=headers)
    assert cust_reject.status_code == 403

    # 7. Reject with empty reason fails
    empty_reject = client.post(
        f"/api/v2/admin/partner-applications/{app_id}/reject",
        json={"rejection_reason": "   "},
        headers=admin_headers,
    )
    assert empty_reject.status_code == 422 or empty_reject.status_code == 400

    # 8. Admin rejects application with reason
    reject_res = client.post(
        f"/api/v2/admin/partner-applications/{app_id}/reject",
        json={"rejection_reason": "Please attach government certified RTC document."},
        headers=admin_headers,
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["data"]["status"] == "REJECTED"
    assert "RTC document" in reject_res.json()["data"]["rejection_reason"]
    assert reject_res.json()["data"]["reviewed_by"] is not None

    # 9. Admin cannot approve already rejected application without user reapplying
    invalid_approve = client.post(f"/api/v2/admin/partner-applications/{app_id}/approve", headers=admin_headers)
    assert invalid_approve.status_code == 400

    # 10. User checks status and sees rejection reason
    status_res = client.get("/api/v2/partner/application", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["data"]["status"] == "REJECTED"

    # 11. User re-applies: status resets to PENDING and rejection_reason is cleared
    payload["document_url"] = "https://cdn.example.com/rtc-doc.pdf"
    reapply_res = client.post("/api/v2/partner/application", json=payload, headers=headers)
    assert reapply_res.status_code == 201
    assert reapply_res.json()["data"]["status"] == "PENDING"
    assert reapply_res.json()["data"]["rejection_reason"] is None

    # 12. Admin approves application
    approve_res = client.post(f"/api/v2/admin/partner-applications/{app_id}/approve", headers=admin_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["data"]["status"] == "APPROVED"
    assert approve_res.json()["data"]["reviewed_by"] is not None

    # 13. Admin cannot reject already approved application
    invalid_reject = client.post(
        f"/api/v2/admin/partner-applications/{app_id}/reject",
        json={"rejection_reason": "Too late"},
        headers=admin_headers,
    )
    assert invalid_reject.status_code == 400

    # 14. User cannot submit new application once approved
    post_approve_dup = client.post("/api/v2/partner/application", json=payload, headers=headers)
    assert post_approve_dup.status_code == 400


def test_admin_global_bookings_regression_no_500(
    client: TestClient,
    auth_headers_customer_2: dict,
    auth_headers_admin: dict,
):
    """Regression test ensuring GET /api/v2/admin/bookings does not crash with AttributeError on customer.phone."""
    # Create booking as customer
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]
    tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

    booking_payload = {
        "service_id": service_id,
        "start_date": tomorrow,
        "guest_count": 2,
    }
    create_resp = client.post("/api/v2/bookings", json=booking_payload, headers=auth_headers_customer_2)
    assert create_resp.status_code == 201

    # Fetch admin global bookings
    admin_resp = client.get("/api/v2/admin/bookings", headers=auth_headers_admin)
    assert admin_resp.status_code == 200
    data = admin_resp.json()["data"]
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check that customer info and phone/mobile are present or null safe
    first_b = data[0]
    assert "customer_name" in first_b
    assert "customer_phone" in first_b

