"""User application service."""

import json
from typing import Dict, Any
from fastapi import HTTPException, status
from app.modules.user.infrastructure.repository import UserRepository
from app.modules.user.presentation.schemas import (
    UserProfileUpdateRequest,
    UserPreferencesUpdateRequest,
    ChangePasswordRequest,
)
from app.modules.user.domain.models import User
from app.core.security import verify_password, get_password_hash


class UserService:
    """Application service for user profile and preference management."""

    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def get_profile(self, user: User) -> Dict[str, Any]:
        """Return user profile dictionary."""
        return {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "mobile": user.mobile,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "location": user.location,
            "language": user.language,
            "theme_preference": user.theme_preference,
            "bio": user.bio,
            "gender": user.gender,
            "date_of_birth": user.date_of_birth,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "phone_verified": user.phone_verified,
        }

    def update_profile(self, user: User, payload: UserProfileUpdateRequest) -> Dict[str, Any]:
        """Update profile fields."""
        if payload.full_name is not None:
            user.full_name = payload.full_name.strip()
        if payload.mobile is not None:
            user.mobile = payload.mobile.strip() if payload.mobile else None
        if payload.avatar_url is not None:
            user.avatar_url = payload.avatar_url.strip() if payload.avatar_url else None
        if payload.location is not None:
            user.location = payload.location.strip() if payload.location else None
        if payload.language is not None:
            user.language = payload.language
        if payload.theme_preference is not None:
            user.theme_preference = payload.theme_preference
        if payload.bio is not None:
            user.bio = payload.bio
        if payload.gender is not None:
            user.gender = payload.gender
        if payload.date_of_birth is not None:
            user.date_of_birth = payload.date_of_birth
        if payload.tags is not None:
            user.tags_json = json.dumps(payload.tags)

        updated = self.user_repo.update(user)
        return self.get_profile(updated)

    def update_preferences(self, user: User, payload: UserPreferencesUpdateRequest) -> Dict[str, Any]:
        """Update notification/privacy preferences and UI themes."""
        if payload.notification_preferences is not None:
            user.notification_preferences = json.dumps(payload.notification_preferences)
        if payload.privacy_preferences is not None:
            user.privacy_preferences = json.dumps(payload.privacy_preferences)
        if payload.theme_preference is not None:
            user.theme_preference = payload.theme_preference
        if payload.language is not None:
            user.language = payload.language

        updated = self.user_repo.update(user)
        return {
            "notification_preferences": json.loads(updated.notification_preferences or "{}"),
            "privacy_preferences": json.loads(updated.privacy_preferences or "{}"),
            "theme_preference": updated.theme_preference,
            "language": updated.language,
        }

    def change_password(self, user: User, payload: ChangePasswordRequest) -> None:
        """Verify existing password and set new password."""
        if not user.hashed_password or not verify_password(payload.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password verification failed.",
            )

        user.hashed_password = get_password_hash(payload.new_password)
        self.user_repo.update(user)
