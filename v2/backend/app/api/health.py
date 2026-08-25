"""Health check endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.schemas.common import HealthResponse
from app.core.config import settings
from app.core.database import get_db
from app.services.redis_service import RedisService

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """System health check endpoint returning live service & external integration status."""
    # Check DB status
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    # Check Redis status
    redis_client = RedisService.get_client()
    redis_status = "connected" if redis_client else "memory_fallback"

    # External services configuration statuses
    services = {
        "database": db_status,
        "redis": redis_status,
        **settings.get_configured_services(),
    }

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        version=settings.VERSION,
        environment=settings.ENV,
        services=services,
    )

