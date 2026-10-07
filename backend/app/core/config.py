"""Core configuration settings using Pydantic Settings."""

import json
from pathlib import Path
from typing import Dict, List

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class ConfigurationError(RuntimeError):
    """Raised when application configuration is missing, invalid, or violates strict runtime rules."""
    pass

def find_project_root(start_path: Path = None) -> Path:
    """Locate the project root directory by traversing upwards looking for repo markers.
    
    Works reliably both locally from within the repository tree and inside
    Docker container layouts (such as /app/app/core/config.py) without fixed parent indexing.
    """
    if start_path is None:
        start_path = Path(__file__).resolve()
    else:
        start_path = Path(start_path).resolve()

    search_dirs = [start_path] if start_path.is_dir() else [start_path.parent]
    search_dirs.extend(start_path.parents)

    # 1. Look for repository root markers
    for p in search_dirs:
        if (p / "compose.yaml").is_file() or (p / "docker-compose.yml").is_file() or (p / "docker-compose.yaml").is_file():
            return p
        if (p / ".git").is_dir():
            return p
        if (p / ".env").is_file() and (p / "backend").is_dir():
            return p

    # 2. Look for application root boundary (parent of 'app')
    for p in search_dirs:
        if (p / "app" / "core").is_dir():
            return p

    # 3. Fallback safely to nearest plausible root without assuming fixed parent index
    parents = list(start_path.parents)
    if len(parents) >= 3:
        return parents[2]
    elif parents:
        return parents[0]
    return start_path.parent


def find_backend_dir(start_path: Path = None) -> Path:
    """Locate the backend root directory (parent of 'app')."""
    if start_path is None:
        start_path = Path(__file__).resolve()
    else:
        start_path = Path(start_path).resolve()

    search_dirs = [start_path] if start_path.is_dir() else [start_path.parent]
    search_dirs.extend(start_path.parents)

    for p in search_dirs:
        if p.name == "app" and p.is_dir():
            return p.parent
        if (p / "app" / "core").is_dir():
            return p

    parents = list(start_path.parents)
    if len(parents) >= 3:
        return parents[2]
    elif parents:
        return parents[0]
    return start_path.parent


def resolve_env_files(start_path: Path = None) -> tuple:
    """Resolve authoritative .env candidates in priority order without raising IndexError."""
    if start_path is None:
        start_path = Path(__file__).resolve()
    else:
        start_path = Path(start_path).resolve()

    root_dir = find_project_root(start_path)
    backend_dir = find_backend_dir(start_path)

    candidates = []

    # 1. Explicit ENV_FILE environment variable override
    import os
    explicit_env = os.environ.get("ENV_FILE")
    if explicit_env:
        candidates.append(Path(explicit_env).resolve())

    # 2. Authoritative project root .env
    candidates.append(root_dir / ".env")

    # 3. Backend directory fallback .env (if different from root)
    if backend_dir != root_dir:
        candidates.append(backend_dir / ".env")

    # Filter to existing files to avoid unnecessary file handles, or return candidates
    existing = [str(c) for c in candidates if c.is_file()]
    if existing:
        return tuple(existing)
    return tuple(str(c) for c in candidates)


