"""SQLAlchemy 2 database engine and session factory."""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Synchronous engine for migrations & standard requests
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_SYNC_URL else {}

engine = create_engine(
    settings.DATABASE_SYNC_URL,
    echo=settings.DEBUG and settings.ENV == "development",
    connect_args=connect_args,
    pool_pre_ping=True,
)

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
