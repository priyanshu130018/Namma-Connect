"""Domain exceptions for NammaConnect V2 modular monolith."""

from typing import Optional, Dict, Any


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str = "An application error occurred.",
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class NotFoundError(AppException):
    """Resource not found."""

    def __init__(self, message: str = "Resource not found.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=404, error_code="NOT_FOUND", details=details)


class UnauthorizedError(AppException):
    """Authentication required or failed."""

    def __init__(self, message: str = "Authentication required.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=401, error_code="UNAUTHORIZED", details=details)


class ForbiddenError(AppException):
    """Action forbidden for this user."""

    def __init__(self, message: str = "Access forbidden.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=403, error_code="FORBIDDEN", details=details)


class ConflictError(AppException):
    """Resource state conflict."""

    def __init__(self, message: str = "Resource conflict.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=409, error_code="CONFLICT", details=details)


class ValidationError(AppException):
    """Payload or parameters validation failure."""

    def __init__(self, message: str = "Validation failed.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=422, error_code="VALIDATION_ERROR", details=details)


class RateLimitExceededError(AppException):
    """Rate limit quota exceeded."""

    def __init__(
        self,
        message: str = "Too many requests. Please slow down and try again later.",
        retry_after: int = 60,
        details: Optional[Dict[str, Any]] = None,
    ):
        details = details or {}
        details["retry_after"] = retry_after
        super().__init__(message, status_code=429, error_code="RATE_LIMIT_EXCEEDED", details=details)
        self.retry_after = retry_after
