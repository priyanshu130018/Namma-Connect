"""Centralized Redis & In-Memory caching abstraction for NammaConnect V2."""

import json
from typing import Any, Optional
from app.core.config import settings
from app.core.logging import logger
from app.services.redis_service import RedisService


class CacheManager:
    """Domain cache manager unifying Redis and memory fallback.
    
    Standard suggested TTL:
    - Search suggestions & public catalog: 3600 seconds (1 hour)
    - Metadata / configs: 1800 seconds (30 mins)
    - Short-lived items: 300 seconds (5 mins)
    
    CRITICAL POLICY:
    - DO NOT cache payment status
    - DO NOT cache booking availability with capacity risk
    - DO NOT cache private messages
    """

    DEFAULT_TTL = 3600

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """Retrieve key from Redis or fallback."""
        return RedisService.get(key)

    @classmethod
    def set(cls, key: str, value: Any, expire_seconds: int = DEFAULT_TTL) -> bool:
        """Store key in cache with specified TTL in seconds."""
        return RedisService.set(key, value, expire_seconds=expire_seconds)

    @classmethod
    def delete(cls, key: str) -> bool:
        """Invalidate single cache key."""
        return RedisService.delete(key)

    @classmethod
    def invalidate_prefix(cls, prefix: str) -> bool:
        """Invalidate all keys matching given prefix."""
        client = RedisService.get_client()
        if client:
            try:
                keys = client.keys(f"{prefix}*")
                if keys:
                    client.delete(*keys)
                return True
            except Exception as e:
                logger.debug("Failed to invalidate cache keys by prefix in Redis: %s", e)
        
        # Fallback memory dict purge
        keys_to_delete = [k for k in RedisService._memory_fallback if k.startswith(prefix)]
        for k in keys_to_delete:
            RedisService._memory_fallback.pop(k, None)
        return True


class CachePolicy:
    """Policies governing what can and cannot be cached."""

    UNCACHEABLE_PATH_PREFIXES = (
        "/api/v2/payments",
        "/api/v2/bookings",
        "/api/v2/messages",
        "/api/v2/auth",
    )

    @classmethod
    def is_cachable(cls, path: str) -> bool:
        """Evaluate if an API path is eligible for HTTP caching."""
        for prefix in cls.UNCACHEABLE_PATH_PREFIXES:
            if path.startswith(prefix):
                return False
        return True


cache_manager = CacheManager()

