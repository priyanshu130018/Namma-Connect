"""Rate limit middleware dependencies bridge."""

from app.core.rate_limit import RateLimiter, rate_limit

__all__ = ["RateLimiter", "rate_limit"]
