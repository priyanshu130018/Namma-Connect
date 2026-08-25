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

    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "namma_connect_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"

    DATABASE_URL: str = ""
    DATABASE_SYNC_URL: str = ""

    @field_validator("DATABASE_SYNC_URL", mode="before")
    @classmethod
    def resolve_database_sync_url(cls, value, values):
        import os
        from urllib.parse import quote_plus
        
        user = os.getenv("POSTGRES_USER", "postgres")
        raw_pw = os.getenv("POSTGRES_PASSWORD", "")
        # If password is provided, ensure it's properly url-encoded if it contains special characters
        encoded_pw = raw_pw if "%" in raw_pw else quote_plus(raw_pw)
        db_name = os.getenv("POSTGRES_DB", "namma_connect_db")
        host = os.getenv("POSTGRES_HOST", "localhost")
        port = os.getenv("POSTGRES_PORT", "5432")

        if not value or not isinstance(value, str) or not value.strip():
            pw_part = f":{encoded_pw}" if encoded_pw else ""
            return f"postgresql://{user}{pw_part}@{host}:{port}/{db_name}"

        url = value.strip()
        # Replace template placeholders if they exist in the env string
        url = url.replace("POSTGRES_USER", user)
        if "POSTGRES_PASSWORD" in url:
            url = url.replace("POSTGRES_PASSWORD", encoded_pw)
        if "POSTGRES_DB" in url:
            url = url.replace("POSTGRES_DB", db_name)
        return url

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def resolve_database_async_url(cls, value, values):
        import os
        from urllib.parse import quote_plus

        user = os.getenv("POSTGRES_USER", "postgres")
        raw_pw = os.getenv("POSTGRES_PASSWORD", "")
        encoded_pw = raw_pw if "%" in raw_pw else quote_plus(raw_pw)
        db_name = os.getenv("POSTGRES_DB", "namma_connect_db")
        host = os.getenv("POSTGRES_HOST", "localhost")
        port = os.getenv("POSTGRES_PORT", "5432")

        if not value or not isinstance(value, str) or not value.strip():
            pw_part = f":{encoded_pw}" if encoded_pw else ""
            return f"postgresql+asyncpg://{user}{pw_part}@{host}:{port}/{db_name}"

        url = value.strip()
        url = url.replace("POSTGRES_USER", user)
        if "POSTGRES_PASSWORD" in url:
            url = url.replace("POSTGRES_PASSWORD", encoded_pw)
        if "POSTGRES_DB" in url:
            url = url.replace("POSTGRES_DB", db_name)
        return url

    # ==========================================================================
    # Redis
    # ==========================================================================

    REDIS_URL: str = "redis://localhost:6379/0"

    # ==========================================================================
    # Security / JWT
    # ==========================================================================

    JWT_SECRET: str = (
        "namma_connect_v2_development_jwt_secret_key_"
        "change_in_production_32b"
    )

    JWT_ALGORITHM: str = "HS256"

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
        }


# ==========================================================================
# Global settings instance
# ==========================================================================

settings = Settings()