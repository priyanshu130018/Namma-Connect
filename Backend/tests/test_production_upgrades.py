import pytest
import datetime
import json

from app.models.booking import Booking
from app.models.user import Login, Tourist
from app.models.payment import Payment
from tests.conftest import TestingSessionLocal

def test_exceptions_format(client):
    # Trigger 422 validation exception
    res = client.post("/api/auth/register", json={"email": "not-an-email"})
    assert res.status_code == 422
    data = res.json()
    assert data["success"] is False
    assert "message" in data

def test_rate_limiting_triggered(client):
    # Make multiple quick login attempts to trigger 429
    # Limit is 5 per minute
    statuses = []
    for _ in range(7):
        res = client.post("/api/auth/login", json={"identifier": "test.tourist@example.com", "password": "wrong"}, headers={"x-test-rate-limit": "true"})
        statuses.append(res.status_code)
    
    assert 429 in statuses

def test_media_upload_validation_mime(client):
    # Test file with unsupported mime type
    files = {"file": ("test.txt", b"some text content", "text/plain")}
    res = client.post("/api/media/upload", files=files)
    assert res.status_code == 400
    assert res.json()["success"] is False
    assert "Only images and videos are allowed" in res.json()["message"]

def test_media_upload_validation_size(client):
    # Test file with exceeding size (11MB)
    large_content = b"0" * (11 * 1024 * 1024)
    files = {"file": ("test.jpg", large_content, "image/jpeg")}
    res = client.post("/api/media/upload", files=files)
    assert res.status_code == 400
    assert res.json()["success"] is False
    assert "exceeds the 10MB limit" in res.json()["message"]

def test_webhook_payment_captured_notes(client):
    db = TestingSessionLocal()
    u = Login(email=f"tourist_wh_cap_{datetime.datetime.now().timestamp()}@example.com", full_name="Test Tourist", password="password", role="tourist")
    db.add(u)
    db.commit()
    
    booking = Booking(
        user_id=u.id,
        farm_id=1,
        booking_date=datetime.date.today(),
        check_out=datetime.date.today() + datetime.timedelta(days=1),
        amount=150.00,
        status="pending",
        payment_status="unpaid"
    )
    db.add(booking)
    db.commit()
    b_id = booking.id
    
    payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "receipt": f"receipt_booking_{b_id}",
                    "amount": 15000,
                    "currency": "INR",
                    "notes": {
                        "booking_id": b_id,
                        "type": "booking"
                    }
                }
            }
        }
    }
    
    res = client.post("/api/webhook/razorpay", json=payload)
    assert res.status_code == 200
    assert res.json()["success"] is True
    
    db.expire_all()
    b_ref = db.query(Booking).filter(Booking.id == b_id).first()
    assert b_ref.payment_status == "paid"
    
    payment = db.query(Payment).filter(Payment.reference_id == b_id, Payment.type == "booking").first()
    assert payment is not None
    assert payment.status == "paid"
    db.close()

def test_webhook_payment_failed(client):
    db = TestingSessionLocal()
    u = Login(email=f"tourist_wh_fail_{datetime.datetime.now().timestamp()}@example.com", full_name="Test Tourist", password="password", role="tourist")
    db.add(u)
    db.commit()

    b_fail = Booking(
        user_id=u.id,
        farm_id=1,
        booking_date=datetime.date.today(),
        check_out=datetime.date.today() + datetime.timedelta(days=1),
        amount=150.00,
        status="pending",
        payment_status="unpaid"
    )
    db.add(b_fail)
    db.commit()
    b_fail_id = b_fail.id
    
    payload = {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "receipt": f"receipt_booking_{b_fail_id}",
                    "amount": 15000,
                    "notes": {
                        "booking_id": b_fail_id,
                        "type": "booking"
                    }
                }
            }
        }
    }
    
    res = client.post("/api/webhook/razorpay", json=payload)
    assert res.status_code == 200
    
    db.expire_all()
    b_fail_ref = db.query(Booking).filter(Booking.id == b_fail_id).first()
    assert b_fail_ref.payment_status == "failed"
    db.close()

