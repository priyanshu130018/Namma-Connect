import pytest
import uuid
import random
import hmac
import hashlib
import json
from datetime import date, timedelta
from app.core.config import settings
from app.models.booking import Booking as BookingModel
from app.models.collaboration import Collaboration
from app.models.user import Login, FarmerProfile, CreatorProfile, Application
from app.models.farm import FarmListing
from app.models.payment import Payment
from tests.conftest import TestingSessionLocal

def test_razorpay_server_side_amount_and_signature_security(client):
    uid = uuid.uuid4().hex[:8]
    r_mob = f"961{random.randint(1000000, 9999999)}"
    r_mob_f = f"962{random.randint(1000000, 9999999)}"
    r_mob_attacker = f"963{random.randint(1000000, 9999999)}"

    # Register Farmer & approve
    f_res = client.post("/api/auth/register", json={
        "full_name": f"Farmer Payer {uid}",
        "email": f"farmer_payer_{uid}@test.com",
        "mobile": r_mob_f,
        "password": "Password123!"
    })
    f_token = f_res.json()["access_token"]
    f_headers = {"Authorization": f"Bearer {f_token}"}

    f_app = client.post("/api/applications", json={
        "type": "farmer",
        "farmer_details": {"name": f"Farmer Payer {uid}", "mobile": r_mob_f, "aadhaar_no": "123456789012"}
    }, headers=f_headers)
    app_id = f_app.json()["id"]

    # Register Admin & Approve Farmer
    admin_res = client.post("/api/auth/register", json={
        "full_name": f"Admin Prod {uid}",
        "email": f"admin_prod_{uid}@nammaconnect.com",
        "mobile": f"964{random.randint(1000000, 9999999)}",
        "password": "Password123!"
    })
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    client.patch(f"/api/admin/applications/{app_id}", json={"status": "approved"}, headers=admin_headers)

    # Re-login as Farmer to get updated role
    f_login = client.post("/api/auth/login", json={"identifier": f"farmer_payer_{uid}@test.com", "password": "Password123!"})
    f_headers = {"Authorization": f"Bearer {f_login.json()['access_token']}"}

    # Farmer creates farm
    farm_res = client.post("/api/farms", json={
        "name": f"Secure Farm {uid}",
        "price_from": 3500.0,
        "status": "active"
    }, headers=f_headers)
    farm_id = farm_res.json()["id"]

    # Register Tourist
    t_res = client.post("/api/auth/register", json={
        "full_name": f"Tourist Buyer {uid}",
        "email": f"buyer_{uid}@test.com",
        "mobile": r_mob,
        "password": "Password123!"
    })
    t_token = t_res.json()["access_token"]
    t_headers = {"Authorization": f"Bearer {t_token}"}

    # Register Attacker
    att_res = client.post("/api/auth/register", json={
        "full_name": f"Attacker {uid}",
        "email": f"attacker_{uid}@test.com",
        "mobile": r_mob_attacker,
        "password": "Password123!"
    })
    att_headers = {"Authorization": f"Bearer {att_res.json()['access_token']}"}

    # Tourist creates booking with server-calculated amount
    b_res = client.post("/api/bookings", json={
        "farm_id": farm_id,
        "booking_date": (date.today() + timedelta(days=5)).isoformat(),
        "guest_count": 2,
        "amount": 7000.0,
        "contact_name": "Tourist Buyer",
        "contact_mobile": r_mob,
        "contact_email": f"buyer_{uid}@test.com"
    }, headers=t_headers)
    booking_id = b_res.json()["id"]

    # 1. Attacker attempts to checkout Tourist's booking -> 404
    att_order = client.post("/api/payments/create-order", json={"booking_id": booking_id}, headers=att_headers)
    assert att_order.status_code == 404

    # 2. Tourist creates order -> amount matches server-side Booking.amount (7000.0)
    order_res = client.post("/api/payments/create-order", json={"booking_id": booking_id}, headers=t_headers)
    assert order_res.status_code == 200
    order_data = order_res.json()
    assert order_data["amount"] == 7000.0

    # 3. Invalid signature is strictly rejected -> 400
    bad_sig_res = client.post("/api/payments/verify", json={
        "booking_id": booking_id,
        "razorpay_order_id": order_data["order_id"],
        "razorpay_payment_id": f"pay_{uid}_999",
        "razorpay_signature": "completely_invalid_tampered_signature"
    }, headers=t_headers)
    assert bad_sig_res.status_code == 400

    # 4. Valid signature verification succeeds
    sec = settings.RAZORPAY_SECRET or "secret"
    payment_id = f"pay_{uid}_correct"
    sig_payload = f"{order_data['order_id']}|{payment_id}".encode()
    valid_sig = hmac.new(sec.encode(), sig_payload, hashlib.sha256).hexdigest()

    good_sig_res = client.post("/api/payments/verify", json={
        "booking_id": booking_id,
        "razorpay_order_id": order_data["order_id"],
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_sig
    }, headers=t_headers)
    assert good_sig_res.status_code == 200
    assert good_sig_res.json()["success"] is True

    # 5. Idempotent re-verification does not error or create duplicate payment records
    db = TestingSessionLocal()
    pay_count_before = db.query(Payment).filter(Payment.reference_id == booking_id, Payment.type == "booking").count()
    assert pay_count_before == 1

    idempotent_res = client.post("/api/payments/verify", json={
        "booking_id": booking_id,
        "razorpay_order_id": order_data["order_id"],
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_sig
    }, headers=t_headers)
    assert idempotent_res.status_code == 200

    db.expire_all()
    pay_count_after = db.query(Payment).filter(Payment.reference_id == booking_id, Payment.type == "booking").count()
    assert pay_count_after == 1
    db.close()

