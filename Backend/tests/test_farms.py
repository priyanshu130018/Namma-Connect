def test_create_and_list_farms(client):
    # Step 1: Register farmer user
    reg_payload = {
        "full_name": "Farmer Joe",
        "email": "farmer.joe@example.com",
        "mobile": "9876543211",
        "password": "FarmerPassword1!"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 200

    # Step 2: Login to get token
    login_res = client.post("/api/auth/login", json={
        "identifier": "farmer.joe@example.com",
        "password": "FarmerPassword1!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    
    # Step 3: Register farmer profile via applications
    profile_payload = {
        "type": "farmer",
        "farmer_details": {
            "name": "Farmer Joe",
            "mobile": "9876543211",
            "email": "farmer.joe@example.com",
            "aadhaar_no": "999988887777",
            "state": "Karnataka",
            "country": "India"
        }
    }
    profile_res = client.post("/api/applications", json=profile_payload, headers={"Authorization": f"Bearer {token}"})
    assert profile_res.status_code == 200
    app_id = profile_res.json()["id"]
    
    # Admin verify
    client.post("/api/auth/register", json={"full_name": "Admin", "email": "admin2@nammaconnect.com", "mobile": "1111111112", "password": "Admin123!"})
    admin_login = client.post("/api/auth/login", json={"identifier": "admin2@nammaconnect.com", "password": "Admin123!"})
    admin_token = admin_login.json()["access_token"]
    client.patch(f"/api/admin/applications/{app_id}", json={"status": "approved"}, headers={"Authorization": f"Bearer {admin_token}"})
    
    # Re-login to get updated token
    login_res = client.post("/api/auth/login", json={"identifier": "farmer.joe@example.com", "password": "FarmerPassword1!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 4: Create farm listing
    farm_payload = {
        "farm_name": "Green Valley Farm",
        "description": "A beautiful organic vegetable farm stay.",
        "address": "123 Green Valley Road",
        "city": "Mysore",
        "state": "Karnataka",
        "mobile": "9876543211",
        "email": "farmer.joe@example.com",
        "crop_types": "Vegetables, Fruits",
        "price_per_night": 1500.00
    }
    create_res = client.post("/api/farms", json=farm_payload, headers=headers)
    assert create_res.status_code == 200
    farm_id = create_res.json()["id"]
    assert create_res.json()["farm_name"] == "Green Valley Farm"

    # Step 5: List farms
    list_res = client.get("/api/farms")
    assert list_res.status_code == 200
    farms_data = list_res.json()["data"]

    assert len(farms_data) > 0
    assert any(f["id"] == farm_id for f in farms_data)