CURRENT_FILE = Path(__file__).resolve()
ROOT_DIR = find_project_root(CURRENT_FILE)
BACKEND_DIR = find_backend_dir(CURRENT_FILE)
ENV_FILES = resolve_env_files(CURRENT_FILE)


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
    # Media Storage & Cloudinary
    # ==========================================================================

    MEDIA_STORAGE: str = "cloudinary"
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_FOLDER: str = "namma-connect"
    CLOUDINARY_UPLOAD_PRESET: str = "namma-connect"


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
    RESEND_FROM_EMAIL: str = "notifications@nammaconnect.in"
    RESEND_API_URL: str = "https://api.resend.com/emails"

    # ==========================================================================
    # Translation & Gemini AI
    # ==========================================================================

    GEMINI_API_KEY: str = ""
    GEMINI_API_URL: str = "https://generativelanguage.googleapis.com/v1beta/models"
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"


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
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_strict_configuration(self) -> "Settings":
        """Strictly validate environment configuration and enforce zero silent fallbacks for secrets."""
        # 1. Environment validation
        env_normalized = (self.ENV or "development").strip().lower()
        if env_normalized not in ["development", "staging", "production", "test", "testing"]:
            raise ConfigurationError(
                f"Invalid ENV '{self.ENV}'. Must be one of: development, staging, production, test."
            )
        self.ENV = env_normalized

        is_test = env_normalized in ["test", "testing"]

        # 2. Derive DATABASE_SYNC_URL from components if not directly provided
        if not self.DATABASE_SYNC_URL and self.POSTGRES_USER and self.POSTGRES_PASSWORD and self.POSTGRES_HOST and self.POSTGRES_DB:
            port = self.POSTGRES_PORT or "5432"
            self.DATABASE_SYNC_URL = f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{port}/{self.POSTGRES_DB}"

        # 3. Synchronize sync and async database connection URLs
        if self.DATABASE_SYNC_URL:
            derived_async = (
                self.DATABASE_SYNC_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
                if self.DATABASE_SYNC_URL.startswith("postgresql://")
                else self.DATABASE_SYNC_URL.replace("postgres://", "postgresql+asyncpg://", 1)
                if self.DATABASE_SYNC_URL.startswith("postgres://")
                else self.DATABASE_SYNC_URL
            )
            # Keep async DATABASE_URL consistent whenever DATABASE_SYNC_URL is provided
            if not self.DATABASE_URL or not self.DATABASE_URL.startswith("postgresql+asyncpg://") or (
                "@" in self.DATABASE_SYNC_URL and "@" in self.DATABASE_URL and self.DATABASE_SYNC_URL.split("@")[-1] != self.DATABASE_URL.split("@")[-1]
            ):
                self.DATABASE_URL = derived_async
        elif self.DATABASE_URL and not self.DATABASE_SYNC_URL:
            if self.DATABASE_URL.startswith("postgresql+asyncpg://"):
                self.DATABASE_SYNC_URL = self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
            else:
                self.DATABASE_SYNC_URL = self.DATABASE_URL

        # 4. Enforce strict requirements in non-test runtime environments
        if not is_test:
            # Database URL checks
            if not self.DATABASE_SYNC_URL or not self.DATABASE_SYNC_URL.strip():
                raise ConfigurationError(
                    "Missing required environment variable: DATABASE_SYNC_URL (or DATABASE_URL). PostgreSQL is required."
                )
            if self.DATABASE_SYNC_URL.startswith("sqlite"):
                raise ConfigurationError(
                    "SQLite is strictly prohibited for application runtime. PostgreSQL is required for NammaConnect V2."
                )
            if not (self.DATABASE_SYNC_URL.startswith("postgresql://") or self.DATABASE_SYNC_URL.startswith("postgres://")):
                raise ConfigurationError(
                    "DATABASE_SYNC_URL is invalid: must be a valid PostgreSQL connection URL (e.g. postgresql://user:pass@host:5432/dbname)."
                )

            # Security / JWT Secret checks
            if not self.JWT_SECRET or not self.JWT_SECRET.strip():
                raise ConfigurationError(
                    "Missing required environment variable: JWT_SECRET."
                )
            if len(self.JWT_SECRET.strip()) < 32:
                raise ConfigurationError(
                    f"Insecure JWT_SECRET: Secret length ({len(self.JWT_SECRET.strip())}) is less than the required minimum of 32 characters."
                )

            # JWT Algorithm check
            if not self.JWT_ALGORITHM or not self.JWT_ALGORITHM.strip():
                self.JWT_ALGORITHM = "HS256"
        else:
            # Test environment defaults
            if not self.JWT_SECRET or not self.JWT_SECRET.strip():
                self.JWT_SECRET = "test_ci_jwt_secret_must_be_32_characters_long"
            if not self.JWT_ALGORITHM or not self.JWT_ALGORITHM.strip():
                self.JWT_ALGORITHM = "HS256"

        # 5. Numeric configuration validations
        if self.ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
            raise ConfigurationError("ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer.")
        if self.REFRESH_TOKEN_EXPIRE_DAYS <= 0:
            raise ConfigurationError("REFRESH_TOKEN_EXPIRE_DAYS must be a positive integer.")

        # 6. Redis URL validation if provided
        if self.REDIS_URL and self.REDIS_URL.strip():
            r_url = self.REDIS_URL.strip()
            if not (r_url.startswith("redis://") or r_url.startswith("rediss://")):
                raise ConfigurationError("REDIS_URL is invalid: must start with redis:// or rediss://")
            if "redis://redis:" in r_url:
                import socket
                try:
                    socket.gethostbyname("redis")
                except socket.gaierror:
                    self.REDIS_URL = r_url.replace("redis://redis:", "redis://localhost:", 1)

        return self

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

            "translation": bool(self.GEMINI_API_KEY),
            "gemini": bool(self.GEMINI_API_KEY),

            "tomtom": bool(self.TOMTOM_API_KEY),
        }


# ==========================================================================
# Global settings instance
# ==========================================================================

settings = Settings()