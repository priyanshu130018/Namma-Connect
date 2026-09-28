"""Health check and operational observability endpoints."""

import time
from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.schemas.common import HealthResponse
from app.core.config import settings
from app.core.database import get_db
from app.services.redis_service import RedisService

router = APIRouter(tags=["Health"])

START_TIME = time.time()


@router.get("/health/live")
async def liveness_probe():
    """Kubernetes / Docker liveness probe: verifies process is alive."""
    return {
        "status": "alive",
        "timestamp": time.time(),
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "version": settings.VERSION,
    }


@router.get("/health/ready")
async def readiness_probe(response: Response, db: Session = Depends(get_db)):
    """Kubernetes / Docker readiness probe: verifies database & redis connectivity."""
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    redis_client = RedisService.get_client()
    redis_ok = False
    if redis_client:
        try:
            redis_ok = redis_client.ping()
        except Exception:
            redis_ok = False

    is_ready = db_ok  # PostgreSQL is authoritative; Redis fallback is permissible
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if is_ready else "not_ready",
        "database": "connected" if db_ok else "disconnected",
        "redis": "connected" if redis_ok else "degraded",
        "version": settings.VERSION,
        "environment": settings.ENV,
    }


@router.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """General health check endpoint returning service & integration status."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    redis_client = RedisService.get_client()
    redis_status = "connected" if redis_client else "memory_fallback"

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


@router.get("/metrics")
async def operational_metrics(db: Session = Depends(get_db)):
    """Operational monitoring metrics endpoint (safe, zero secret exposure)."""
    uptime = round(time.time() - START_TIME, 2)
    return {
        "version": settings.VERSION,
        "environment": settings.ENV,
        "uptime_seconds": uptime,
        "memory_mode": settings.ENV != "production",
        "active_modules_count": 15,
        "supported_locales": ["en", "kn"],
        "rate_limiting_enabled": True,
    }

