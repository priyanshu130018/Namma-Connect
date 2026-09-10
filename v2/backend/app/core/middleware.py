"""Compatibility bridge for core/middleware -> app/middleware."""

from app.middleware.request_context import RequestContextMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

# Backward compatibility alias
RequestTracingAndSecurityMiddleware = RequestContextMiddleware

__all__ = [
    "RequestContextMiddleware",
    "SecurityHeadersMiddleware",
    "RequestTracingAndSecurityMiddleware",
]
