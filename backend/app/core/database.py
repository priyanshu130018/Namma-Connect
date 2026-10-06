"""SQLAlchemy 2 database engine and session factory."""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings


def _create_db_engine():
    """Create SQLAlchemy engine. Strictly enforce PostgreSQL without silent SQLite fallback in application runtime."""
    db_url = settings.DATABASE_SYNC_URL or ""
    is_prod = getattr(settings, "ENV", "development").lower() in ["production", "prod", "staging"]

    # 1. Production Mode: PostgreSQL is strictly mandatory
    if is_prod:
        if not db_url or db_url.startswith("sqlite"):
            raise RuntimeError("PostgreSQL DATABASE_SYNC_URL must be configured in production environment.")
        return create_engine(
            db_url,
            echo=False,
            pool_pre_ping=True,
            pool_size=20,
            max_overflow=10,
        )

    # 2. Test / Explicit SQLite Mode (used for isolated unit testing only)
    if db_url.startswith("sqlite"):
        if getattr(settings, "ENV", "").lower() not in ["test", "testing"]:
            raise RuntimeError("SQLite is strictly prohibited for application runtime. PostgreSQL is required for NammaConnect V2.")
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            echo=False,
        )

    # 3. Development / Standard Mode: PostgreSQL connection without silent SQLite fallback
    if not db_url:
        raise RuntimeError("DATABASE_SYNC_URL must be configured. PostgreSQL is required for NammaConnect V2.")

    return create_engine(
        db_url,
        echo=settings.DEBUG and settings.ENV == "development",
        pool_pre_ping=True,
    )

engine = _create_db_engine()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for yielding database sessions."""
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
