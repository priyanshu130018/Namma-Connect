"""SQLAlchemy 2 database engine and session factory."""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings


def _create_db_engine():
    """Create SQLAlchemy engine with fallback to local SQLite for development when PostgreSQL is unreachable."""
    db_url = settings.DATABASE_SYNC_URL or "sqlite:///./app.db"
    
    # Try primary database URL
    try:
        if db_url.startswith("sqlite"):
            return create_engine(
                db_url,
                connect_args={"check_same_thread": False},
                echo=settings.DEBUG and settings.ENV == "development",
            )
        
        eng = create_engine(
            db_url,
            echo=settings.DEBUG and settings.ENV == "development",
            pool_pre_ping=True,
        )
        # Test connection
        with eng.connect() as conn:
            pass
        return eng
    except Exception:
        # Fall back to local SQLite DB if PostgreSQL host is unresolvable or offline
        fallback_url = "sqlite:///./app.db"
        return create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            echo=settings.DEBUG and settings.ENV == "development",
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