def test_webhook_idempotency_and_failure_handling(client):
    uid = uuid.uuid4().hex[:8]
    r_mob = f"965{random.randint(1000000, 9999999)}"

    # Setup Farmer and Farm
    f_res = client.post("/api/auth/register", json={
        "full_name": f"Farmer Webhook {uid}",
        "email": f"farmer_wh_{uid}@test.com",
        "mobile": f"966{random.randint(1000000, 9999999)}",
        "password": "Password123!"
    })
    f_token = f_res.json()["access_token"]
    f_headers = {"Authorization": f"Bearer {f_token}"}

    f_app = client.post("/api/applications", json={
        "type": "farmer",
        "farmer_details": {"name": f"Farmer WH {uid}", "mobile": f"966{random.randint(1000000, 9999999)}", "aadhaar_no": "999888777666"}
    }, headers=f_headers)
    app_id = f_app.json()["id"]

    admin_res = client.post("/api/auth/register", json={
        "full_name": f"Admin WH {uid}",
        "email": f"admin_wh_{uid}@nammaconnect.com",
        "mobile": f"967{random.randint(1000000, 9999999)}",
        "password": "Password123!"
    })
    client.patch(f"/api/admin/applications/{app_id}", json={"status": "approved"}, headers={"Authorization": f"Bearer {admin_res.json()['access_token']}"})

    f_login = client.post("/api/auth/login", json={"identifier": f"farmer_wh_{uid}@test.com", "password": "Password123!"})
    f_headers = {"Authorization": f"Bearer {f_login.json()['access_token']}"}

    farm_res = client.post("/api/farms", json={"name": f"WH Farm {uid}", "price_from": 2000.0, "status": "active"}, headers=f_headers)
    farm_id = farm_res.json()["id"]

    t_res = client.post("/api/auth/register", json={
        "full_name": f"Tourist WH {uid}",
        "email": f"tourist_wh_{uid}@test.com",
        "mobile": r_mob,
        "password": "Password123!"
    })
    t_headers = {"Authorization": f"Bearer {t_res.json()['access_token']}"}

    # Create Booking
    b_res = client.post("/api/bookings", json={
        "farm_id": farm_id,
        "booking_date": (date.today() + timedelta(days=7)).isoformat(),
        "guest_count": 1,
        "amount": 2000.0,
        "contact_name": "Tourist WH",
        "contact_mobile": r_mob,
        "contact_email": f"tourist_wh_{uid}@test.com"
    }, headers=t_headers)
    booking_id = b_res.json()["id"]

    # 1. Payment Failed Webhook -> marks failed, does NOT mark confirmed
    wh_fail_payload = {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_wh_fail_{uid}",
                    "amount": 200000,
                    "notes": {"booking_id": booking_id, "type": "booking"}
                }
            }
        }
    }
    sec = settings.RAZORPAY_SECRET or "secret"
    body_bytes = json.dumps(wh_fail_payload).encode()
    wh_sig = hmac.new(sec.encode(), body_bytes, hashlib.sha256).hexdigest()

    wh_res1 = client.post("/api/webhook/razorpay", content=body_bytes, headers={"x-razorpay-signature": wh_sig, "Content-Type": "application/json"})
    assert wh_res1.status_code == 200

    db = TestingSessionLocal()
    b1 = db.query(BookingModel).filter(BookingModel.id == booking_id).first()
    assert b1.payment_status == "failed"
    assert b1.status != "confirmed"
    db.close()

    # 2. Payment Captured Webhook -> marks paid, confirmed, creates single Payment record
    wh_capture_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_wh_succ_{uid}",
                    "order_id": f"order_wh_{uid}",
                    "amount": 200000,
                    "notes": {"booking_id": booking_id, "type": "booking"}
                }
            }
        }
    }
    cap_bytes = json.dumps(wh_capture_payload).encode()
    cap_sig = hmac.new(sec.encode(), cap_bytes, hashlib.sha256).hexdigest()

    wh_res2 = client.post("/api/webhook/razorpay", content=cap_bytes, headers={"x-razorpay-signature": cap_sig, "Content-Type": "application/json"})
    assert wh_res2.status_code == 200

    db2 = TestingSessionLocal()
    b2 = db2.query(BookingModel).filter(BookingModel.id == booking_id).first()
    assert b2.payment_status == "paid"
    assert b2.status == "confirmed"

    # 3. Duplicate Webhook delivery is idempotent
    wh_res3 = client.post("/api/webhook/razorpay", content=cap_bytes, headers={"x-razorpay-signature": cap_sig, "Content-Type": "application/json"})
    assert wh_res3.status_code == 200
    assert wh_res3.json()["success"] is True

    pay_records = db2.query(Payment).filter(Payment.reference_id == booking_id, Payment.type == "booking").count()
    assert pay_records == 1
    db2.close()

