"""User endpoints for authenticated customer profile, settings, and saved items."""

from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.auth import (
    UserResponse,
    UserProfileUpdateRequest,
    UserSettingsResponse,
    UserSettingsUpdateRequest,
    UserPreferencesResponse,
    UserPreferencesUpdateRequest,
    VerificationChangeRequest,
)
from app.schemas.saved_service import SavedServiceListResponse
from app.services.saved_service import SavedServiceDomainService
from app.services.user import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me/preferences", response_model=APIResponse[UserPreferencesResponse])
def get_current_user_preferences(
    current_user: User = Depends(get_current_user),
):
    """Retrieve theme and language preferences for authenticated user."""
    prefs = UserService.get_user_preferences(current_user)
    return APIResponse(
        success=True,
        message="User preferences retrieved successfully.",
        data=prefs,
    )


@router.patch("/me/preferences", response_model=APIResponse[UserPreferencesResponse])
def update_current_user_preferences(
    payload: UserPreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update theme and language preferences for authenticated user."""
    updated_prefs = UserService.update_user_preferences(db, current_user, payload)
    return APIResponse(
        success=True,
        message="Preferences updated successfully.",
        data=updated_prefs,
    )


@router.get("/me", response_model=APIResponse[UserResponse])
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Retrieve full profile of the authenticated user."""
    profile = UserService.get_user_profile(current_user)
    return APIResponse(
        success=True,
        message="User profile retrieved successfully.",
        data=profile,
    )


@router.put("/me", response_model=APIResponse[UserResponse])
def update_current_user_profile(
    payload: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update editable fields (display name, location, language, avatar) on user profile."""
    updated_profile = UserService.update_user_profile(db, current_user, payload)
    return APIResponse(
        success=True,
        message="Profile updated.",
        data=updated_profile,
    )


@router.get("/me/settings", response_model=APIResponse[UserSettingsResponse])
def get_current_user_settings(
    current_user: User = Depends(get_current_user),
):
    """Retrieve account settings and preferences for authenticated user."""
    settings = UserService.get_user_settings(current_user)
    return APIResponse(
        success=True,
        message="User settings retrieved successfully.",
        data=settings,
    )


@router.put("/me/settings", response_model=APIResponse[UserSettingsResponse])
def update_current_user_settings(
    payload: UserSettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update account preferences (notifications, theme, privacy, language)."""
    updated_settings = UserService.update_user_settings(db, current_user, payload)
    return APIResponse(
        success=True,
        message="Settings updated.",
        data=updated_settings,
    )


@router.post("/me/change-request", response_model=APIResponse[Dict[str, Any]])
def submit_change_request(
    payload: VerificationChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a change request for verified/protected identity fields."""
    result = UserService.submit_verification_change_request(db, current_user, payload)
    return APIResponse(
        success=True,
        message=result["message"],
        data=result,
    )


@router.get("/me/saved", response_model=APIResponse[SavedServiceListResponse])
def get_my_saved_services(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all saved services for the authenticated customer."""
    saved_list = SavedServiceDomainService.list_saved_services(db, current_user)
    return APIResponse(
        success=True,
        message="Saved services retrieved successfully.",
        data=saved_list,
    )
