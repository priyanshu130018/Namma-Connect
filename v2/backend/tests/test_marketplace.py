"""Integration tests for Marketplace Catalog, Search, Suggestions, and Service Details."""

import pytest
from fastapi.testclient import TestClient


def test_list_services_returns_published_catalog(client: TestClient):
    """Verify GET /api/v2/services returns published services with pagination."""
    response = client.get("/api/v2/services")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert "services" in data["data"]
    services = data["data"]["services"]
    assert len(services) > 0
    assert data["data"]["total"] >= len(services)

    # Validate schema fields
    first = services[0]
    assert "id" in first
    assert "title" in first
    assert "price" in first
    assert "category" in first
    assert "provider_name" in first
    assert "is_verified" in first
    assert first["status"] == "PUBLISHED"


def test_list_services_category_and_price_filtering(client: TestClient):
    """Verify category and max_price filters work at SQL level."""
    # Filter by Stay category
    response = client.get("/api/v2/services?category=stay")
    assert response.status_code == 200
    data = response.json()["data"]
    for s in data["services"]:
        assert s["category_slug"] == "stay" or "stay" in s["category"].lower()

    # Filter with max_price = 1000
    resp_price = client.get("/api/v2/services?max_price=1000")
    assert resp_price.status_code == 200
    for s in resp_price.json()["data"]["services"]:
        assert s["price"] <= 1000.0


def test_get_service_detail_success_and_404(client: TestClient):
    """Verify GET /api/v2/services/{id} returns full details or 404 for invalid ID."""
    # First get a valid service
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]

    # Fetch detail
    detail_resp = client.get(f"/api/v2/services/{service_id}")
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()["data"]
    assert "service" in detail_data
    assert "reviews" in detail_data
    assert detail_data["service"]["id"] == service_id
    assert len(detail_data["service"]["inclusions"]) > 0
    assert len(detail_data["service"]["amenities"]) > 0

    # Non-existent ID returns 404
    non_existent = client.get("/api/v2/services/00000000-0000-0000-0000-000000000000")
    assert non_existent.status_code == 404


def test_get_service_reviews(client: TestClient):
    """Verify GET /api/v2/services/{id}/reviews returns review list."""
    list_resp = client.get("/api/v2/services")
    service_id = list_resp.json()["data"]["services"][0]["id"]

    reviews_resp = client.get(f"/api/v2/services/{service_id}/reviews")
    assert reviews_resp.status_code == 200
    reviews = reviews_resp.json()["data"]
    assert isinstance(reviews, list)
    if len(reviews) > 0:
        assert "rating" in reviews[0]
        assert "comment" in reviews[0]
        assert "user_name" in reviews[0]


def test_search_services_by_query(client: TestClient):
    """Verify GET /api/v2/search returns matching services."""
    response = client.get("/api/v2/search?q=Coorg")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["query"] == "Coorg"
    assert "results" in data
    assert len(data["results"]) > 0
    assert any("Coorg" in s["title"] or "Coorg" in s["location"] for s in data["results"])


def test_search_suggestions(client: TestClient):
    """Verify GET /api/v2/search/suggestions returns autocomplete items."""
    response = client.get("/api/v2/search/suggestions?q=Coffee")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "suggestions" in data
    assert len(data["suggestions"]) > 0
    assert "title" in data["suggestions"][0]
