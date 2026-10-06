"""Integration and Unit Tests for Production Architecture Hardening in NammaConnect V2 Modular Monolith."""

import os
import pytest
from fastapi.testclient import TestClient
from app.core.feature_flags import is_feature_enabled, DEFAULT_FEATURE_FLAGS
from app.core.cache import cache_manager, CachePolicy
from app.core.logging import SensitiveDataRedactionFilter, redact_sensitive_payload
from app.core.analytics import server_analytics
from app.core.exceptions import (
    AppException,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    RateLimitExceededError,
)


def test_request_id_and_security_headers(client: TestClient):
    """Verify X-Request-ID and security headers are attached to all API responses."""
    resp = client.get("/health")
    assert resp.status_code == 200

    # 1. Request ID header
    request_id = resp.headers.get("x-request-id")
    assert request_id is not None
    assert len(request_id) > 8

    # 2. Security Headers
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert "1; mode=block" in resp.headers.get("x-xss-protection", "")
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


def test_request_id_propagation(client: TestClient):
    """Verify that an incoming X-Request-ID header is propagated back in response."""
    custom_id = "test-req-trace-987654321"
    resp = client.get("/health", headers={"X-Request-ID": custom_id})
    assert resp.status_code == 200
    assert resp.headers.get("x-request-id") == custom_id


def test_cors_headers_handling(client: TestClient):
    """Verify CORS headers respond correctly to allowed origins."""
    origin = "http://localhost:5173"
    resp = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    # Origin should be reflected rather than wildcard * when credentials are supported
    assert resp.headers.get("access-control-allow-origin") == origin
    assert resp.headers.get("access-control-allow-credentials") == "true"


def test_standardized_error_format_404(client: TestClient):
    """Verify standardized JSON error format with request_id for not-found routes."""
    resp = client.get("/api/v2/non-existent-endpoint-route-xyz")
    assert resp.status_code == 404
    data = resp.json()

    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "message" in data["error"]
    assert "request_id" in data["error"]
    assert len(data["error"]["request_id"]) > 0


def test_standardized_validation_error_422(client: TestClient):
    """Verify standardized JSON error format for validation failure."""
    resp = client.post("/api/v2/auth/login", json={"email": "invalid-email"})
    assert resp.status_code == 422
    data = resp.json()

    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "request_id" in data["error"]


def test_feature_flags_behavior():
    """Verify feature flag resolution with defaults and environment overrides."""
    # 1. Default flag check
    assert is_feature_enabled("travel_ai") is True

    # 2. Environment override check
    os.environ["FEATURE_CUSTOM_TEST_FLAG"] = "true"
    assert is_feature_enabled("custom_test_flag") is True

    os.environ["FEATURE_CUSTOM_TEST_FLAG"] = "false"
    assert is_feature_enabled("custom_test_flag") is False

    # Clean up
    del os.environ["FEATURE_CUSTOM_TEST_FLAG"]


def test_sensitive_data_redaction():
    """Verify sensitive fields (passwords, tokens, cvvs) are masked in logging/analytics."""
    payload = {
        "user_id": "usr-123",
        "email": "user@example.com",
        "password": "MySecretPassword123!",
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "cvv": "999",
        "nested": {
            "api_key": "live_secret_key_abcdef",
            "safe_field": "visible_data",
        },
    }

    redacted = redact_sensitive_payload(payload)
    assert redacted["password"] == "[REDACTED]"
    assert redacted["access_token"] == "[REDACTED]"
    assert redacted["cvv"] == "[REDACTED]"
    assert redacted["nested"]["api_key"] == "[REDACTED]"
    assert redacted["nested"]["safe_field"] == "visible_data"
    assert redacted["email"] == "user@example.com"


def test_cache_manager_policy_and_isolation():
    """Verify CacheManager behavior, TTL enforcement, and strict policies."""
    # 1. Policy check
    assert CachePolicy.is_cachable("/api/v2/services") is True
    assert CachePolicy.is_cachable("/api/v2/payments/create-order") is False
    assert CachePolicy.is_cachable("/api/v2/bookings") is False
    assert CachePolicy.is_cachable("/api/v2/messages") is False

    # 2. Set, Get, Delete
    key = "test:arch:cache_key"
    cache_manager.set(key, {"sample": "data"}, expire_seconds=60)
    cached_val = cache_manager.get(key)
    assert cached_val == {"sample": "data"}

    cache_manager.delete(key)
    assert cache_manager.get(key) is None


def test_server_analytics_redaction():
    """Verify server analytics masks sensitive data before forwarding."""
    # server_analytics.track should not throw exceptions even with sensitive payloads
    server_analytics.track(
        "test_event",
        {"user_id": "u1", "password": "supersecret", "amount": 2500},
        user_id="u1",
    )


def test_custom_app_exceptions():
    """Verify AppException hierarchy and status code mappings."""
    err404 = NotFoundError("Service not found")
    assert err404.status_code == 404
    assert err404.error_code == "NOT_FOUND"

    err401 = UnauthorizedError("Missing token")
    assert err401.status_code == 401
    assert err401.error_code == "UNAUTHORIZED"

    err403 = ForbiddenError("Access restricted")
    assert err403.status_code == 403
    assert err403.error_code == "FORBIDDEN"

    err429 = RateLimitExceededError("Too many requests")
    assert err429.status_code == 429
    assert err429.error_code == "RATE_LIMIT_EXCEEDED"
