"""Tests for public contact inquiries and support submissions."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_public_contact_submission_success():
    payload = {
        "name": "Priya Sharma",
        "email": "priya.sharma@example.com",
        "subject": "Inquiry regarding plantation harvest dates",
        "category": "General Inquiry",
        "message": "Hello, I would like to know if family slots are open for next weekend's spice tour.",
    }

    response = client.post("/api/v2/support/contact", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["ticket_code"].startswith("NC-INQ-")
    assert data["data"]["name"] == "Priya Sharma"
    assert data["data"]["email"] == "priya.sharma@example.com"


def test_public_contact_validation_failure_short_message():
    payload = {
        "name": "A",
        "email": "invalid-email",
        "subject": "Hi",
        "category": "General Inquiry",
        "message": "Short",
    }

    response = client.post("/api/v2/support/contact", json=payload)
    assert response.status_code == 422
