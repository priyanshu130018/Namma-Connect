"""FastAPI main application entry point for Namma Connect V2."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.logging import logger, setup_logging
from app.api.health import router as health_router
from app.api.v2.router import api_v2_router

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENV}]")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}")


app = FastAPI(
    title=f"{settings.PROJECT_NAME} V2",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V2_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V2_PREFIX}/docs",
    redoc_url=f"{settings.API_V2_PREFIX}/redoc",
    description="Next-generation agricultural tourism and rural creator service marketplace.",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An internal server error occurred.",
            "error_detail": str(exc) if settings.DEBUG else None,
        },
    )


# Mount health check at root /health
app.include_router(health_router)

# Mount root API V2 router at /api/v2
app.include_router(api_v2_router, prefix=settings.API_V2_PREFIX)
