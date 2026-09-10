"""Server-side analytics dispatcher abstraction with sanitized payloads."""

import json
from typing import Dict, Any, Optional
from app.core.logging import logger

SENSITIVE_ANALYTICS_KEYS = {
    "password", "token", "secret", "cvv", "card_number", "otp", "access_token", "refresh_token"
}


class Analytics:
    """Provider-neutral analytics tracking abstraction."""

    @classmethod
    def sanitize(cls, properties: Dict[str, Any]) -> Dict[str, Any]:
        """Strip sensitive fields before tracking."""
        sanitized = {}
        for k, v in properties.items():
            if k.lower() in SENSITIVE_ANALYTICS_KEYS:
                continue
            sanitized[k] = v
        return sanitized

    @classmethod
    def track(
        cls,
        event_name: str,
        properties: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        **kwargs,
    ):
        """Track server-side domain events."""
        props = dict(properties or {})
        if "properties" in kwargs and kwargs["properties"]:
            props.update(kwargs["properties"])
        clean_props = cls.sanitize(props)
        logger.debug(f"[ANALYTICS TRACK] Event: {event_name} | User: {user_id} | Props: {clean_props}")


server_analytics = Analytics()

