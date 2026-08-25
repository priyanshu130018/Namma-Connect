import uuid
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_customer(client: TestClient) -> dict:
    """Create test customer."""
    uid = uuid.uuid4().hex[:8]
    user_payload = {
        "email": f"customer.profile.{uid}@example.com",
        "password": "SecurePassword123!",
        "full_name": "Ravi Kumar",
        "role": "customer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    token = reg_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_customer2(client: TestClient) -> dict:
    """Create second test customer."""
    uid = uuid.uuid4().hex[:8]
    user_payload = {
        "email": f"customer.profile2.{uid}@example.com",
        "password": "SecurePassword123!",
        "full_name": "Deepa Hegde",
        "role": "customer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    token = reg_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_profile_and_settings_unauthenticated_fails(client: TestClient):
    """Unauthenticated requests are rejected with 401."""
    assert client.get("/api/v2/users/me").status_code == 401
    assert client.put("/api/v2/users/me", json={"full_name": "New Name"}).status_code == 401
    assert client.get("/api/v2/users/me/settings").status_code == 401
    assert client.put("/api/v2/users/me/settings", json={"theme": "dark"}).status_code == 401
    assert client.post("/api/v2/users/me/change-request", json={"field": "Verified Name", "requested_value": "V", "reason": "R"}).status_code == 401


def test_get_and_update_customer_profile(client: TestClient, auth_headers_customer: dict):
    """Test retrieving and updating editable profile fields."""
    # 1. Get profile
    resp = client.get("/api/v2/users/me", headers=auth_headers_customer)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "customer.profile" in data["email"]
    assert data["full_name"] == "Ravi Kumar"
    assert data["role"] == "customer"

    # 2. Update editable fields
    update_payload = {
        "full_name": "Ravi Shankar Kumar",
        "location": "Mysuru, Karnataka",
        "language": "Kannada, English, Hindi",
    }
    update_resp = client.put("/api/v2/users/me", json=update_payload, headers=auth_headers_customer)
    assert update_resp.status_code == 200
    updated_data = update_resp.json()["data"]
    assert updated_data["full_name"] == "Ravi Shankar Kumar"
    assert updated_data["location"] == "Mysuru, Karnataka"
    assert updated_data["language"] == "Kannada, English, Hindi"

    # 3. Verify get returns the updated profile
    get_again = client.get("/api/v2/users/me", headers=auth_headers_customer).json()["data"]
    assert get_again["full_name"] == "Ravi Shankar Kumar"
    assert get_again["location"] == "Mysuru, Karnataka"


def test_get_and_update_user_settings(
    client: TestClient,
    auth_headers_customer: dict,
    auth_headers_customer2: dict,
):
    """Test user preferences & cross-user isolation."""
    # 1. Get settings
    settings_resp = client.get("/api/v2/users/me/settings", headers=auth_headers_customer)
    assert settings_resp.status_code == 200
    data = settings_resp.json()["data"]
    assert data["theme"] in ["light", "dark", "system"]
    assert data["notifications"]["email"] is True

    # 2. Update settings
    new_settings = {
        "theme": "dark",
        "notifications": {"promo": True, "sms": False},
        "privacy": {"share_profile": False},
    }
    put_resp = client.put("/api/v2/users/me/settings", json=new_settings, headers=auth_headers_customer)
    assert put_resp.status_code == 200
    updated = put_resp.json()["data"]
    assert updated["theme"] == "dark"
    assert updated["notifications"]["promo"] is True
    assert updated["notifications"]["sms"] is False
    assert updated["privacy"]["share_profile"] is False

    # 3. Customer 2 settings are isolated and unaffected
    c2_settings = client.get("/api/v2/users/me/settings", headers=auth_headers_customer2).json()["data"]
    assert c2_settings["notifications"]["sms"] is True  # default unaffected


def test_verification_change_request(client: TestClient, auth_headers_customer: dict):
    """Test submitting compliance change request for verified identity credentials."""
    payload = {
        "field": "Verified Name",
        "requested_value": "Ravi S. Kumar",
        "reason": "Corrected name as per official Aadhaar card update",
    }
    resp = client.post("/api/v2/users/me/change-request", json=payload, headers=auth_headers_customer)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "PENDING_REVIEW"
    assert data["field"] == "Verified Name"


def test_change_password_workflow(client: TestClient):
    """Test authenticated password change endpoint."""
    pw_email = f"customer.pw.{uuid.uuid4().hex[:6]}@example.com"
    reg_resp = client.post(
        "/api/v2/auth/register",
        json={
            "email": pw_email,
            "password": "SecurePassword123!",
            "full_name": "Password Tester",
            "role": "customer",
        },
    )
    auth_hdr = {"Authorization": f"Bearer {reg_resp.json()['access_token']}"}

    # 1. Wrong current password fails
    wrong_pw_payload = {
        "current_password": "WrongPassword123!",
        "new_password": "NewSecurePassword456!",
    }
    wrong_resp = client.post("/api/v2/auth/change-password", json=wrong_pw_payload, headers=auth_hdr)
    assert wrong_resp.status_code in [400, 401, 422]

    # 2. Correct current password succeeds
    correct_pw_payload = {
        "current_password": "SecurePassword123!",
        "new_password": "NewSecurePassword456!",
    }
    correct_resp = client.post("/api/v2/auth/change-password", json=correct_pw_payload, headers=auth_hdr)
    assert correct_resp.status_code == 200
    assert correct_resp.json()["success"] is True

    # 3. Login with new password works
    login_resp = client.post("/api/v2/auth/login", json={"email": pw_email, "password": "NewSecurePassword456!"})
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


def test_get_and_update_user_preferences(
    client: TestClient,
    auth_headers_customer: dict,
    auth_headers_customer2: dict,
):
    """Test dedicated PATCH and GET /api/v2/users/me/preferences."""
    # 1. Unauthenticated fails
    assert client.get("/api/v2/users/me/preferences").status_code == 401
    assert client.patch("/api/v2/users/me/preferences", json={"theme_preference": "dark"}).status_code == 401

    # 2. Get initial preferences
    resp = client.get("/api/v2/users/me/preferences", headers=auth_headers_customer)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "theme_preference" in data
    assert "language" in data

    # 3. Update preferences
    patch_payload = {
        "theme_preference": "dark",
        "language": "kn",
    }
    patch_resp = client.patch(
        "/api/v2/users/me/preferences",
        json=patch_payload,
        headers=auth_headers_customer,
    )
    assert patch_resp.status_code == 200
    updated_data = patch_resp.json()["data"]
    assert updated_data["theme_preference"] == "dark"
    assert updated_data["language"] == "kn"

    # 4. Verify GET returns updated values
    get_again = client.get("/api/v2/users/me/preferences", headers=auth_headers_customer)
    assert get_again.status_code == 200
    assert get_again.json()["data"]["theme_preference"] == "dark"
    assert get_again.json()["data"]["language"] == "kn"

    # 5. Invalid values are rejected with 422
    invalid_theme = client.patch(
        "/api/v2/users/me/preferences",
        json={"theme_preference": "neon"},
        headers=auth_headers_customer,
    )
    assert invalid_theme.status_code in [400, 422]

    invalid_lang = client.patch(
        "/api/v2/users/me/preferences",
        json={"language": "fr"},
        headers=auth_headers_customer,
    )
    assert invalid_lang.status_code in [400, 422]

    # 6. Customer 2 remains isolated
    c2_prefs = client.get("/api/v2/users/me/preferences", headers=auth_headers_customer2).json()["data"]
    assert c2_prefs["theme_preference"] != "dark" or c2_prefs["language"] != "kn"
