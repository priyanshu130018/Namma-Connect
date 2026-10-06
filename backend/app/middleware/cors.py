"""Authoritative CORS configuration middleware setup for NammaConnect V2."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import logger


def setup_cors_middleware(app: FastAPI):
    """Register authoritative CORS middleware with environment-driven origins.
    
    CRITICAL POLICY:
    - Never allow wildcard '*' with allow_credentials=True in production.
    """
    origins = settings.CORS_ORIGINS

    if "*" in origins and settings.ENV == "production":
        logger.warning("Wildcard CORS origin detected in production. Restricting to FRONTEND_URL.")
        origins = [settings.FRONTEND_URL]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
