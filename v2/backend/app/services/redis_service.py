"""Redis Cache and Key-Value Client for NammaConnect V2."""

import json
from typing import Any, Optional
from app.core.config import settings
from app.core.logging import logger


class RedisService:
    """Service managing Redis connections, distributed caching, and background state."""

    _client = None
    _memory_fallback = {}

    @classmethod
    def get_client(cls):
        """Get or initialize Redis client with graceful memory fallback."""
        if cls._client is None and settings.REDIS_URL:
            try:
                import redis
                cls._client = redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_timeout=2,
                )
                cls._client.ping()
            except Exception as e:
                logger.info(f"Redis connection not available ({e}). Using in-memory fallback cache.")
                cls._client = None
        return cls._client

    @classmethod
    def set(cls, key: str, value: Any, expire_seconds: int = 3600) -> bool:
        """Set key in Redis or in-memory fallback."""
        val_str = json.dumps(value) if not isinstance(value, str) else value
        client = cls.get_client()
        if client:
            try:
                client.setex(key, expire_seconds, val_str)
                return True
            except Exception:
                pass
        cls._memory_fallback[key] = val_str
        return True

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """Get key from Redis or in-memory fallback."""
        client = cls.get_client()
        if client:
            try:
                val = client.get(key)
                if val:
                    try:
                        return json.loads(val)
                    except Exception:
                        return val
            except Exception:
                pass
        raw = cls._memory_fallback.get(key)
        if raw:
            try:
                return json.loads(raw)
            except Exception:
                return raw
        return None

    @classmethod
    def delete(cls, key: str) -> bool:
        """Delete key from Redis and fallback."""
        client = cls.get_client()
        if client:
            try:
                client.delete(key)
            except Exception:
                pass
        cls._memory_fallback.pop(key, None)
        return True