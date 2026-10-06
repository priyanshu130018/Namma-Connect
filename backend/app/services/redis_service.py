"""Redis Cache and Key-Value Client for NammaConnect V2 with Circuit Breaker resilience."""

import json
import time
from typing import Any, Optional
from app.core.config import settings
from app.core.logging import logger


class RedisService:
    """Service managing Redis connections, distributed caching, and circuit breaker fallback."""

    _client = None
    _memory_fallback = {}
    _circuit_broken_until: float = 0.0
    _cooldown_seconds: float = 30.0

    @classmethod
    def get_client(cls):
        """Get or initialize Redis client with circuit breaker cooldown on failure."""
        now = time.time()
        # Circuit Breaker: During cooldown period, immediately return None without blocking
        if now < cls._circuit_broken_until:
            return None

        if cls._client is None and settings.REDIS_URL:
            try:
                import redis
                client = redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_timeout=0.5,
                    socket_connect_timeout=0.5,
                )
                client.ping()
                cls._client = client
                cls._circuit_broken_until = 0.0
            except Exception as e:
                cls._circuit_broken_until = now + cls._cooldown_seconds
                cls._client = None
                logger.info(f"Redis connection unavailable ({e}). Circuit broken for {cls._cooldown_seconds}s. Using in-memory/DB fallback.")
                return None
        return cls._client

    @classmethod
    def reset_circuit_breaker(cls):
        """Reset circuit breaker state (useful for testing and manual recovery)."""
        cls._client = None
        cls._circuit_broken_until = 0.0

    @classmethod
    def set(cls, key: str, value: Any, expire_seconds: int = 3600, ttl: Optional[int] = None) -> bool:
        """Set key in Redis or in-memory fallback."""
        exp = ttl if ttl is not None else expire_seconds
        val_str = json.dumps(value) if not isinstance(value, str) else value
        client = cls.get_client()
        if client:
            try:
                client.setex(key, exp, val_str)
                return True
            except Exception as e:
                cls._circuit_broken_until = time.time() + cls._cooldown_seconds
                cls._client = None
                logger.warning(f"Redis set failed ({e}). Circuit broken for {cls._cooldown_seconds}s.")
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
            except Exception as e:
                cls._circuit_broken_until = time.time() + cls._cooldown_seconds
                cls._client = None
                logger.warning(f"Redis get failed ({e}). Circuit broken for {cls._cooldown_seconds}s.")

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
            except Exception as e:
                cls._circuit_broken_until = time.time() + cls._cooldown_seconds
                cls._client = None
        cls._memory_fallback.pop(key, None)
        return True

    @classmethod
    def publish(cls, channel: str, message: Any) -> bool:
        """Publish real-time message event via Redis pub/sub or broadcast bus."""
        val_str = json.dumps(message) if not isinstance(message, str) else message
        client = cls.get_client()
        if client:
            try:
                client.publish(channel, val_str)
                return True
            except Exception as e:
                cls._circuit_broken_until = time.time() + cls._cooldown_seconds
                cls._client = None
                logger.debug(f"Redis publish failed: {e}")
        return True