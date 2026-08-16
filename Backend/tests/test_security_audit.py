import pytest
import uuid
import random

def test_security_and_authorization_audit(client):
    uid = uuid.uuid4().hex[:8]
    r_mob1 = f"971{random.randint(1000000, 9999999)}"
    r_mob2 = f"972{random.randint(1000000, 9999999)}"
    r_mob_farmer = f"973{random.randint(1000000, 9999999)}"
    r_mob_farmer2 = f"974{random.randint(1000000, 9999999)}"
    r_mob_admin = f"975{random.randint(1000000, 9999999)}"

    # 1. Unauthenticated requests to protected endpoints return 401
    assert client.get("/api/profile").status_code == 401
    assert client.get("/api/farmers/me").status_code == 401
    assert client.get("/api/creators/me").status_code == 401
    assert client.get("/api/bookings").status_code == 401
    assert client.post("/api/bookings", json={}).status_code == 401
    assert client.get("/api/collaborations").status_code == 401
    assert client.post("/api/collaborations", json={}).status_code == 401
    assert client.get("/api/wishlist").status_code == 401
    assert client.post("/api/wishlist", json={}).status_code == 401
    assert client.get("/api/admin/users").status_code == 401
    assert client.get("/api/admin/applications").status_code == 401
    assert client.get("/api/admin/bookings").status_code == 401

    # 2. Register Tourist 1 and Tourist 2
    t1_res = client.post("/api/auth/register", json={
        "full_name": f"Audit Tourist 1 {uid}",
        "email": f"audit_t1_{uid}@test.com",
        "mobile": r_mob1,
        "password": "Password123!"
    })
    token1 = t1_res.json()["access_token"]
    user1_id = t1_res.json()["user_id"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    t2_res = client.post("/api/auth/register", json={
        "full_name": f"Audit Tourist 2 {uid}",
        "email": f"audit_t2_{uid}@test.com",
        "mobile": r_mob2,
        "password": "Password123!"
    })
    token2 = t2_res.json()["access_token"]
    user2_id = t2_res.json()["user_id"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 3. Register Admin
    admin_res = client.post("/api/auth/register", json={
        "full_name": f"Audit Admin {uid}",
        "email": f"admin_audit_{uid}@nammaconnect.com",
        "mobile": r_mob_admin,
        "password": "Password123!"
    })
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 4. Privilege Escalation: Non-admin calling admin endpoints -> 403
    assert client.get("/api/admin/users", headers=headers1).status_code == 403
    assert client.get("/api/admin/applications", headers=headers1).status_code == 403
    assert client.get("/api/admin/bookings", headers=headers1).status_code == 403
    assert client.get("/api/admin/stats", headers=headers1).status_code == 403
    assert client.delete(f"/api/admin/users/{user2_id}", headers=headers1).status_code == 403

    # Admin access -> 200
    assert client.get("/api/admin/users", headers=admin_headers).status_code == 200
    assert client.get("/api/admin/applications", headers=admin_headers).status_code == 200
    assert client.get("/api/admin/stats", headers=admin_headers).status_code == 200

    # 5. Non-approved user publishing a farm listing -> 403
    farm_fail = client.post("/api/farms", json={
        "name": "Unauthorized Farm",
        "price_from": 1000.0,
        "state": "Karnataka",
        "district": "Coorg",
        "status": "active"
    }, headers=headers1)
    assert farm_fail.status_code == 403

    # 6. Register and approve Farmer 1 & Farmer 2
    f1_res = client.post("/api/auth/register", json={
        "full_name": f"Farmer 1 {uid}",
        "email": f"f1_{uid}@test.com",
        "mobile": r_mob_farmer,
        "password": "Password123!"
    })
    f1_token = f1_res.json()["access_token"]
    f1_headers = {"Authorization": f"Bearer {f1_token}"}

    app1 = client.post("/api/applications", json={
        "type": "farmer",
        "farmer_details": {"name": f"Farmer 1 {uid}", "mobile": r_mob_farmer, "email": f"f1_{uid}@test.com", "aadhaar_no": "123456789012", "state": "Karnataka", "country": "India"}
    }, headers=f1_headers)
    client.patch(f"/api/admin/applications/{app1.json()['id']}", json={"status": "approved"}, headers=admin_headers)
    f1_token = client.post("/api/auth/login", json={"identifier": f"f1_{uid}@test.com", "password": "Password123!"}).json()["access_token"]
    f1_headers = {"Authorization": f"Bearer {f1_token}"}

    f2_res = client.post("/api/auth/register", json={
        "full_name": f"Farmer 2 {uid}",
        "email": f"f2_{uid}@test.com",
        "mobile": r_mob_farmer2,
        "password": "Password123!"
    })
    f2_token = f2_res.json()["access_token"]
    f2_headers = {"Authorization": f"Bearer {f2_token}"}

    app2 = client.post("/api/applications", json={
        "type": "farmer",
        "farmer_details": {"name": f"Farmer 2 {uid}", "mobile": r_mob_farmer2, "email": f"f2_{uid}@test.com", "aadhaar_no": "123456789012", "state": "Karnataka", "country": "India"}
    }, headers=f2_headers)
    client.patch(f"/api/admin/applications/{app2.json()['id']}", json={"status": "approved"}, headers=admin_headers)
    f2_token = client.post("/api/auth/login", json={"identifier": f"f2_{uid}@test.com", "password": "Password123!"}).json()["access_token"]
    f2_headers = {"Authorization": f"Bearer {f2_token}"}

    # Farmer 1 creates farm
    farm1 = client.post("/api/farms", json={
        "name": "Farmer 1 Estate",
        "price_from": 2000.0,
        "state": "Karnataka",
        "district": "Coorg",
        "status": "active"
    }, headers=f1_headers).json()
    farm1_id = farm1["id"]

    # 7. Cross-tenant mutation: Farmer 2 editing or deleting Farmer 1's farm -> 403
    edit_attempt = client.patch(f"/api/farms/{farm1_id}", json={"name": "Hacked Farm"}, headers=f2_headers)
    assert edit_attempt.status_code == 403

    del_attempt = client.delete(f"/api/farms/{farm1_id}", headers=f2_headers)
    assert del_attempt.status_code in (403, 404)

    # 8. Activity ownership: Farmer 2 adding activity to Farmer 1's farm -> 403
    act_fail = client.post("/api/activities", json={
        "farm_id": farm1_id,
        "name": "Rogue Plantation Walk",
        "price": 500.0
    }, headers=f2_headers)
    assert act_fail.status_code == 403

    # 9. Self-booking strictly prohibited -> 400
    self_book = client.post("/api/bookings", json={
        "farm_id": farm1_id,
        "booking_date": "2026-10-01",
        "check_out": "2026-10-03",
        "amount": 4000.0,
        "contact_name": "Farmer 1 Self",
        "contact_mobile": r_mob_farmer,
        "contact_email": f"f1_{uid}@test.com"
    }, headers=f1_headers)
    assert self_book.status_code == 400
    assert "cannot book your own" in self_book.json()["detail"].lower()

    # 10. Legitimate booking by Tourist 1
    booking = client.post("/api/bookings", json={
        "farm_id": farm1_id,
        "booking_date": "2026-10-05",
        "check_out": "2026-10-07",
        "amount": 4000.0,
        "contact_name": "Audit Tourist 1",
        "contact_mobile": r_mob1,
        "contact_email": f"audit_t1_{uid}@test.com"
    }, headers=headers1).json()
    booking_id = booking["id"]

    # 11. Payment checkout security: Tourist 2 cannot create order or pay for Tourist 1's booking -> 404
    pay_hijack = client.post("/api/payments/create-order", json={"booking_id": booking_id}, headers=headers2)
    assert pay_hijack.status_code == 404

    # Tourist 1 can create order
    pay_order = client.post("/api/payments/create-order", json={"booking_id": booking_id}, headers=headers1)
    assert pay_order.status_code == 200

    # 12. Booking Cancellation: Tourist 2 cannot cancel Tourist 1's booking -> 404
    cancel_hijack = client.post(f"/api/bookings/{booking_id}/cancel", headers=headers2)
    assert cancel_hijack.status_code == 404
