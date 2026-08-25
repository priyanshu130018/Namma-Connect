"""Comprehensive backend test suite for Authentication and RBAC."""


def test_auth_registration_and_login_flow(client):
    """Test full registration and login lifecycle."""
    # 1. Register new customer
    reg_payload = {
        "email": "priya@nammaconnect.in",
        "password": "SecurePassword123!",
        "full_name": "Priyanka Sharma",
        "mobile": "+919876543210",
        "role": "customer",
    }
    reg_res = client.post("/api/v2/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "priya@nammaconnect.in"
    assert data["user"]["role"] == "customer"
    assert "hashed_password" not in data["user"]
    assert "password" not in data["user"]

    access_token = data["access_token"]
    refresh_token = data["refresh_token"]

    # 2. Duplicate registration rejection
    dup_res = client.post("/api/v2/auth/register", json=reg_payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Get Current User /auth/me with Bearer token
    me_res = client.get(
        "/api/v2/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "priya@nammaconnect.in"
    assert me_data["full_name"] == "Priyanka Sharma"

    # 4. Login with correct password
    login_res = client.post(
        "/api/v2/auth/login",
        json={"email": "priya@nammaconnect.in", "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # 5. Login with incorrect password
    bad_login = client.post(
        "/api/v2/auth/login",
        json={"email": "priya@nammaconnect.in", "password": "WrongPassword"},
    )
    assert bad_login.status_code == 401

    # 6. Refresh Token flow
    refresh_res = client.post(
        "/api/v2/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()

    # 7. Logout acknowledgement
    logout_res = client.post("/api/v2/auth/logout")
    assert logout_res.status_code == 200


def test_auth_unauthenticated_requests_rejected(client):
    """Verify protected endpoints reject unauthenticated access with 401."""
    res = client.get("/api/v2/auth/me")
    assert res.status_code == 401


def test_forgot_password_generic_response(client):
    """Verify forgot password does not leak email existence."""
    res = client.post(
        "/api/v2/auth/forgot-password",
        json={"email": "unknown@example.com"},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True


def test_rbac_role_enforcement(client):
    """Verify customer, partner, and admin backend authorization boundaries."""
    # 1. Register Customer
    cust_res = client.post(
        "/api/v2/auth/register",
        json={
            "email": "traveler@user.com",
            "password": "Password123!",
            "full_name": "Traveler User",
            "role": "customer",
        },
    )
    cust_token = cust_res.json()["access_token"]

    # 2. Register Partner (Farmer)
    ptnr_res = client.post(
        "/api/v2/auth/register",
        json={
            "email": "farmer@kodagu.in",
            "password": "Password123!",
            "full_name": "Somanna Farmer",
            "role": "farmer",
        },
    )
    ptnr_token = ptnr_res.json()["access_token"]

    # 3. Register Admin
    admin_res = client.post(
        "/api/v2/auth/register",
        json={
            "email": "admin@nammaconnect.in",
            "password": "AdminPassword123!",
            "full_name": "Platform Admin",
            "role": "admin",
        },
    )
    admin_token = admin_res.json()["access_token"]

    # Customer tries accessing Partner endpoint -> 403 Forbidden
    cust_on_partner = client.post(
        "/api/v2/services",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert cust_on_partner.status_code == 403

    # Customer tries accessing Admin endpoint -> 403 Forbidden
    cust_on_admin = client.get(
        "/api/v2/admin/overview",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert cust_on_admin.status_code == 403

    # Partner tries accessing Admin endpoint -> 403 Forbidden
    ptnr_on_admin = client.get(
        "/api/v2/admin/overview",
        headers={"Authorization": f"Bearer {ptnr_token}"},
    )
    assert ptnr_on_admin.status_code == 403

    # Partner accesses Partner endpoint -> 200 OK
    ptnr_on_partner = client.post(
        "/api/v2/services",
        headers={"Authorization": f"Bearer {ptnr_token}"},
    )
    assert ptnr_on_partner.status_code == 200

    # Admin accesses Admin endpoint -> 200 OK
    admin_on_admin = client.get(
        "/api/v2/admin/overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_on_admin.status_code == 200
