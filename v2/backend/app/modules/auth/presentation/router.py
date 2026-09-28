"""Auth presentation router mounting /api/v2/auth endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.modules.auth.infrastructure.repository import AuthRepository
from app.modules.auth.application.service import AuthService
from app.modules.auth.presentation.schemas import (
    RegisterRequest,
    LoginRequest,
    GoogleAuthRequest,
    RefreshTokenRequest,
    TokenResponse,
)
from app.schemas.common import APIResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(AuthRepository(db))


@router.post("/register", response_model=APIResponse[TokenResponse], status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, auth_service: AuthService = Depends(get_auth_service)):
    """Register a new customer or provider account."""
    data = auth_service.register(payload)
    return APIResponse(success=True, message="Registration successful", data=data)


@router.post("/login", response_model=APIResponse[TokenResponse])
def login(payload: LoginRequest, auth_service: AuthService = Depends(get_auth_service)):
    """Authenticate with email and password."""
    data = auth_service.login(payload)
    return APIResponse(success=True, message="Login successful", data=data)


@router.post("/refresh", response_model=APIResponse[dict])
def refresh_token(payload: RefreshTokenRequest, auth_service: AuthService = Depends(get_auth_service)):
    """Refresh an access token using a valid refresh token."""
    data = auth_service.refresh_token(payload.refresh_token)
    return APIResponse(success=True, message="Token refreshed successfully", data=data)


@router.get("/me", response_model=APIResponse[dict])
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve the currently authenticated user's profile summary."""
    return APIResponse(
        success=True,
        message="Profile retrieved",
        data={
            "id": str(current_user.id),
            "email": current_user.email,
            "full_name": current_user.full_name,
            "mobile": current_user.mobile,
            "role": current_user.role,
            "avatar_url": current_user.avatar_url,
            "location": current_user.location,
            "language": current_user.language,
            "theme_preference": current_user.theme_preference,
            "is_verified": current_user.is_verified,
        },
    )
