"""Authentication endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    VerifyEmailRequest,
    VerifyPhoneRequest,
)
from app.schemas.common import MessageResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/status", response_model=MessageResponse)
async def auth_status():
    """Authentication gateway status."""
    return MessageResponse(
        success=True,
        message="Authentication gateway operational with JWT & RBAC.",
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    return AuthService.register(db, req)


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email/mobile and password."""
    return AuthService.login(db, req)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
    return AuthService.refresh(db, req)


@router.post("/google", response_model=TokenResponse)
async def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate using Google OAuth credential."""
    return AuthService.google_auth(db, req)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve current authenticated user profile."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        mobile=current_user.mobile,
        role=current_user.role,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        phone_verified=current_user.phone_verified,
        auth_provider=current_user.auth_provider,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout():
    """Client-side session termination confirmation."""
    return MessageResponse(success=True, message="Successfully logged out.")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset link without leaking account existence."""
    AuthService.forgot_password(db, req)
    return MessageResponse(
        success=True,
        message="If this email is registered, password reset instructions have been dispatched.",
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using verified reset token."""
    AuthService.reset_password(db, req)
    return MessageResponse(
        success=True,
        message="Password has been successfully updated. Please log in with your new password.",
    )


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password for the currently authenticated user."""
    AuthService.change_password(db, str(current_user.id), req)
    return MessageResponse(success=True, message="Password updated successfully.")


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify user email address via token."""
    AuthService.verify_email(db, req)
    return MessageResponse(success=True, message="Email successfully verified.")


@router.post("/verify-phone", response_model=MessageResponse)
async def verify_phone(req: VerifyPhoneRequest, db: Session = Depends(get_db)):
    """Verify user phone number via OTP."""
    AuthService.verify_phone(db, req)
    return MessageResponse(success=True, message="Phone number successfully verified.")
