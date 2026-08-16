def test_register_and_login_success(client):
    reg_payload = {
        "full_name": "Auth Test User",
        "email": "authtest@example.com",
        "mobile": "9998887770",
        "password": "Password123!"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "tourist"
    assert data["name"] == "Auth Test User"

    login_payload = {
        "identifier": "authtest@example.com",
        "password": "Password123!"
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
