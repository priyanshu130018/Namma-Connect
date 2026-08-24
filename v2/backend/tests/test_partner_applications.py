"""Tests for Partner Application submission, status, duplicate prevention, and review."""

import pytest
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


def test_partner_application_submission_lifecycle(
    client: TestClient,
    auth_headers_customer: dict,
    auth_headers_admin: dict,
):
    headers = auth_headers_customer
    admin_headers = auth_headers_admin

    # Initial state: no application
    get_res = client.get("/api/v2/partner/application", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["data"] is None

    # Submit Farmer Application
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

    # Duplicate submission while pending should be rejected (409 Conflict)
    dup_res = client.post("/api/v2/partner/application", json=payload, headers=headers)
    assert dup_res.status_code == 409

    # Admin lists applications
    list_res = client.get("/api/v2/admin/partner-applications", headers=admin_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 1

    # Admin Rejects with Changes Required
    reject_res = client.post(
        f"/api/v2/admin/partner-applications/{app_id}/review",
        json={"approved": False, "rejection_reason": "Please attach government certified RTC document."},
        headers=admin_headers,
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["data"]["status"] == "REJECTED"
    assert "RTC document" in reject_res.json()["data"]["rejection_reason"]

    # User fetches application status: shows REJECTED with reason
    status_res = client.get("/api/v2/partner/application", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["data"]["status"] == "REJECTED"

    # User re-submits (updates) application
    payload["document_url"] = "https://cdn.example.com/rtc-doc.pdf"
    reapply_res = client.post("/api/v2/partner/application", json=payload, headers=headers)
    assert reapply_res.status_code == 201
    assert reapply_res.json()["data"]["status"] == "PENDING"
    assert reapply_res.json()["data"]["rejection_reason"] is None

    # Admin Approves Application
    approve_res = client.post(
        f"/api/v2/admin/partner-applications/{app_id}/review",
        json={"approved": True},
        headers=admin_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["data"]["status"] == "APPROVED"
