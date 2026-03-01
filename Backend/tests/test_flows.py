"""
Namma Gig – Backend Test Suite
Tests: Registration, Login, Booking flows, Redirect logic, and Input Validation
Run with: pytest tests/test_flows.py -v
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.database import Base, get_db
from main import app

# ─── In-memory SQLite DB for tests ──────────────────────────────────────────
TEST_DB_URL = "sqlite:///./test_namma_gig.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)

client = TestClient(app)


# ─── Fixtures ────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def tourist_credentials():
    return {
        "full_name": "Test Tourist",
        "email": "test.tourist@example.com",
        "mobile": "9876543210",
        "password": "Password123!"
    }


@pytest.fixture(scope="module")
def farmer_credentials():
    return {
        "full_name": "Test Farmer",
        "email": "test.farmer@example.com",
        "mobile": "9123456780",
        "password": "FarmPass123!"
    }


# ─── AUTH TESTS ──────────────────────────────────────────────────────────────
class TestRegistration:
    def test_register_tourist_success(self, tourist_credentials):
        """Tourist registration should return token with role='tourist'"""
        res = client.post("/api/register", json=tourist_credentials)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["role"] == "tourist"
        assert data["access_token"]
        assert data["name"] == tourist_credentials["full_name"]

    def test_register_duplicate_email_fails(self, tourist_credentials):
        """Duplicate email registration should return 400"""
        res = client.post("/api/register", json=tourist_credentials)
        assert res.status_code == 400
        assert "already registered" in res.json()["detail"].lower()

    def test_register_with_short_mobile_fails(self):
        """Mobile shorter than 10 digits should fail validation"""
        res = client.post("/api/register", json={
            "full_name": "Short Mobile",
            "email": "short.mobile@example.com",
            "mobile": "12345",  # Too short
            "password": "Password123!"
        })
        assert res.status_code == 422  # Validation error

    def test_register_with_invalid_email_fails(self):
        """Invalid email should return 422"""
        res = client.post("/api/register", json={
            "full_name": "Bad Email User",
            "email": "not-an-email",
            "mobile": "9876543210",
            "password": "Password123!"
        })
        assert res.status_code == 422


class TestLogin:
    def test_login_with_email_success(self, tourist_credentials):
        """Login with valid email+password should return token"""
        res = client.post("/api/login", json={
            "identifier": tourist_credentials["email"],
            "password": tourist_credentials["password"]
        })
        assert res.status_code == 200
        data = res.json()
        assert data["access_token"]
        assert data["role"] == "tourist"
        assert data["name"] == tourist_credentials["full_name"]  # name must be returned

    def test_login_with_mobile_success(self, tourist_credentials):
        """Login with valid mobile+password should work"""
        res = client.post("/api/login", json={
            "identifier": tourist_credentials["mobile"],
            "password": tourist_credentials["password"]
        })
        assert res.status_code == 200
        assert res.json()["access_token"]

    def test_login_invalid_password(self, tourist_credentials):
        """Wrong password should return 401"""
        res = client.post("/api/login", json={
            "identifier": tourist_credentials["email"],
            "password": "WrongPassword!"
        })
        assert res.status_code == 401
        assert "incorrect" in res.json()["detail"].lower()

    def test_login_nonexistent_user(self):
        """Login with unknown email should return 401"""
        res = client.post("/api/login", json={
            "identifier": "ghost@example.com",
            "password": "SomePass123"
        })
        assert res.status_code == 401

    def test_login_returns_name(self, tourist_credentials):
        """name field must be non-empty in login response"""
        res = client.post("/api/login", json={
            "identifier": tourist_credentials["email"],
            "password": tourist_credentials["password"]
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("name"), "name must be present and non-empty after login"


class TestFarmerRegistration:
    def test_register_as_farmer(self, farmer_credentials):
        """Register a new user and upgrade to farmer role"""
        # Step 1: Register as tourist first
        reg = client.post("/api/register", json=farmer_credentials)
        assert reg.status_code == 200
        user_id = reg.json()["user_id"]

        # Step 2: Register farmer profile
        farmer_payload = {
            "profile": {
                "name": "Test Farmer",
                "mobile": "9123456780",
                "email": farmer_credentials["email"],
                "aadhaar_no": "123456789012",
                "state": "Karnataka",
                "country": "India",
            }
        }
        res = client.post(f"/api/services/farmer/register/{user_id}", json=farmer_payload)
        assert res.status_code == 200
        profile = res.json()
        assert profile["name"] == "Test Farmer"

    def test_farmer_login_returns_farmer_role(self, farmer_credentials):
        """After farmer registration, login should return role='farmer'"""
        res = client.post("/api/login", json={
            "identifier": farmer_credentials["email"],
            "password": farmer_credentials["password"]
        })
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "farmer"
        assert data["name"]  # name must be present

    def test_farmer_profile_invalid_aadhaar_size(self, farmer_credentials):
        """Aadhaar with != 12 digits should fail validation at schema level"""
        reg = client.post("/api/register", json={
            "full_name": "Aadhaar Test",
            "email": "aadhaar.test@example.com",
            "mobile": "9000000001",
            "password": "TestPass123!"
        })
        user_id = reg.json()["user_id"]

        # Aadhaar with only 11 digits — should fail 422
        bad_payload = {
            "profile": {
                "name": "Aadhaar Test",
                "mobile": "9000000001",
                "email": "aadhaar.test@example.com",
                "aadhaar_no": "12345678901",  # 11 digits — too short
            }
        }
        res = client.post(f"/api/services/farmer/register/{user_id}", json=bad_payload)
        assert res.status_code == 422


class TestBookingFlow:
    def _get_tourist_token_and_ids(self, credentials):
        res = client.post("/api/login", json={
            "identifier": credentials["email"],
            "password": credentials["password"]
        })
        data = res.json()
        return data["access_token"], data["user_id"]

    def test_booking_creates_with_pending_status(self, tourist_credentials, farmer_credentials):
        """Tourist creates a booking which starts as 'pending'"""
        _token, user_id = self._get_tourist_token_and_ids(tourist_credentials)

        # Get a farm listing
        farms = client.get("/api/farmer/farm-listing").json()
        if not farms:
            pytest.skip("No farm listings available for booking test")

        farm_id = farms[0]["id"]
        res = client.post(f"/api/tourist/booking/{user_id}", json={
            "booking_type": "farm",
            "farm_id": farm_id,
            "check_in": "2027-03-01",
            "check_out": "2027-03-05",
            "guests": 2,
            "total_price": 0,
        })
        assert res.status_code == 200
        booking = res.json()
        assert booking["status"] == "pending"

    def test_get_tourist_bookings(self, tourist_credentials):
        """Tourist should be able to retrieve their bookings"""
        _token, user_id = self._get_tourist_token_and_ids(tourist_credentials)
        res = client.get(f"/api/tourist/bookings/{user_id}")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_overlapping_booking_rejected(self, tourist_credentials):
        """Creating a booking for the same farm/dates should return 400"""
        _token, user_id = self._get_tourist_token_and_ids(tourist_credentials)
        farms = client.get("/api/farmer/farm-listing").json()
        if not farms:
            pytest.skip("No farm listings available")

        farm_id = farms[0]["id"]
        payload = {
            "booking_type": "farm",
            "farm_id": farm_id,
            "check_in": "2027-06-01",
            "check_out": "2027-06-05",
            "guests": 1,
            "total_price": 0,
        }
        # First booking should succeed
        client.post(f"/api/tourist/booking/{user_id}", json=payload)
        # Second booking for overlapping dates should fail
        res = client.post(f"/api/tourist/booking/{user_id}", json=payload)
        assert res.status_code == 400


class TestInputValidation:
    def test_mobile_max_10_digits_enforced_on_register(self):
        """Mobile > 10 digits should fail schema validation"""
        res = client.post("/api/register", json={
            "full_name": "Too Long Mobile",
            "email": "toolong@example.com",
            "mobile": "98765432101",  # 11 digits — too long
            "password": "Password123!"
        })
        assert res.status_code == 422

    def test_mobile_non_numeric_rejected(self):
        """Mobile with alphabets should fail schema validation (min/max length mismatch)"""
        res = client.post("/api/register", json={
            "full_name": "Alpha Mobile",
            "email": "alpha.mobile@example.com",
            "mobile": "ABCDE12345",  # alphabets
            "password": "Password123!"
        })
        # Backend schema enforces min/max length, so alpha strings of correct length
        # may pass schema but fail business logic or DB. At minimum it should not 200.
        assert res.status_code in (400, 422)

    def test_aadhaar_must_be_12_digits(self, farmer_credentials):
        """Aadhaar shorter than 12 digits should fail"""
        reg = client.post("/api/register", json={
            "full_name": "Aadhaar Short",
            "email": "aadhaar.short@example.com",
            "mobile": "9000000002",
            "password": "TestPass123!"
        })
        if reg.status_code != 200:
            pytest.skip("Registration failed, can't test Aadhaar validation")
        user_id = reg.json()["user_id"]

        res = client.post(f"/api/services/farmer/register/{user_id}", json={
            "profile": {
                "name": "Aadhaar Short",
                "mobile": "9000000002",
                "email": "aadhaar.short@example.com",
                "aadhaar_no": "123",  # Way too short
            }
        })
        assert res.status_code == 422
