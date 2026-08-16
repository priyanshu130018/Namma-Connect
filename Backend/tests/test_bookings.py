import datetime

def test_create_and_fetch_booking(client):
    # Step 1: Register farmer and create farm
    reg_farmer = client.post("/api/auth/register", json={
        "full_name": "Farmer Joe 2",
        "email": "farmer.joe2@example.com",
        "mobile": "9876543212",
        "password": "FarmerPassword2!"
    })
    assert reg_farmer.status_code == 200

    login_farmer = client.post("/api/auth/login", json={
        "identifier": "farmer.joe2@example.com",
        "password": "FarmerPassword2!"
    })
    farmer_token = login_farmer.json()["access_token"]
    app_res = client.post("/api/applications", headers={"Authorization": f"Bearer {farmer_token}"}, json={
        "type": "farmer",
        "farmer_details": {
            "name": "Farmer Joe 2",
            "mobile": "9876543212",
            "email": "farmer.joe2@example.com",
            "aadhaar_no": "999988887776",
            "state": "Karnataka",
            "country": "India"
        }
    })
    assert app_res.status_code == 200
    app_id = app_res.json()["id"]

    # Admin verify
    admin_reg = client.post("/api/auth/register", json={"full_name": "Admin", "email": "admin@nammaconnect.com", "mobile": "1111111111", "password": "Admin123!"})
    admin_login = client.post("/api/auth/login", json={"identifier": "admin@nammaconnect.com", "password": "Admin123!"})
    admin_token = admin_login.json()["access_token"]
    client.patch(f"/api/admin/applications/{app_id}", json={"status": "approved"}, headers={"Authorization": f"Bearer {admin_token}"})
    
    # re-login farmer after approval to get updated token
    login_farmer = client.post("/api/auth/login", json={
        "identifier": "farmer.joe2@example.com",
        "password": "FarmerPassword2!"
    })
    farmer_token = login_farmer.json()["access_token"]

    create_farm = client.post("/api/farms", json={
        "farm_name": "Sunset Acres",
        "description": "Lovely sunset farm stay",
        "price_per_night": 2000.00
    }, headers={"Authorization": f"Bearer {farmer_token}"})
    assert create_farm.status_code == 200
    farm_id = create_farm.json()["id"]

    # Step 2: Register tourist user
    reg_tourist = client.post("/api/auth/register", json={
        "full_name": "Tourist Tim",
        "email": "tourist.tim@example.com",
        "mobile": "9876543213",
        "password": "TouristPassword1!"
    })
    assert reg_tourist.status_code == 200

    login_tourist = client.post("/api/auth/login", json={
        "identifier": "tourist.tim@example.com",
        "password": "TouristPassword1!"
    })
    tourist_token = login_tourist.json()["access_token"]
    headers = {"Authorization": f"Bearer {tourist_token}"}

    # Step 3: Create booking request
    today = datetime.date.today()
    tomorrow = today + datetime.timedelta(days=1)

    booking_payload = {
        "booking_type": "farm",
        "farm_id": farm_id,
        "check_in": today.isoformat(),
        "check_out": tomorrow.isoformat(),
        "adults": 2,
        "children": 0,
        "total_price": 2000.00
    }
    create_booking_res = client.post("/api/bookings", json=booking_payload, headers=headers)
    assert create_booking_res.status_code == 200
    booking_id = create_booking_res.json()["id"]
    assert create_booking_res.json()["booking_type"] == "farm"

    # Step 4: Fetch tourist bookings
    fetch_res = client.get("/api/bookings", headers=headers)
    assert fetch_res.status_code == 200
    bookings_data = fetch_res.json()["data"]

    assert len(bookings_data) > 0
    assert any(b["id"] == booking_id for b in bookings_data)
