"""Integration tests for Support Tickets and Customer Grievances."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_customer1(client: TestClient) -> dict:
    """Create test customer 1."""
    user_payload = {
        "email": "cust1.support@example.com",
        "password": "SecurePassword123!",
        "full_name": "Customer One",
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
        "email": "cust2.support@example.com",
        "password": "SecurePassword123!",
        "full_name": "Customer Two",
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
        "email": "admin.support@example.com",
        "password": "SecurePassword123!",
        "full_name": "Admin Support Lead",
        "role": "admin",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_support_tickets_unauthenticated_fails(client: TestClient):
    """Unauthenticated requests to support must be rejected."""
    resp = client.get("/api/v2/support/tickets")
    assert resp.status_code == 401


def test_create_and_manage_support_ticket(
    client: TestClient,
    auth_headers_customer1: dict,
    auth_headers_customer2: dict,
    auth_headers_admin: dict,
):
    """Test ticket creation, customer listing, isolation, replies, and admin integration."""
    # 1. Customer 1 submits ticket
    ticket_payload = {
        "category": "Booking",
        "subject": "Early check-in inquiry for estate stay",
        "description": "We are arriving by train at 10:30 AM. Can we drop our luggage early?",
        "booking_id": None,
    }
    create_resp = client.post(
        "/api/v2/support/tickets",
        headers=auth_headers_customer1,
        json=ticket_payload,
    )
    assert create_resp.status_code == 201
    ticket = create_resp.json()["data"]
    ticket_id = ticket["id"]
    ticket_code = ticket["ticket_code"]
    assert ticket["status"] == "OPEN"
    assert ticket["category"] == "Booking"
    assert ticket["user_name"] == "Customer One"

    # 2. Customer 1 lists their tickets
    list_resp = client.get("/api/v2/support/tickets", headers=auth_headers_customer1)
    assert list_resp.status_code == 200
    user_tickets = list_resp.json()["data"]["tickets"]
    assert any(t["id"] == ticket_id for t in user_tickets)

    # 3. Customer 2 cannot access Customer 1's ticket (403 Forbidden)
    intruder_resp = client.get(f"/api/v2/support/tickets/{ticket_id}", headers=auth_headers_customer2)
    assert intruder_resp.status_code == 403

    # 4. Customer 1 views ticket details
    detail_resp = client.get(f"/api/v2/support/tickets/{ticket_id}", headers=auth_headers_customer1)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["data"]["subject"] == ticket_payload["subject"]

    # 5. Customer 1 replies to the ticket
    reply_resp = client.post(
        f"/api/v2/support/tickets/{ticket_id}/reply",
        headers=auth_headers_customer1,
        json={"message": "Update: We will have 2 small bags."},
    )
    assert reply_resp.status_code == 200
    updated_ticket = reply_resp.json()["data"]
    assert len(updated_ticket["responses"]) == 1
    assert updated_ticket["responses"][0]["message"] == "Update: We will have 2 small bags."

    # 6. Admin accesses global support inquiries and sees Customer 1's ticket
    admin_support_resp = client.get("/api/v2/admin/support", headers=auth_headers_admin)
    assert admin_support_resp.status_code == 200
    admin_tickets = admin_support_resp.json()["data"]
    assert any(t["id"] == ticket_code for t in admin_tickets)
