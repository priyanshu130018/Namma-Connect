"""Rate limiting core implementation for NammaConnect V2."""

import time
from typing import Optional
from fastapi import Request, HTTPException, status
from app.services.redis_service import RedisService
from app.core.logging import logger


class RateLimiter:
    """Sliding window counter rate limiter with Redis and in-memory fallback."""

    _in_memory_buckets = {}

    @classmethod
    def is_rate_limited(
        cls,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> bool:
        """Check if request count exceeds max_requests within window_seconds."""
        now = time.time()
        client = RedisService.get_client()

        if client:
            try:
                pipeline = client.pipeline()
                full_key = f"ratelimit:{key}"
                pipeline.zremrangebyscore(full_key, 0, now - window_seconds)
                pipeline.zcard(full_key)
                pipeline.zadd(full_key, {str(now): now})
                pipeline.expire(full_key, window_seconds + 5)
                results = pipeline.execute()

                current_count = results[1]
                if current_count >= max_requests:
                    return True
                return False
            except Exception as e:
                logger.debug("Redis rate limit error (%s), falling back to in-memory counter", e)

        # In-memory sliding window fallback
        timestamps = cls._in_memory_buckets.get(key, [])
        cutoff = now - window_seconds
        timestamps = [ts for ts in timestamps if ts > cutoff]

        if len(timestamps) >= max_requests:
            cls._in_memory_buckets[key] = timestamps
            return True

        timestamps.append(now)
        cls._in_memory_buckets[key] = timestamps
        return False


def rate_limit(
    max_requests: int = 60,
    window_seconds: int = 60,
    key_prefix: str = "general",
):
    """FastAPI dependency factory for route rate limiting."""
    def dependency(request: Request):
        # Exemption: Razorpay webhooks must never be blocked incorrectly
        if request.url.path.endswith("/payments/webhook"):
            return

        forwarded_for = request.headers.get("x-forwarded-for")
        ip = forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else "unknown")
        
        user_id = getattr(request.state, "user_id", None)
        identifier = f"user:{user_id}" if user_id else f"ip:{ip}"
        rate_key = f"{key_prefix}:{identifier}"

        if RateLimiter.is_rate_limited(rate_key, max_requests=max_requests, window_seconds=window_seconds):
            logger.warning("Rate limit exceeded for %s on %s %s", rate_key, request.method, request.url.path)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down and try again later.",
                headers={"Retry-After": str(window_seconds)},
            )

    return dependency
