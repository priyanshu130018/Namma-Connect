"""Unit and API integration tests for TomTom Location Services, Geocoding, Routing, and Places Search."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.services.location import LocationService
from app.models.service import Service
from app.schemas.service import ServiceCreatePayload
from app.services.marketplace import MarketplaceService
from app.models.user import User

client = TestClient(app)


def test_location_service_geocode_fallback():
    """Verify geocoding returns valid coordinates and fallback registry data."""
    res = LocationService.geocode_location("Madikeri Coorg Homestay")
    assert res["lat"] == 12.3375
    assert res["lon"] == 75.8069
    assert "Coorg" in res["display_name"]
    assert "provider" in res


def test_location_service_reverse_geocode_fallback():
    """Verify reverse geocoding fallback for lat/lon coordinates."""
    res = LocationService.reverse_geocode(12.3375, 75.8069)
    assert res["lat"] == 12.3375
    assert res["lon"] == 75.8069
    assert "display_name" in res


def test_location_service_route_fallback():
    """Verify routing fallback calculates distance, travel time, and route points."""
    # From Bengaluru (12.9716, 77.5946) to Mysore (12.2958, 76.6394)
    res = LocationService.calculate_route(
        origin_lat=12.9716,
        origin_lon=77.5946,
        dest_lat=12.2958,
        dest_lon=76.6394,
        travel_mode="car",
    )
    assert res["success"] is True
    assert res["distance_km"] > 100
    assert res["duration_minutes"] > 60
    assert len(res["route_points"]) >= 2


def test_location_service_places_search():
    """Verify places search returns matching fallback clusters or places."""
    results = LocationService.search_places("Chikmagalur")
    assert len(results) > 0
    assert "Chikmagalur" in results[0]["name"] or "Chikmagalur" in results[0]["formatted_address"]


def test_location_api_endpoints():
    """Verify FastAPI GET /api/v2/location/* endpoints."""
    # 1. Geocode endpoint
    g_resp = client.get("/api/v2/location/geocode?q=Wayanad")
    assert g_resp.status_code == 200
    g_data = g_resp.json()["data"]
    assert g_data["lat"] == 11.6854

    # 2. Reverse Geocode endpoint
    rg_resp = client.get("/api/v2/location/reverse-geocode?lat=12.2958&lon=76.6394")
    assert rg_resp.status_code == 200
    rg_data = rg_resp.json()["data"]
    assert rg_data["lat"] == 12.2958

    # 3. Route endpoint
    r_resp = client.get("/api/v2/location/route?origin_lat=12.9716&origin_lon=77.5946&dest_lat=12.3375&dest_lon=75.8069")
    assert r_resp.status_code == 200
    r_data = r_resp.json()["data"]
    assert r_data["distance_km"] > 0

    # 4. Search endpoint
    s_resp = client.get("/api/v2/location/search?q=Coorg")
    assert s_resp.status_code == 200
    s_data = s_resp.json()["data"]
    assert len(s_data) > 0


def test_service_location_fields_persistence(db_session: Session):
    """Verify latitude, longitude, and formatted_address persist in Service model."""
    provider = db_session.query(User).filter(User.role == "partner").first()
    if not provider:
        provider = User(
            email="test_partner_loc@nammaconnect.in",
            full_name="Location Test Partner",
            role="partner",
            is_active=True,
            is_verified=True,
        )
        db_session.add(provider)
        db_session.commit()

    payload = ServiceCreatePayload(
        title="Test TomTom Location Villa",
        description="A beautiful stay with exact TomTom coordinates.",
        category="Stay",
        location="Madikeri, Coorg, Karnataka",
        latitude=12.3375,
        longitude=75.8069,
        formatted_address="Madikeri, Coorg, Karnataka 571201, India",
        price=3500.0,
    )

    created = MarketplaceService.create_partner_service(db_session, provider, payload)
    assert created.latitude == 12.3375
    assert created.longitude == 75.8069
    assert created.formatted_address == "Madikeri, Coorg, Karnataka 571201, India"

    # Verify query from database
    db_service = db_session.query(Service).filter(Service.id == created.id).first()
    assert db_service.latitude == 12.3375
    assert db_service.longitude == 75.8069
    assert db_service.formatted_address == "Madikeri, Coorg, Karnataka 571201, India"
