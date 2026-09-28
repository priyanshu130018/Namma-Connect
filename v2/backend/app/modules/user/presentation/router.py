"""User presentation router mounting /api/v2/users and /api/v2/me endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.modules.user.infrastructure.repository import UserRepository
from app.modules.user.application.service import UserService
from app.modules.user.presentation.schemas import (
    UserProfileResponse,
    UserProfileUpdateRequest,
    UserPreferencesUpdateRequest,
    ChangePasswordRequest,
)
from app.schemas.common import APIResponse

router = APIRouter(prefix="/users", tags=["Users"])


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(UserRepository(db))


@router.get("/me", response_model=APIResponse[UserProfileResponse])
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """Retrieve full profile details for the authenticated user."""
    profile = user_service.get_profile(current_user)
    return APIResponse(success=True, message="User profile retrieved", data=profile)


@router.put("/me", response_model=APIResponse[UserProfileResponse])
def update_current_user_profile(
    payload: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """Update profile attributes for the authenticated user."""
    updated = user_service.update_profile(current_user, payload)
    return APIResponse(success=True, message="Profile updated successfully", data=updated)


@router.put("/me/preferences", response_model=APIResponse[dict])
def update_user_preferences(
    payload: UserPreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """Update notification and privacy preferences."""
    prefs = user_service.update_preferences(current_user, payload)
    return APIResponse(success=True, message="Preferences updated successfully", data=prefs)


@router.post("/me/change-password", response_model=APIResponse[dict])
def change_user_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """Change account password."""
    user_service.change_password(current_user, payload)
    return APIResponse(success=True, message="Password changed successfully", data={})
