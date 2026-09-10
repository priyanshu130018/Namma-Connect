"""Centralized typed feature flags for NammaConnect V2."""

import os
from typing import Dict
from app.core.config import settings

# Default feature flags configuration
DEFAULT_FEATURE_FLAGS: Dict[str, bool] = {
    "realtime_chat": True,
    "travel_ai": True,
    "new_checkout": True,
    "creator_collaborations": True,
    "sms_notifications": False,
    "dark_mode": True,
    "kannada_localization": True,
}


def is_feature_enabled(flag_name: str, default: bool = True) -> bool:
    """Evaluate whether a feature flag is enabled via ENV override or default."""
    env_key = f"FEATURE_{flag_name.upper()}"
    env_val = os.getenv(env_key)
    if env_val is not None:
        return env_val.strip().lower() in ["1", "true", "yes", "enabled", "on"]
    return DEFAULT_FEATURE_FLAGS.get(flag_name, default)
