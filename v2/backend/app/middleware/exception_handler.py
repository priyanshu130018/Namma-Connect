"""Centralized global exception handling middleware and response normalizers."""

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.exceptions import AppException
from app.core.logging import logger
from app.core.config import settings


def register_exception_handlers(app: FastAPI):
    """Register centralized, sanitized exception handlers on the FastAPI app."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        req_id = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "detail": exc.message,
                "message": exc.message,
                "error_code": exc.error_code,
                "request_id": req_id,
                "details": exc.details if settings.DEBUG else None,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "request_id": req_id,
                    "details": exc.details if settings.DEBUG else None,
                },
            },
        )

    @app.exception_handler(StarletteHTTPException)
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        req_id = getattr(request.state, "request_id", None)
        message = exc.detail if isinstance(exc.detail, str) else "Request error occurred."
        code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "VALIDATION_ERROR",
            429: "RATE_LIMITED",
            500: "SERVER_ERROR",
            503: "SERVICE_UNAVAILABLE",
        }
        code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")
        return JSONResponse(
            status_code=exc.status_code,
            headers=getattr(exc, "headers", None),
            content={
                "success": False,
                "detail": message,
                "message": message,
                "error_code": code,
                "request_id": req_id,
                "error": {
                    "code": code,
                    "message": message,
                    "request_id": req_id,
                    "details": None,
                },
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        req_id = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": "The submitted payload failed validation.",
                "error_code": "VALIDATION_ERROR",
                "request_id": req_id,
                "errors": exc.errors() if settings.DEBUG else None,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Please correct the highlighted fields.",
                    "request_id": req_id,
                    "details": exc.errors() if settings.DEBUG else None,
                },
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        req_id = getattr(request.state, "request_id", None)
        logger.error(
            "[%s] Unhandled exception on %s %s: %s",
            req_id,
            request.method,
            request.url.path,
            exc,
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "An internal server error occurred.",
                "request_id": req_id,
                "error": {
                    "code": "SERVER_ERROR",
                    "message": "Something went wrong. The service is temporarily unavailable.",
                    "request_id": req_id,
                    "details": str(exc) if settings.DEBUG else None,
                },
            },
        )