def test_admin_application_security_and_privilege_escalation(client):
    uid = uuid.uuid4().hex[:8]

    # Normal user
    u_res = client.post("/api/auth/register", json={
        "full_name": f"Regular User {uid}",
        "email": f"regular_{uid}@test.com",
        "mobile": f"968{random.randint(1000000, 9999999)}",
        "password": "Password123!"
    })
    u_token = u_res.json()["access_token"]
    u_headers = {"Authorization": f"Bearer {u_token}"}

    # Submit application
    app_res = client.post("/api/applications", json={
        "type": "farmer",
        "farmer_details": {"name": f"Regular User {uid}", "mobile": f"968{random.randint(1000000, 9999999)}", "aadhaar_no": "111222333444"}
    }, headers=u_headers)
    app_id = app_res.json()["id"]

    # 1. Normal user attempts to approve their own application -> 403 Forbidden
    self_appr = client.patch(f"/api/admin/applications/{app_id}", json={"status": "approved"}, headers=u_headers)
    assert self_appr.status_code == 403

    # 2. Normal user attempts to list all applications -> 403 Forbidden
    list_app = client.get("/api/admin/applications", headers=u_headers)
    assert list_app.status_code == 403

    # 3. Normal user attempts to access admin stats -> 403 Forbidden
    stats_res = client.get("/api/admin/stats", headers=u_headers)
    assert stats_res.status_code == 403

    # 4. User remains tourist while application is pending
    me_res = client.get("/api/auth/me", headers=u_headers)
    assert me_res.json()["role"] == "tourist"
