
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from main import app

TEST_DB_URL = "sqlite:///./test_app.db"
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

class TestRegistration:
    def test_register_tourist_success(self, tourist_credentials):
        res = client.post("/api/auth/register", json=tourist_credentials)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["role"] == "tourist"
        assert data["access_token"]

    def test_register_duplicate_email_fails(self, tourist_credentials):
        res = client.post("/api/auth/register", json=tourist_credentials)
        assert res.status_code == 400

    def test_register_with_short_mobile_fails(self):
        res = client.post("/api/auth/register", json={
            "full_name": "Short Mobile",
            "email": "short.mobile@example.com",
            "mobile": "12345",
            "password": "Password123!"
        })
        assert res.status_code == 422

    def test_register_with_invalid_email_fails(self):
        res = client.post("/api/auth/register", json={
            "full_name": "Bad Email User",
            "email": "not-an-email",
            "mobile": "9876543210",
            "password": "Password123!"
        })
        assert res.status_code == 422

class TestLogin:
    def test_login_with_email_success(self, tourist_credentials):
        res = client.post("/api/auth/login", json={
            "identifier": tourist_credentials["email"],
            "password": tourist_credentials["password"]
        })
        assert res.status_code == 200

    def test_login_with_mobile_success(self, tourist_credentials):
        res = client.post("/api/auth/login", json={
            "identifier": tourist_credentials["mobile"],
            "password": tourist_credentials["password"]
        })
        assert res.status_code == 200

class TestFarmerRegistration:
    def test_register_as_farmer(self, farmer_credentials):
        reg = client.post("/api/auth/register", json=farmer_credentials)
        assert reg.status_code == 200

        login_res = client.post("/api/auth/login", json={
            "identifier": farmer_credentials["email"],
            "password": farmer_credentials["password"]
        })
        token = login_res.json()["access_token"]

        farmer_payload = {
            "type": "farmer",
            "farmer_details": {
                "name": "Test Farmer",
                "mobile": "9123456780",
                "email": farmer_credentials["email"],
                "aadhaar_no": "123456789012",
                "state": "Karnataka",
                "country": "India",
            }
        }
        res = client.post("/api/applications", json=farmer_payload, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        app_id = res.json()["id"]

        # Admin verify
        client.post("/api/auth/register", json={"full_name": "Admin", "email": "admin_unique_flows@nammaconnect.com", "mobile": "1111111199", "password": "Admin123!"})
        admin_login = client.post("/api/auth/login", json={"identifier": "admin_unique_flows@nammaconnect.com", "password": "Admin123!"})
        admin_token = admin_login.json()["access_token"]
        v_res = client.patch(f"/api/admin/applications/{app_id}", json={"status": "approved"}, headers={"Authorization": f"Bearer {admin_token}"})
        assert v_res.status_code == 200

        # Login again to check role
        re_login = client.post("/api/auth/login", json={
            "identifier": farmer_credentials["email"],
            "password": farmer_credentials["password"]
        })
        assert re_login.json()["role"] == "farmer"

    def test_farmer_login_returns_farmer_role(self, farmer_credentials):
        res = client.post("/api/auth/login", json={
            "identifier": farmer_credentials["email"],
            "password": farmer_credentials["password"]
        })
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "farmer"

    def test_farmer_profile_invalid_aadhaar_size(self, farmer_credentials):
        reg = client.post("/api/auth/register", json={
            "full_name": "Aadhaar Test",
            "email": "aadhaar.test@example.com",
            "mobile": "9000000001",
            "password": "TestPass123!"
        })
        login_res = client.post("/api/auth/login", json={
            "identifier": "aadhaar.test@example.com",
            "password": "TestPass123!"
        })
        token = login_res.json()["access_token"]
        
        bad_payload = {
            "type": "farmer",
            "documents": [{"document_type": "aadhaar", "document_number": "12345678901"}]
        }
        res = client.post("/api/applications", json=bad_payload, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 422

class TestBookingFlow:
    def _get_tourist_token_and_ids(self, credentials):
        res = client.post("/api/auth/login", json={
            "identifier": credentials["email"],
            "password": credentials["password"]
        })
        data = res.json()
        return data["access_token"], data["user_id"]

    def test_booking_creates_with_pending_status(self, tourist_credentials, farmer_credentials):
        token, user_id = self._get_tourist_token_and_ids(tourist_credentials)
        res_farms = client.get("/api/farms").json()
        farms = res_farms.get("data", res_farms) if isinstance(res_farms, dict) else res_farms
        if not farms:
            pytest.skip("No farm listings available")

        farm_id = farms[0]["id"]
        res = client.post("/api/bookings", json={
            "booking_type": "farm",
            "farm_id": farm_id,
            "booking_date": "2027-03-01",
            "check_out": "2027-03-05",
            "guest_count": 2,
            "amount": 0,
        }, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200

    def test_get_tourist_bookings(self, tourist_credentials):
        token, user_id = self._get_tourist_token_and_ids(tourist_credentials)
        res = client.get("/api/bookings", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200

    def test_overlapping_booking_rejected(self, tourist_credentials):
        token, user_id = self._get_tourist_token_and_ids(tourist_credentials)
        res_farms = client.get("/api/farms").json()
        farms = res_farms.get("data", res_farms) if isinstance(res_farms, dict) else res_farms
        if not farms:
            pytest.skip("No farm listings available")

        farm_id = farms[0]["id"]
        payload = {
            "booking_type": "farm",
            "farm_id": farm_id,
            "booking_date": "2027-06-01",
            "check_out": "2027-06-05",
            "guest_count": 1,
            "amount": 0,
        }
        client.post("/api/bookings", json=payload, headers={"Authorization": f"Bearer {token}"})
        res = client.post("/api/bookings", json=payload, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 400

class TestInputValidation:
    def test_mobile_max_10_digits_enforced_on_register(self):
        res = client.post("/api/auth/register", json={
            "full_name": "Too Long Mobile",
            "email": "toolong@example.com",
            "mobile": "98765432101",
            "password": "Password123!"
        })
        assert res.status_code == 422

    def test_mobile_non_numeric_rejected(self):
        res = client.post("/api/auth/register", json={
            "full_name": "Alpha Mobile",
            "email": "alpha.mobile@example.com",
            "mobile": "ABCDE12345",
            "password": "Password123!"
        })
        assert res.status_code in (400, 422)

    def test_aadhaar_must_be_12_digits(self, farmer_credentials):
        reg = client.post("/api/auth/register", json={
            "full_name": "Aadhaar Short",
            "email": "aadhaar.short@example.com",
            "mobile": "9000000002",
            "password": "TestPass123!"
        })
        login_res = client.post("/api/auth/login", json={
            "identifier": "aadhaar.short@example.com",
            "password": "TestPass123!"
        })
        token = login_res.json()["access_token"]

        res = client.post("/api/applications", json={
            "type": "farmer",
            "documents": [{"document_type": "aadhaar", "document_number": "123"}]
        }, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 422
