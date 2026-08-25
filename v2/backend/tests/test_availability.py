"""Integration tests for Service Availability endpoint."""

import pytest
from fastapi.testclient import TestClient


def test_get_service_availability_success(client: TestClient):
    """Verify GET /api/v2/services/{id}/availability returns days and capacity rules."""
    # Get a published service
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]

    resp = client.get(f"/api/v2/services/{service_id}/availability")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["service_id"] == service_id
    assert "booking_model" in data
    assert len(data["days"]) >= 30
    assert "start_date" in data
    assert "end_date" in data

    first_day = data["days"][0]
    assert "date" in first_day
    assert "is_available" in first_day
    assert "status" in first_day


def test_get_service_availability_stay_model(client: TestClient):
    """Verify Stay services use date_range model."""
    list_resp = client.get("/api/v2/services?category=stay")
    stay_id = list_resp.json()["data"]["services"][0]["id"]

    resp = client.get(f"/api/v2/services/{stay_id}/availability")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["booking_model"] == "date_range"


def test_get_service_availability_time_slot_model(client: TestClient):
    """Verify Experiences and Guides use time_slot model with slots."""
    list_resp = client.get("/api/v2/services?category=experiences")
    exp_id = list_resp.json()["data"]["services"][0]["id"]

    resp = client.get(f"/api/v2/services/{exp_id}/availability")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["booking_model"] == "time_slot"

    # Check available days have time slots
    available_days = [d for d in data["days"] if d["is_available"]]
    assert len(available_days) > 0
    assert len(available_days[0]["time_slots"]) > 0
    assert "start_time" in available_days[0]["time_slots"][0]
    assert "remaining_capacity" in available_days[0]["time_slots"][0]


def test_get_service_availability_404_for_invalid_id(client: TestClient):
    """Verify 404 on non-existent service availability."""
    resp = client.get("/api/v2/services/00000000-0000-0000-0000-000000000000/availability")
    assert resp.status_code == 404
