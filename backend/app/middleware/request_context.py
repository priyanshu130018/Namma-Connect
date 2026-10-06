"""Request context and tracing middleware for NammaConnect V2."""

import uuid
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.logging import logger


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Middleware attaching request_id to context and response headers."""

    async def dispatch(self, request: Request, call_next):
        # 1. Read or create X-Request-ID
        request_id = request.headers.get("X-Request-ID") or f"req-{uuid.uuid4().hex[:12]}"
        request.state.request_id = request_id

        start_time = time.time()
        response: Response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)

        # 2. Attach X-Request-ID and timing to response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["Server-Timing"] = f"total;dur={duration_ms}"

        path = request.url.path
        if not path.startswith("/health"):
            logger.info(
                "[%s] %s %s - %s (%sms)",
                request_id,
                request.method,
                path,
                response.status_code,
                duration_ms,
            )

        return response
