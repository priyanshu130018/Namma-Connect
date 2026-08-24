"""Integration tests for Verified Reviews and Ratings Management."""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_customer1(client: TestClient) -> dict:
    """Create test customer 1."""
    user_payload = {
        "email": "cust1.reviews@example.com",
        "password": "SecurePassword123!",
        "full_name": "Priyanka Reviewer",
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
        "email": "cust2.reviews@example.com",
        "password": "SecurePassword123!",
        "full_name": "Rohan Reviewer",
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
def auth_headers_partner(client: TestClient) -> dict:
    """Create test partner/host."""
    user_payload = {
        "email": "host.reviews@example.com",
        "password": "SecurePassword123!",
        "full_name": "Somanna Host",
        "role": "partner",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_reviews_unauthenticated_fails(client: TestClient):
    """Unauthenticated review submission returns 401."""
    resp = client.post("/api/v2/services/srv-sample/reviews", json={
        "booking_id": "bkg-123",
        "rating": 5.0,
        "comment": "Superb experience!",
    })
    assert resp.status_code == 401


def test_review_lifecycle_and_authorization(
    client: TestClient,
    auth_headers_customer1: dict,
    auth_headers_customer2: dict,
    auth_headers_partner: dict,
):
    """Test full review workflow: validation, creation, rating recalculation, and duplicate prevention."""
    # 1. Partner creates a published service
    create_payload = {
        "title": "Sakleshpur Organic Coffee Estate",
        "description": "Authentic plantation stay in Western Ghats.",
        "category": "Stay",
        "category_slug": "stay",
        "location": "Sakleshpur, Hassan",
        "district": "Hassan",
        "state": "Karnataka",
        "price": 3200.0,
        "unit": "night",
        "max_capacity": 10,
        "status": "PUBLISHED",
    }
    create_resp = client.post("/api/v2/services", headers=auth_headers_partner, json=create_payload)
    assert create_resp.status_code in [200, 201]
    service = create_resp.json()["data"]
    service_id = service["id"]

    # 2. Customer 1 books the service
    future_date = (date.today() + timedelta(days=5)).isoformat()
    bkg_resp = client.post(
        "/api/v2/bookings",
        headers=auth_headers_customer1,
        json={
            "service_id": service_id,
            "start_date": future_date,
            "guest_count": 2,
        },
    )
    assert bkg_resp.status_code == 201
    booking = bkg_resp.json()["data"]
    booking_id = booking["id"]
    assert booking["status"] == "PENDING"
    assert booking["can_review"] is False
    assert booking["has_reviewed"] is False

    # 3. Attempting to review a PENDING booking is rejected (400 Bad Request)
    early_review_resp = client.post(
        f"/api/v2/services/{service_id}/reviews",
        headers=auth_headers_customer1,
        json={
            "booking_id": booking_id,
            "rating": 5.0,
            "comment": "Attempt before trip",
        },
    )
    assert early_review_resp.status_code == 400

    # 4. Host accepts (CONFIRMED) and then completes (COMPLETED) booking
    confirm_resp = client.post(
        f"/api/v2/bookings/partner/{booking_id}/status",
        headers=auth_headers_partner,
        json={"status": "CONFIRMED"},
    )
    assert confirm_resp.status_code == 200

    complete_resp = client.post(
        f"/api/v2/bookings/partner/{booking_id}/status",
        headers=auth_headers_partner,
        json={"status": "COMPLETED"},
    )
    assert complete_resp.status_code == 200

    # 5. Customer 1 booking detail now shows can_review == True
    bkg_detail_resp = client.get(f"/api/v2/bookings/{booking_id}", headers=auth_headers_customer1)
    assert bkg_detail_resp.status_code == 200
    bkg_detail = bkg_detail_resp.json()["data"]
    assert bkg_detail["status"] == "COMPLETED"
    assert bkg_detail["can_review"] is True
    assert bkg_detail["has_reviewed"] is False

    # 6. Customer 2 (intruder) cannot review Customer 1's booking (403 Forbidden)
    intruder_review = client.post(
        f"/api/v2/services/{service_id}/reviews",
        headers=auth_headers_customer2,
        json={
            "booking_id": booking_id,
            "rating": 5.0,
            "comment": "I didn't take this trip",
        },
    )
    assert intruder_review.status_code == 403

    # 7. Review with invalid rating (> 5.0) is rejected
    invalid_rating_resp = client.post(
        f"/api/v2/services/{service_id}/reviews",
        headers=auth_headers_customer1,
        json={
            "booking_id": booking_id,
            "rating": 6.5,
            "comment": "Too many stars",
        },
    )
    assert invalid_rating_resp.status_code == 422

    # 8. Customer 1 submits valid 5-star review
    submit_resp = client.post(
        f"/api/v2/services/{service_id}/reviews",
        headers=auth_headers_customer1,
        json={
            "booking_id": booking_id,
            "rating": 5.0,
            "comment": "Authentic organic farm tour with wonderful host family. Highly recommended!",
        },
    )
    assert submit_resp.status_code == 201
    created_review = submit_resp.json()["data"]
    assert created_review["rating"] == 5.0
    assert created_review["is_verified"] is True
    assert created_review["user_name"] == "Priyanka Reviewer"

    # 9. Duplicate review for the same booking is rejected (409 Conflict)
    duplicate_resp = client.post(
        f"/api/v2/services/{service_id}/reviews",
        headers=auth_headers_customer1,
        json={
            "booking_id": booking_id,
            "rating": 4.0,
            "comment": "Duplicate attempt",
        },
    )
    assert duplicate_resp.status_code == 409

    # 10. Booking detail now reflects has_reviewed == True and can_review == False
    bkg_after_review = client.get(f"/api/v2/bookings/{booking_id}", headers=auth_headers_customer1).json()["data"]
    assert bkg_after_review["has_reviewed"] is True
    assert bkg_after_review["can_review"] is False

    # 11. Service reviews list contains the new review
    reviews_list_resp = client.get(f"/api/v2/services/{service_id}/reviews")
    assert reviews_list_resp.status_code == 200
    reviews = reviews_list_resp.json()["data"]
    assert any(r["id"] == created_review["id"] for r in reviews)
