"""Core configuration settings using Pydantic Settings."""

import json
from pathlib import Path
from typing import Dict, List

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Therefore the unified .env is parents[4] / ".env"

CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parents[2]
ENV_FILE = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # ==========================================================================
    # Application
    # ==========================================================================

    PROJECT_NAME: str = "Namma Connect"
    VERSION: str = "2.0.0"
    ENV: str = "development"
    DEBUG: bool = True
    API_V2_PREFIX: str = "/api/v2"
    FRONTEND_URL: str = "http://localhost:5173"

    # ==========================================================================
    # CORS
    # ==========================================================================

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            value = value.strip()

            if value.startswith("["):
                return json.loads(value)

            return [
                origin.strip()
                for origin in value.split(",")
                if origin.strip()
            ]

        return value

    # ==========================================================================
    # Database Credentials & Connection URLs
    # ==========================================================================

    POSTGRES_USER: str = ""
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = ""
    POSTGRES_HOST: str = ""
    POSTGRES_PORT: str = ""

    DATABASE_URL: str = ""
    DATABASE_SYNC_URL: str = ""

    

    # ==========================================================================
    # Redis
    # ==========================================================================

    REDIS_URL: str = ""

    # ==========================================================================
    # Security / JWT
    # ==========================================================================

    JWT_SECRET: str = (
        ""
        ""
    )

    JWT_ALGORITHM: str = ""

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ==========================================================================
    # Google OAuth 2.0
    # ==========================================================================

    GOOGLE_CLIENT_ID: str = ""

    GOOGLE_CLIENT_SECRET: str = ""

    # ==========================================================================
    # Razorpay
    # ==========================================================================

    RAZORPAY_KEY_ID: str = ""

    RAZORPAY_KEY_SECRET: str = ""

    RAZORPAY_WEBHOOK_SECRET: str = ""

    # ==========================================================================
    # Cloudinary
    # ==========================================================================

    CLOUDINARY_CLOUD_NAME: str = ""

    CLOUDINARY_API_KEY: str = ""

    CLOUDINARY_API_SECRET: str = ""

    # ==========================================================================
    # Resend
    # ==========================================================================

    RESEND_API_KEY: str = Field(
        default="",
        validation_alias=AliasChoices(
            "RESEND_API_KEY",
            "Resend_API_KEY",
            "resend_api_key",
        ),
    )

    # ==========================================================================
    # Gemini
    # ==========================================================================

    GEMINI_API_KEY: str = ""

    # ==========================================================================
    # TomTom Maps & Location Services
    # ==========================================================================

    TOMTOM_API_KEY: str = ""
    TOMTOM_BASE_URL: str = "https://api.tomtom.com"

    # ==========================================================================
    # Recommendation & Vector Search Settings
    # ==========================================================================

    RECOMMENDATION_CANDIDATE_K: int = 20
    RECOMMENDATION_FINAL_K: int = 5
    MIN_RECOMMENDATION_SIMILARITY: float = 0.16
    RECOMMENDATION_SEMANTIC_WEIGHT: float = 0.70
    RECOMMENDATION_CATEGORY_WEIGHT: float = 0.10
    RECOMMENDATION_LOCATION_WEIGHT: float = 0.10
    RECOMMENDATION_AVAILABILITY_WEIGHT: float = 0.05
    RECOMMENDATION_RATING_WEIGHT: float = 0.05

    # ==========================================================================
    # Pydantic Settings
    # ==========================================================================

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ==========================================================================
    # Service Configuration Status
    # ==========================================================================

    def get_configured_services(self) -> Dict[str, bool]:
        """
        Return whether external services are configured.

        This method only returns True/False and never exposes secrets.
        """

        return {
            "postgresql": bool(self.DATABASE_SYNC_URL),
            "redis": bool(self.REDIS_URL),

            "google_auth": bool(self.GOOGLE_CLIENT_ID),
            "google_oauth": bool(self.GOOGLE_CLIENT_ID),

            "razorpay": bool(
                self.RAZORPAY_KEY_ID
                and self.RAZORPAY_KEY_SECRET
            ),

            "cloudinary": bool(
                self.CLOUDINARY_CLOUD_NAME
                and self.CLOUDINARY_API_KEY
                and self.CLOUDINARY_API_SECRET
            ),

            "resend": bool(self.RESEND_API_KEY),

            "gemini": bool(self.GEMINI_API_KEY),

            "tomtom": bool(self.TOMTOM_API_KEY),
        }


# ==========================================================================
# Global settings instance
# ==========================================================================

settings = Settings()