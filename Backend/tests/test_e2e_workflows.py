import pytest
import uuid
import random
import hmac
import hashlib
from datetime import date, timedelta
from app.core.config import settings
from app.models.booking import Booking as BookingModel
from app.models.collaboration import Collaboration
from app.models.user import Login, FarmerProfile, CreatorProfile, Application
from app.models.farm import FarmListing
from app.models.activity import Activity
from tests.conftest import TestingSessionLocal

def test_complete_e2e_product_workflows(client):
    uid = uuid.uuid4().hex[:8]
    r_mob_tourist = f"951{random.randint(1000000, 9999999)}"
    r_mob_farmer = f"952{random.randint(1000000, 9999999)}"
    r_mob_creator = f"953{random.randint(1000000, 9999999)}"
    r_mob_admin = f"954{random.randint(1000000, 9999999)}"

    # ─────────────────────────────────────────────────────────────
    # 1. GUEST WORKFLOWS & AI TRIP PLANNER SECURITY
    # ─────────────────────────────────────────────────────────────
    # Unauthenticated contact form submission -> 200
    contact_res = client.post("/api/contact", json={
        "name": "Guest Inquirer",
        "email": f"guest_{uid}@test.com",
        "subject": "General Inquiry",
        "message": "Hello, I want to learn more about Namma Connect farm stays!"
    })
    assert contact_res.status_code == 200

    # AI Chatbot must reject unauthenticated guest with 401
    ai_unauth = client.post("/api/ai/chat", json={"prompt": "Suggest a farm in Coorg"})
    assert ai_unauth.status_code == 401

    # ─────────────────────────────────────────────────────────────
    # 2. AUTHENTICATION WORKFLOWS
    # ─────────────────────────────────────────────────────────────
    # Register Tourist
    t_reg = client.post("/api/auth/register", json={
        "full_name": f"Tourist User {uid}",
        "email": f"tourist_{uid}@test.com",
        "mobile": r_mob_tourist,
        "password": "Password123!"
    })
    assert t_reg.status_code == 200
    t_data = t_reg.json()
    assert t_data["role"] == "tourist"
    t_token = t_data["access_token"]
    t_headers = {"Authorization": f"Bearer {t_token}"}

    # Verify auth/me
    me_res = client.get("/api/auth/me", headers=t_headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == f"tourist_{uid}@test.com"

    # Login with mobile
    mob_login = client.post("/api/auth/login", json={
        "identifier": r_mob_tourist,
        "password": "Password123!"
    })
    assert mob_login.status_code == 200

    # Register Admin
    admin_reg = client.post("/api/auth/register", json={
        "full_name": f"Platform Admin {uid}",
        "email": f"admin_e2e_{uid}@nammaconnect.com",
        "mobile": r_mob_admin,
        "password": "Password123!"
    })
    assert admin_reg.status_code == 200
    admin_token = admin_reg.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # ─────────────────────────────────────────────────────────────
    # 3. FARMER ONBOARDING WORKFLOW (Apply -> Reject -> Resubmit -> Approve)
    # ─────────────────────────────────────────────────────────────
    f_reg = client.post("/api/auth/register", json={
        "full_name": f"Farmer Candidate {uid}",
        "email": f"farmer_{uid}@test.com",
        "mobile": r_mob_farmer,
        "password": "Password123!"
    })
    assert f_reg.status_code == 200
    f_token = f_reg.json()["access_token"]
    f_headers = {"Authorization": f"Bearer {f_token}"}

    # Submit application
    f_app_res = client.post("/api/applications", json={
        "type": "farmer",
        "farmer_details": {
            "name": f"Farmer Candidate {uid}",
            "mobile": r_mob_farmer,
            "email": f"farmer_{uid}@test.com",
            "aadhaar_no": "112233445566",
            "state": "Karnataka",
            "country": "India"
        }
    }, headers=f_headers)
    assert f_app_res.status_code == 200
    f_app_id = f_app_res.json()["id"]

    # Admin rejects application with reason
    rej_res = client.patch(f"/api/admin/applications/{f_app_id}", json={
        "status": "rejected",
        "rejection_reason": "Incomplete land ownership documents"
    }, headers=admin_headers)
    assert rej_res.status_code == 200

    # Farmer resubmits updated application
    resubmit_res = client.post("/api/applications", json={
        "type": "farmer",
        "farmer_details": {
            "name": f"Farmer Candidate {uid}",
            "mobile": r_mob_farmer,
            "email": f"farmer_{uid}@test.com",
            "aadhaar_no": "112233445566",
            "state": "Karnataka",
            "country": "India"
        }
    }, headers=f_headers)
    assert resubmit_res.status_code == 200
    f_app_id_new = resubmit_res.json()["id"]

    # Admin approves application
    appr_res = client.patch(f"/api/admin/applications/{f_app_id_new}", json={"status": "approved"}, headers=admin_headers)
    assert appr_res.status_code == 200

    # Re-login as Farmer to receive upgraded role & permissions
    f_login = client.post("/api/auth/login", json={"identifier": f"farmer_{uid}@test.com", "password": "Password123!"})
    assert f_login.status_code == 200
    assert f_login.json()["role"] == "farmer"
    f_token = f_login.json()["access_token"]
    f_user_id = f_login.json()["user_id"]
    f_headers = {"Authorization": f"Bearer {f_token}"}

    # Fetch farmer profile
    f_profile = client.get(f"/api/farmers/{f_user_id}").json()
    farmer_profile_id = f_profile["id"]

    # ─────────────────────────────────────────────────────────────
    # 4. CREATOR ONBOARDING WORKFLOW (Apply -> Approve -> Enter Work)
    # ─────────────────────────────────────────────────────────────
    c_reg = client.post("/api/auth/register", json={
        "full_name": f"Creator Star {uid}",
        "email": f"creator_{uid}@test.com",
        "mobile": r_mob_creator,
        "password": "Password123!"
    })
    assert c_reg.status_code == 200
    c_token = c_reg.json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}

    c_app_res = client.post("/api/applications", json={
        "type": "creator",
        "creator_details": {
            "display_name": f"Creator Star {uid}",
            "mobile": r_mob_creator,
            "email": f"creator_{uid}@test.com",
            "aadhaar_no": "998877665544",
            "category": "Travel & Agritourism",
            "portfolio_url": "https://instagram.com/creatorstar",
            "state": "Karnataka",
            "country": "India"
        }
    }, headers=c_headers)
    assert c_app_res.status_code == 200
    c_app_id = c_app_res.json()["id"]

    # Admin approves creator
    client.patch(f"/api/admin/applications/{c_app_id}", json={"status": "approved"}, headers=admin_headers)

    c_login = client.post("/api/auth/login", json={"identifier": f"creator_{uid}@test.com", "password": "Password123!"})
    assert c_login.json()["role"] == "creator"
    c_token = c_login.json()["access_token"]
    c_user_id = c_login.json()["user_id"]
    c_headers = {"Authorization": f"Bearer {c_token}"}

    c_profile = client.get(f"/api/creators/{c_user_id}").json()
    creator_profile_id = c_profile["id"]

    # ─────────────────────────────────────────────────────────────
    # 5. FARMER WORKFLOW: CREATE FARM & ACTIVITIES
    # ─────────────────────────────────────────────────────────────
    farm_res = client.post("/api/farms", json={
        "name": f"Coorg Organic Coffee Haven {uid}",
        "description": "Eco-friendly coffee plantation with guided walks.",
        "price_from": 2500.0,
        "address": "Estate Road, Madikeri",
        "city": "Madikeri",
        "district": "Coorg",
        "state": "Karnataka",
        "status": "active"
    }, headers=f_headers)
    assert farm_res.status_code == 200
    farm_id = farm_res.json()["id"]

    # Add activity to farm
    act_res = client.post("/api/activities", json={
        "farm_id": farm_id,
        "name": "Coffee Cupping & Roasting Masterclass",
        "description": "Learn coffee tasting from beans to cup.",
        "price": 750.0,
        "duration_minutes": 120,
        "capacity": 15,
        "status": "active"
    }, headers=f_headers)
    assert act_res.status_code == 200
    act_id = act_res.json()["id"]

    # ─────────────────────────────────────────────────────────────
    # 6. TOURIST HOME, EXPLORE, WISHLIST, BOOKING & PAYMENT WORKFLOW
    # ─────────────────────────────────────────────────────────────
    # Unified search for farms
    search_farms = client.get("/api/search?type=farm&query=Coorg")
    assert search_farms.status_code == 200

    # Wishlist farm & activity
    w1 = client.post(f"/api/wishlist?target_type=farm&target_id={farm_id}", headers=t_headers)
    assert w1.status_code == 200
    w2 = client.post(f"/api/wishlist?target_type=activity&target_id={act_id}", headers=t_headers)
    assert w2.status_code == 200

    my_wishlist = client.get("/api/wishlist", headers=t_headers).json()
    assert str(farm_id) in my_wishlist["farms"]
    assert str(act_id) in my_wishlist["activities"]

    # Tourist books the farm stay
    stay_date = (date.today() + timedelta(days=10)).isoformat()
    checkout_date = (date.today() + timedelta(days=12)).isoformat()
    booking_res = client.post("/api/bookings", json={
        "farm_id": farm_id,
        "activity_id": act_id,
        "booking_date": stay_date,
        "check_out": checkout_date,
        "guest_count": 2,
        "amount": 5000.0,
        "contact_name": f"Tourist User {uid}",
        "contact_mobile": r_mob_tourist,
        "contact_email": f"tourist_{uid}@test.com",
        "special_request": "Early check-in if possible"
    }, headers=t_headers)
    assert booking_res.status_code == 200
    booking_id = booking_res.json()["id"]
    assert booking_res.json()["status"] == "pending"

    # Payment workflow: create order & verify payment with valid HMAC signature
    order_res = client.post("/api/payments/create-order", json={"booking_id": booking_id}, headers=t_headers)
    assert order_res.status_code == 200
    order_data = order_res.json()
    payment_id = f"pay_{uid}_123"

    sec = settings.RAZORPAY_SECRET or "secret"
    sig_payload = f"{order_data['order_id']}|{payment_id}".encode()
    valid_sig = hmac.new(sec.encode(), sig_payload, hashlib.sha256).hexdigest()

    verify_res = client.post("/api/payments/verify", json={
        "booking_id": booking_id,
        "razorpay_order_id": order_data["order_id"],
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_sig
    }, headers=t_headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True

    # Date-change request
    new_stay_date = (date.today() + timedelta(days=15)).isoformat()
    date_change_res = client.post(f"/api/bookings/{booking_id}/date-change", json={
        "new_date": new_stay_date,
        "message": "Need to push stay by 5 days"
    }, headers=t_headers)
    assert date_change_res.status_code == 200

    # Farmer marks booking as completed after the stay
    client.patch(f"/api/bookings/{booking_id}", json={"status": "completed"}, headers=f_headers)

    # Tourist submits review on farm
    review_farm = client.post("/api/reviews", json={
        "target_type": "farm",
        "target_id": farm_id,
        "rating": 5,
        "comment": "Exceptional stay amidst the lush coffee estate!"
    }, headers=t_headers)
    assert review_farm.status_code == 200
    farm_review_id = review_farm.json()["id"]

    # Tourist edits own review
    edit_rev = client.patch(f"/api/reviews/{farm_review_id}", json={
        "rating": 5,
        "comment": "Updated: Best farm stay experience of the year!"
    }, headers=t_headers)
    assert edit_rev.status_code == 200
    assert "Best farm stay" in edit_rev.json()["comment"]

    # ─────────────────────────────────────────────────────────────
    # 7. FARMER ↔ CREATOR COLLABORATION WORKFLOW
    # ─────────────────────────────────────────────────────────────
    # Farmer checks creator availability
    avail = client.get(f"/api/creators/{creator_profile_id}/availability?date_start={stay_date}&date_end={checkout_date}")
    assert avail.status_code == 200
    assert avail.json()["available"] is True

    # Farmer proposes collaboration to Creator
    collab_date = (date.today() + timedelta(days=20)).isoformat()
    collab_req = client.post("/api/collaborations", json={
        "farmer_id": farmer_profile_id,
        "creator_id": creator_profile_id,
        "farm_id": farm_id,
        "initiated_by": "farmer",
        "requested_date": collab_date,
        "amount": 7500.0,
        "message": "We would love a video feature on our organic coffee harvest."
    }, headers=f_headers)
    assert collab_req.status_code == 200
    collab_id = collab_req.json()["id"]
    assert collab_req.json()["status"] == "requested"

    # Creator accepts collaboration
    accept_res = client.patch(f"/api/collaborations/{collab_id}", json={"status": "accepted"}, headers=c_headers)
    assert accept_res.status_code == 200

    # Farmer pays for collaboration
    collab_order = client.post("/api/payments/create-order", json={
        "type": "collaboration",
        "reference_id": collab_id
    }, headers=f_headers)
    assert collab_order.status_code == 200
    collab_order_data = collab_order.json()
    collab_pay_id = f"pay_collab_{uid}_456"
    collab_sig_payload = f"{collab_order_data['order_id']}|{collab_pay_id}".encode()
    valid_collab_sig = hmac.new(sec.encode(), collab_sig_payload, hashlib.sha256).hexdigest()

    collab_verify = client.post("/api/payments/verify", json={
        "type": "collaboration",
        "reference_id": collab_id,
        "razorpay_order_id": collab_order_data["order_id"],
        "razorpay_payment_id": collab_pay_id,
        "razorpay_signature": valid_collab_sig
    }, headers=f_headers)
    assert collab_verify.status_code == 200

    # Mark collaboration as completed
    collab_done = client.patch(f"/api/collaborations/{collab_id}", json={"status": "completed"}, headers=f_headers)
    assert collab_done.status_code == 200

    # Farmer reviews Creator after completed collaboration
    creator_rev = client.post("/api/reviews", json={
        "target_type": "creator",
        "target_id": creator_profile_id,
        "rating": 5,
        "comment": "Outstanding reels and photos delivered on time!"
    }, headers=f_headers)
    assert creator_rev.status_code == 200

    # ─────────────────────────────────────────────────────────────
    # 8. NOTIFICATIONS, MESSAGES, PROFILE & AI TRIP PLANNER
    # ─────────────────────────────────────────────────────────────
    # Send message between users
    msg_res = client.post("/api/messages", json={
        "receiver_id": f_user_id,
        "message": "Hi, what time is check-in?"
    }, headers=t_headers)
    assert msg_res.status_code == 200

    # Notifications check
    notifs = client.get("/api/notifications", headers=f_headers).json()
    assert len(notifs) > 0

    # Mark all read
    read_all = client.post("/api/notifications/read-all", headers=f_headers)
    assert read_all.status_code == 200

    # AI Trip Planner as authenticated user -> 200
    ai_auth = client.post("/api/ai/chat", json={"prompt": "Suggest a farm in Coorg"}, headers=t_headers)
    assert ai_auth.status_code == 200
    assert "data" in ai_auth.json()
