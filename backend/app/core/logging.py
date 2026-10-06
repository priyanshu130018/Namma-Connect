"""Structured logging configuration with sensitive data redaction for V2."""

import logging
import sys
import re
from app.core.config import settings

SENSITIVE_PATTERNS = [
    re.compile(r'(password["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE),
    re.compile(r'(token["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE),
    re.compile(r'(secret["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE),
    re.compile(r'(cvv["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE),
    re.compile(r'(authorization["\']?\s*[:=]\s*["\'])(Bearer\s+[^"\']+)(["\'])', re.IGNORECASE),
    re.compile(r'(otp["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE),
    re.compile(r'(key["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE),
]


class SensitiveDataRedactionFilter(logging.Filter):
    """Logging filter ensuring passwords, secrets, tokens, and payment data are masked."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            msg = record.msg
            for pattern in SENSITIVE_PATTERNS:
                msg = pattern.sub(r'\1[REDACTED]\3', msg)
            record.msg = msg
        return True


def setup_logging():
    """Configure root and application loggers."""
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(SensitiveDataRedactionFilter())

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[handler],
        force=True,
    )


def redact_sensitive_payload(data):
    """Recursively mask sensitive keys in dicts/lists/strings."""
    if isinstance(data, dict):
        result = {}
        for k, v in data.items():
            k_lower = str(k).lower()
            if any(p in k_lower for p in ["password", "token", "secret", "cvv", "key", "authorization", "otp", "credential"]):
                result[k] = "[REDACTED]"
            else:
                result[k] = redact_sensitive_payload(v)
        return result
    elif isinstance(data, list):
        return [redact_sensitive_payload(item) for item in data]
    elif isinstance(data, str):
        msg = data
        for pattern in SENSITIVE_PATTERNS:
            msg = pattern.sub(r'\1[REDACTED]\3', msg)
        return msg
    return data


logger = logging.getLogger("namma_connect")

