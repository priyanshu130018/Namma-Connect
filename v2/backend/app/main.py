"""FastAPI main application entry point for Namma Connect V2."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.config import settings
from app.core.logging import logger, setup_logging
from app.api.health import router as health_router
from app.api.v2.router import api_v2_router
from app.middleware import (
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
    setup_cors_middleware,
    register_exception_handlers,
)

# Initialize structured logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    logger.info("Starting %s v%s [%s]", settings.PROJECT_NAME, settings.VERSION, settings.ENV)
    try:
        import app.models
        from app.core.database import Base, engine, SessionLocal
        Base.metadata.create_all(bind=engine)

        # Deterministic startup database seeding
        db = SessionLocal()
        try:
            from app.services.marketplace import MarketplaceService
            MarketplaceService.ensure_seeded(db)
        finally:
            db.close()
    except Exception as e:
        logger.warning("Database schema initialization warning: %s", e)
    yield
    logger.info("Shutting down %s", settings.PROJECT_NAME)


# Create monolithic FastAPI application instance
app = FastAPI(
    title=f"{settings.PROJECT_NAME} V2",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V2_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V2_PREFIX}/docs",
    redoc_url=f"{settings.API_V2_PREFIX}/redoc",
    description="Next-generation agricultural tourism and rural creator service marketplace.",
    lifespan=lifespan,
)

# 1. Register Request Context & Security Middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)

# 2. Register Centralized CORS Configuration
setup_cors_middleware(app)

# 3. Register Global Exception Handlers
register_exception_handlers(app)

# 4. Mount API Routers
app.include_router(health_router)
app.include_router(api_v2_router, prefix=settings.API_V2_PREFIX)
