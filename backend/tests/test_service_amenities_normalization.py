"""Regression tests for Service Amenities Normalization.

Verifies:
1. List amenities
2. Structured dict amenities
3. Category-specific data preservation in specific_details
4. Empty amenities ([], {}, "")
5. Malformed/null amenities
6. Pydantic ServiceResponse model validation
7. GET /api/v2/services endpoint stability
"""

import json
import pytest
from fastapi.testclient import TestClient
from app.schemas.service import normalize_amenities, ServiceResponse


def test_normalize_amenities_list():
    """1. Standard list of strings."""
    raw = ["Wi-Fi", "Free Parking", "Hot Water"]
    amenities, details = normalize_amenities(raw)
    assert amenities == ["Wi-Fi", "Free Parking", "Hot Water"]
    assert details == {}


def test_normalize_amenities_list_with_mixed_types():
    """List with non-string elements should be stringified cleanly."""
    raw = ["Wi-Fi", 100, None, "   ", "Hot Water"]
    amenities, details = normalize_amenities(raw)
    assert "Wi-Fi" in amenities
    assert "100" in amenities
    assert "Hot Water" in amenities
    assert None not in amenities
    assert "   " not in amenities


def test_normalize_amenities_structured_dict():
    """2. Structured dict amenities with explicit 'amenities' and 'specific_details'."""
    raw = {
        "amenities": ["Trekking Poles", "First Aid"],
        "specific_details": {
            "gear_provided": "Poles and poncho",
            "trail_difficulty": "Moderate",
        },
    }
    amenities, details = normalize_amenities(raw)
    assert amenities == ["Trekking Poles", "First Aid"]
    assert details == {
        "gear_provided": "Poles and poncho",
        "trail_difficulty": "Moderate",
    }


def test_normalize_amenities_dict_with_category_flags():
    """Structured dict with boolean flags and custom attributes."""
    raw = {
        "wifi": True,
        "parking": False,
        "campfire": True,
        "rooms": 4,
        "farm_type": "Organic Coffee",
    }
    amenities, details = normalize_amenities(raw)
    assert "Wifi" in amenities
    assert "Campfire" in amenities
    assert details["parking"] is False
    assert details["rooms"] == 4
    assert details["farm_type"] == "Organic Coffee"


def test_normalize_amenities_empty():
    """3. Empty list, empty dict, empty string, and None."""
    assert normalize_amenities([]) == ([], {})
    assert normalize_amenities({}) == ([], {})
    assert normalize_amenities("") == ([], {})
    assert normalize_amenities("   ") == ([], {})
    assert normalize_amenities(None) == ([], {})


def test_normalize_amenities_json_strings():
    """JSON-encoded list and dict strings."""
    json_list = '["Swimming Pool", "Gym"]'
    amenities, details = normalize_amenities(json_list)
    assert amenities == ["Swimming Pool", "Gym"]
    assert details == {}

    json_dict = json.dumps({
        "amenities": ["Wi-Fi", "Breakfast"],
        "specific_details": {"max_guests": 5},
    })
    amenities, details = normalize_amenities(json_dict)
    assert amenities == ["Wi-Fi", "Breakfast"]
    assert details == {"max_guests": 5}


def test_normalize_amenities_malformed_and_edge_cases():
    """4. Malformed JSON, comma-separated strings, unexpected types."""
    # Comma-separated plain string
    amenities, details = normalize_amenities("Wi-Fi, Free Parking, Hot Water")
    assert amenities == ["Wi-Fi", "Free Parking", "Hot Water"]
    assert details == {}

    # Malformed JSON string
    amenities, details = normalize_amenities("{not valid json")
    assert isinstance(amenities, list)
    assert len(amenities) == 1
    assert details == {}

    # Non-container scalar
    amenities, details = normalize_amenities(42)
    assert amenities == ["42"]
    assert details == {}


def test_service_response_pydantic_validation_with_dict():
    """ServiceResponse model accepts dictionary amenities without ValidationError."""
    payload = {
        "id": "srv-123",
        "title": "Coorg Plantation Stay",
        "slug": "coorg-plantation-stay",
        "description": "Authentic rural experience amidst coffee plantations.",
        "category": "Farm Tours",
        "category_slug": "farm-tours",
        "location": "Madikeri",
        "district": "Kodagu",
        "state": "Karnataka",
        "price": 2500.0,
        "unit": "night",
        "rating": 4.8,
        "reviews_count": 12,
        "is_verified": True,
        "status": "PUBLISHED",
        "provider_name": "Ramesh Gowda",
        "provider_type": "Farmer",
        "primary_image": "https://example.com/coorg.jpg",
        "amenities": {
            "amenities": ["Wi-Fi", "Farm Breakfast"],
            "specific_details": {"plantation_size_acres": 25},
        },
    }
    response = ServiceResponse.model_validate(payload)
    assert isinstance(response.amenities, list)
    assert response.amenities == ["Wi-Fi", "Farm Breakfast"]
    assert response.specific_details == {"plantation_size_acres": 25}


def test_get_services_endpoint_returns_200(client: TestClient):
    """GET /api/v2/services returns HTTP 200 with normalized amenities across all items."""
    resp = client.get("/api/v2/services")
    assert resp.status_code == 200
    data = resp.json()["data"]
    for srv in data.get("services", []):
        assert isinstance(srv["amenities"], list)
        for item in srv["amenities"]:
            assert isinstance(item, str)
