"""Regression tests for canonical provider router registration.

Verifies:
1. No accidental /api/v2/v2/ routes exist
2. All provider routes have single canonical /api/v2/provider/... paths
3. No duplicate route registrations exist across the application
"""

import pytest
from app.main import app


def _get_all_app_routes(app_instance):
    """Recursively extract all routes from FastAPI app and any included/nested routers."""
    extracted = []
    for r in getattr(app_instance, "routes", []):
        if hasattr(r, "routes"):
            extracted.extend(_get_all_app_routes(r))
        if hasattr(r, "path"):
            extracted.append(r)
    return extracted


def test_no_accidental_v2_v2_routes():
    """Verify that no double-prefixed /v2/v2 routes exist in the application."""
    routes = [r.path for r in _get_all_app_routes(app)]
    v2_v2_routes = [r for r in routes if "/v2/v2" in r or "/api/v2/v2" in r]
    assert v2_v2_routes == [], f"Found accidental double-prefixed routes: {v2_v2_routes}"


def test_canonical_provider_routes_present():
    """Verify key provider routes are registered under /api/v2/provider/... canonically."""
    routes = {r.path for r in _get_all_app_routes(app)}
    expected_canonical_provider_routes = [
        "/api/v2/provider/profile",
        "/api/v2/provider/listings",
        "/api/v2/provider/listings/{listing_id}/availability",
        "/api/v2/provider/bookings",
        "/api/v2/provider/analytics/overview",
        "/api/v2/provider/nc-score",
        "/api/v2/provider/recommendations",
    ]
    for expected in expected_canonical_provider_routes:
        assert expected in routes, f"Canonical provider route missing: {expected}"


def test_no_duplicate_provider_route_methods():
    """Verify each (path, HTTP method) combination in provider routes is unique."""
    seen_endpoints = set()
    duplicates = []
    for r in _get_all_app_routes(app):
        if hasattr(r, "path") and "/provider/" in r.path and hasattr(r, "methods"):
            for method in r.methods:
                pair = (r.path, method)
                if pair in seen_endpoints:
                    duplicates.append(pair)
                else:
                    seen_endpoints.add(pair)
    assert duplicates == [], f"Found duplicate provider route registrations: {duplicates}"
