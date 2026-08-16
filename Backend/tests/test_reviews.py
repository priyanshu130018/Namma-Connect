import pytest
import uuid
import random

def test_reviews_full_flow(client):
    uid = uuid.uuid4().hex[:8]
    r_mob1 = f"987{random.randint(1000000, 9999999)}"
    r_mob2 = f"988{random.randint(1000000, 9999999)}"
    r_mob3 = f"989{random.randint(1000000, 9999999)}"
    r_mob4 = f"986{random.randint(1000000, 9999999)}"
    r_mob_admin = f"985{random.randint(1000000, 9999999)}"

    # 0. Register Admin
    admin_reg = client.post("/api/auth/register", json={
        "full_name": f"Admin {uid}",
        "email": f"admin_{uid}@nammaconnect.com",
        "mobile": r_mob_admin,
        "password": "Password123!"
    })
    admin_token = admin_reg.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Register Tourist 1
    t1_res = client.post("/api/auth/register", json={
        "full_name": f"Review Tourist 1 {uid}",
        "email": f"t1_{uid}@test.com",
        "mobile": r_mob1,
        "password": "Password123!"
    })
    assert t1_res.status_code == 200
    token1 = t1_res.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # 2. Register Tourist 2
    t2_res = client.post("/api/auth/register", json={
        "full_name": f"Review Tourist 2 {uid}",
        "email": f"t2_{uid}@test.com",
        "mobile": r_mob2,
        "password": "Password123!"
    })
    assert t2_res.status_code == 200
    token2 = t2_res.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 3. Register Farmer & Apply & Admin Approve
    farmer_res = client.post("/api/auth/register", json={
        "full_name": f"Review Farmer {uid}",
        "email": f"farmer_{uid}@test.com",
        "mobile": r_mob3,
        "password": "Password123!"
    })
    assert farmer_res.status_code == 200
    farmer_token = farmer_res.json()["access_token"]
    farmer_user_id = farmer_res.json()["user_id"]
    farmer_headers = {"Authorization": f"Bearer {farmer_token}"}

    f_app = client.post("/api/applications", json={
        "type": "farmer",
        "farmer_details": {
            "name": f"Review Farmer {uid}",
            "mobile": r_mob3,
            "email": f"farmer_{uid}@test.com",
            "aadhaar_no": "123456789012",
            "state": "Karnataka",
            "country": "India"
        }
    }, headers=farmer_headers)
    assert f_app.status_code == 200
    f_app_id = f_app.json()["id"]

    v1 = client.patch(f"/api/admin/applications/{f_app_id}", json={"status": "approved"}, headers=admin_headers)
    assert v1.status_code == 200

    # Refresh farmer token
    farmer_login = client.post("/api/auth/login", json={"identifier": f"farmer_{uid}@test.com", "password": "Password123!"})
    farmer_headers = {"Authorization": f"Bearer {farmer_login.json()['access_token']}"}

    # Get farmer profile id
    farmer_profile_res = client.get(f"/api/farmers/{farmer_user_id}")
    assert farmer_profile_res.status_code == 200
    farmer_id = farmer_profile_res.json()["id"]

    # 4. Register Creator & Apply & Admin Approve
    creator_res = client.post("/api/auth/register", json={
        "full_name": f"Review Creator {uid}",
        "email": f"creator_{uid}@test.com",
        "mobile": r_mob4,
        "password": "Password123!"
    })
    assert creator_res.status_code == 200
    creator_token = creator_res.json()["access_token"]
    creator_user_id = creator_res.json()["user_id"]
    creator_headers = {"Authorization": f"Bearer {creator_token}"}

    c_app = client.post("/api/applications", json={
        "type": "creator",
        "creator_details": {
            "display_name": f"Review Creator {uid}",
            "mobile": r_mob4,
            "email": f"creator_{uid}@test.com",
            "aadhaar_no": "123456789012",
            "category": "Photography",
            "portfolio_url": "https://instagram.com/creator",
            "state": "Karnataka",
            "country": "India"
        }
    }, headers=creator_headers)
    assert c_app.status_code == 200
    c_app_id = c_app.json()["id"]

    v2 = client.patch(f"/api/admin/applications/{c_app_id}", json={"status": "approved"}, headers=admin_headers)
    assert v2.status_code == 200

    # Refresh creator token
    creator_login = client.post("/api/auth/login", json={"identifier": f"creator_{uid}@test.com", "password": "Password123!"})
    creator_headers = {"Authorization": f"Bearer {creator_login.json()['access_token']}"}

    # Publish farm listing via approved farmer
    farm_res = client.post("/api/farms", json={
        "name": "Sunset Organic Farm",
        "price_from": 1500.0,
        "description": "Lovely farm stay in nature",
        "state": "Karnataka",
        "district": "Coorg",
        "status": "active"
    }, headers=farmer_headers)
    assert farm_res.status_code == 200
    farm_id = farm_res.json()["id"]

    # Retrieve approved creator profile id
    creator_profile_res = client.get(f"/api/creators/{creator_user_id}")
    assert creator_profile_res.status_code == 200
    creator_id = creator_profile_res.json()["id"]

    # Case 1: Unrelated user with NO booking -> review rejected (403)
    res = client.post("/api/reviews", json={"target_type": "farm", "target_id": farm_id, "rating": 5, "comment": "Great!"}, headers=headers1)
    assert res.status_code == 403

    # Case 2: Pending booking -> review rejected (403)
    b_res = client.post("/api/bookings", json={
        "farm_id": farm_id,
        "booking_date": "2026-08-20",
        "check_out": "2026-08-22",
        "guest_count": 2,
        "amount": 3000.0,
        "contact_name": "Review Tourist 1",
        "contact_mobile": r_mob1,
        "contact_email": f"t1_{uid}@test.com"
    }, headers=headers1)
    assert b_res.status_code == 200
    booking_id = b_res.json()["id"]

    res = client.post("/api/reviews", json={"target_type": "farm", "target_id": farm_id, "rating": 5, "comment": "Great!"}, headers=headers1)
    assert res.status_code == 403

    # Case 3: Cancelled booking -> review rejected (403)
    client.post(f"/api/bookings/{booking_id}/cancel", headers=headers1)
    res = client.post("/api/reviews", json={"target_type": "farm", "target_id": farm_id, "rating": 5, "comment": "Great!"}, headers=headers1)
    assert res.status_code == 403

    # Case 4: Completed booking -> review succeeds (200)
    b_res2 = client.post("/api/bookings", json={
        "farm_id": farm_id,
        "booking_date": "2026-08-25",
        "check_out": "2026-08-27",
        "guest_count": 2,
        "amount": 3000.0,
        "contact_name": "Review Tourist 1",
        "contact_mobile": r_mob1,
        "contact_email": f"t1_{uid}@test.com"
    }, headers=headers1)
    assert b_res2.status_code == 200
    booking2_id = b_res2.json()["id"]

    # Farmer marks booking as completed
    status_update_res = client.patch(f"/api/bookings/{booking2_id}", json={"status": "completed"}, headers=farmer_headers)
    assert status_update_res.status_code == 200

    # Tourist 1 submits review -> succeeds!
    res = client.post("/api/reviews", json={"target_type": "farm", "target_id": farm_id, "rating": 5, "comment": "Truly amazing farm experience!"}, headers=headers1)
    assert res.status_code == 200
    review_id = res.json()["id"]
    assert res.json()["rating"] == 5

    # Case 5: Duplicate review by same user on same target -> rejected (400)
    res = client.post("/api/reviews", json={"target_type": "farm", "target_id": farm_id, "rating": 4, "comment": "Duplicate attempt"}, headers=headers1)
    assert res.status_code == 400

    # Case 6: Invalid rating bounds (< 1 or > 5) -> rejected (422)
    b3_res = client.post("/api/bookings", json={
        "farm_id": farm_id,
        "booking_date": "2026-09-01",
        "check_out": "2026-09-03",
        "guest_count": 1,
        "amount": 1500.0,
        "contact_name": "Review Tourist 2",
        "contact_mobile": r_mob2,
        "contact_email": f"t2_{uid}@test.com"
    }, headers=headers2)
    assert b3_res.status_code == 200
    b3_id = b3_res.json()["id"]
    client.patch(f"/api/bookings/{b3_id}", json={"status": "completed"}, headers=farmer_headers)

    res = client.post("/api/reviews", json={"target_type": "farm", "target_id": farm_id, "rating": 6, "comment": "Too high"}, headers=headers2)
    assert res.status_code == 422
    res = client.post("/api/reviews", json={"target_type": "farm", "target_id": farm_id, "rating": 0, "comment": "Too low"}, headers=headers2)
    assert res.status_code == 422

    # Case 7: Editing another user's review -> rejected (403)
    res = client.patch(f"/api/reviews/{review_id}", json={"rating": 3, "comment": "Hacked review"}, headers=headers2)
    assert res.status_code == 403

    # Case 8: Editing own review -> succeeds (200)
    res = client.patch(f"/api/reviews/{review_id}", json={"rating": 4, "comment": "Updated: Really great stay!"}, headers=headers1)
    assert res.status_code == 200
    assert res.json()["rating"] == 4

    # Case 9: Collaboration review flow: Farmer proposes collab, Creator accepts, Farmer completes, Farmer reviews
    collab_req = client.post("/api/collaborations", json={
        "farmer_id": farmer_id,
        "creator_id": creator_id,
        "farm_id": farm_id,
        "initiated_by": "farmer",
        "requested_date": "2026-08-10",
        "amount": 5000.0,
        "message": "Excited to collaborate!"
    }, headers=farmer_headers)
    assert collab_req.status_code == 200
    collab_id = collab_req.json()["id"]

    # Mark collab completed via official patch
    client.patch(f"/api/collaborations/{collab_id}", json={"status": "completed"}, headers=farmer_headers)

    # Farmer reviews Creator -> succeeds!
    res = client.post("/api/reviews", json={"target_type": "creator", "target_id": creator_id, "rating": 5, "comment": "Outstanding creator collaboration!"}, headers=farmer_headers)
    assert res.status_code == 200

    # Case 10: Deleting another user's review -> rejected (403)
    res = client.delete(f"/api/reviews/{review_id}", headers=headers2)
    assert res.status_code == 403

    # Case 11: Deleting own review -> succeeds (200)
    res = client.delete(f"/api/reviews/{review_id}", headers=headers1)
    assert res.status_code == 200
