"""Compatibility bridge for rate_limiter -> rate_limit."""

from app.core.rate_limit import RateLimiter, rate_limit

__all__ = ["RateLimiter", "rate_limit"]
