"""Auth module application service orchestrating authentication use cases."""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from app.modules.auth.infrastructure.repository import AuthRepository
from app.modules.auth.presentation.schemas import RegisterRequest, LoginRequest
from app.modules.user.domain.models import User
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
)
from app.core.config import settings
from app.core.enums import UserRole, AuthProvider


class AuthService:
    """Application service for user authentication, registration, and credential management."""

    def __init__(self, auth_repo: AuthRepository):
        self.auth_repo = auth_repo

    def register(self, payload: RegisterRequest) -> Dict[str, Any]:
        """Register a new user account."""
        clean_email = payload.email.strip().lower()
        existing = self.auth_repo.get_by_email(clean_email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address already exists.",
            )

        if payload.mobile:
            existing_mobile = self.auth_repo.get_by_mobile(payload.mobile)
            if existing_mobile:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user with this mobile number already exists.",
                )

        # Standard canonical role mapping
        requested_role = (payload.role or UserRole.CUSTOMER.value).upper()
        if requested_role not in [UserRole.CUSTOMER.value, UserRole.PARTNER.value, UserRole.ADMIN.value]:
            requested_role = UserRole.CUSTOMER.value

        user = User(
            email=clean_email,
            hashed_password=get_password_hash(payload.password),
            full_name=payload.full_name.strip(),
            mobile=payload.mobile.strip() if payload.mobile else None,
            role=requested_role,
            is_active=True,
            is_verified=False,
            auth_provider=AuthProvider.LOCAL.value,
        )
        saved_user = self.auth_repo.save(user)

        # Generate tokens
        access_token = create_access_token(subject=str(saved_user.id), role=saved_user.role)
        refresh_token = create_refresh_token(subject=str(saved_user.id))

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(saved_user.id),
                "email": saved_user.email,
                "full_name": saved_user.full_name,
                "role": saved_user.role,
                "avatar_url": saved_user.avatar_url,
                "is_verified": saved_user.is_verified,
            },
        }

    def login(self, payload: LoginRequest) -> Dict[str, Any]:
        """Authenticate user credentials and issue JWT tokens."""
        clean_email = payload.email.strip().lower()
        user = self.auth_repo.get_by_email(clean_email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.hashed_password or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Please contact support.",
            )

        access_token = create_access_token(subject=str(user.id), role=user.role)
        refresh_token = create_refresh_token(subject=str(user.id))

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "avatar_url": user.avatar_url,
                "is_verified": user.is_verified,
            },
        }

    def refresh_token(self, refresh_token_str: str) -> Dict[str, Any]:
        """Validate refresh token and issue new access token."""
        try:
            payload = decode_access_token(refresh_token_str)
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

            user = self.auth_repo.get_by_id(user_id)
            if not user or not user.is_active:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive or not found.")

            new_access_token = create_access_token(subject=str(user.id), role=user.role)

            return {
                "access_token": new_access_token,
                "token_type": "bearer",
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                },
            }
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired or invalid refresh token.")

