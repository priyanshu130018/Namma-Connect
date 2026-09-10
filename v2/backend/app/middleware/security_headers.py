"""Security headers middleware for NammaConnect V2."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware attaching essential web security headers.
    
    Compatible with:
    - Razorpay Checkout modal
    - Cloudinary media CDN
    - Google OAuth 2.0
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Baseline protective headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # HSTS only in HTTPS / production environments
        if settings.ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response
