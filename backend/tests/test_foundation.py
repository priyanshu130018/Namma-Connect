"""Foundation architecture and endpoint router tests."""

from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing():
    pw = "super_secret_password_123"
    hashed = get_password_hash(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_jwt_token_creation():
    token = create_access_token(subject="user-uuid-1234", role="customer")
    assert isinstance(token, str)
    assert len(token) > 20

    refresh = create_refresh_token(subject="user-uuid-1234")
    assert isinstance(refresh, str)
    assert len(refresh) > 20


def test_api_v2_sub_routers(client):
    res_auth = client.get("/api/v2/auth/status")
    assert res_auth.status_code == 200

    res_search = client.get("/api/v2/search?q=coffee")
    assert res_search.status_code == 200
    assert res_search.json()["success"] is True

    res_services = client.get("/api/v2/services")
    assert res_services.status_code == 200

    res_bookings = client.get("/api/v2/bookings")
    assert res_bookings.status_code == 200

    res_admin = client.get("/api/v2/admin/status")
    assert res_admin.status_code == 200
