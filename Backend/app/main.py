from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException

# Initialize logging system
import app.core.logger

from app.routes import (
    auth, users, farms, bookings, payments, activities, 
    collaborations, admin, ai, media, webhook, applications, reviews
)
from app.utils.exceptions import http_exception_handler, validation_exception_handler, sqlalchemy_exception_handler

app = FastAPI(
    title="Namma Gig API",
    description="Refactored modular Backend API for Namma Gig - agri-tourism platform",
    version="2.0.0"
)

# Register Global Exception Handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)

# CORS configuration
import os

cors_origins_env = os.getenv("ALLOWED_ORIGINS")
if cors_origins_env:
    origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
else:
    origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.core.middleware import ResponseStandardizerMiddleware
app.add_middleware(ResponseStandardizerMiddleware)

# Create a master router to include all route modules
from fastapi import APIRouter
master_router = APIRouter()

master_router.include_router(auth.router)
master_router.include_router(users.router)
master_router.include_router(farms.router)
master_router.include_router(bookings.router)
master_router.include_router(payments.router)
master_router.include_router(activities.router)
master_router.include_router(collaborations.router)
master_router.include_router(reviews.router)
master_router.include_router(admin.router)
master_router.include_router(ai.router)
master_router.include_router(media.router)
master_router.include_router(webhook.router)
master_router.include_router(applications.router)

# Mount master_router only once at /api prefix
app.include_router(master_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Welcome to the refactored Namma Gig API", "docs": "/docs"}
