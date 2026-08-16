
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

from unittest.mock import patch

def test_create_payment_order_mock():
    # Register and login to get token
    client.post("/api/auth/register", json={"full_name": "Pay User", "email": "pay1@example.com", "mobile": "9000000005", "password": "Password1!"})
    login = client.post("/api/auth/login", json={"identifier": "pay1@example.com", "password": "Password1!"})
    token = login.json().get("access_token")
    assert token, "Login failed to return access token"

    payload = {"amount": 50000, "currency": "INR", "booking_id": 1, "type": "booking"}
    
    with patch("app.services.payment_service.Session") as mock_session:
        # Mock the db.query(Booking).filter(...).first()
        mock_query = mock_session.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_booking = mock_filter.first.return_value
        mock_booking.amount = 500
        mock_booking.contact_email = "pay1@example.com"
        mock_booking.contact_name = "Pay User"
        
        # We need to mock get_db to return our mock session
        from app.core.database import get_db
        app.dependency_overrides[get_db] = lambda: mock_session
        
        res = client.post("/api/payments/create-order", json=payload, headers={"Authorization": f"Bearer {token}"})
        
        from tests.conftest import override_get_db
        app.dependency_overrides[get_db] = override_get_db
        
    assert res.status_code == 200
    assert res.json()["order_id"].startswith("order_")
    assert res.json()["currency"] == "INR"

import uuid

def test_verify_payment_order_mock():
    import random
    unique_id = str(uuid.uuid4())[:8]
    email = f"pay_{unique_id}@example.com"
    mobile = "9" + "".join(random.choices("0123456789", k=9))
        
    # Register and login again with a new user
    client.post("/api/auth/register", json={"full_name": "Pay User", "email": email, "mobile": mobile, "password": "Password1!"})
    login = client.post("/api/auth/login", json={"identifier": email, "password": "Password1!"})
    token = login.json().get("access_token")
    assert token, "Login failed"

    payload = {
        "booking_id": 1,
        "type": "booking",
        "razorpay_order_id": "order_mock_123",
        "razorpay_payment_id": "pay_mock123",
        "razorpay_signature": "sig_mock123"
    }
    
    with patch("app.services.payment_service.Session") as mock_session:
        # Mock the db.query(Booking).filter(...).first()
        mock_query = mock_session.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_booking = mock_filter.first.return_value
        mock_booking.amount = 500
        mock_booking.contact_email = "pay1@example.com"
        mock_booking.contact_name = "Pay User"
        
        # We need to mock get_db to return our mock session
        from app.core.database import get_db
        app.dependency_overrides[get_db] = lambda: mock_session
        
        res = client.post("/api/payments/verify", json=payload, headers={"Authorization": f"Bearer {token}"})
        
        from tests.conftest import override_get_db
        app.dependency_overrides[get_db] = override_get_db
        
    assert res.status_code == 200
    assert res.json()["success"] is True
