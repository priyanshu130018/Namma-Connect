"""Domain service for Customer Profile and Settings management."""

import json
from typing import Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import (
    UserResponse,
    UserProfileUpdateRequest,
    UserSettingsResponse,
    UserSettingsUpdateRequest,
    UserPreferencesResponse,
    UserPreferencesUpdateRequest,
    VerificationChangeRequest,
)


class UserService:
    """Business logic for User Profile & Preferences."""

    @staticmethod
    def _parse_json(value: Any, default: dict) -> dict:
        """Helper to parse JSON string to dictionary."""
        if not value:
            return default
        if isinstance(value, dict):
            return value
        try:
            return json.loads(value)
        except Exception:
            return default

    @classmethod
    def get_user_profile(cls, user: User) -> UserResponse:
        """Convert User ORM to UserResponse."""
        return UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            mobile=user.mobile,
            role=user.role,
            is_active=user.is_active,
            is_verified=user.is_verified,
            phone_verified=user.phone_verified,
            auth_provider=user.auth_provider,
            avatar_url=user.avatar_url,
            location=getattr(user, "location", "Bengaluru, Karnataka") or "Bengaluru, Karnataka",
            language=getattr(user, "language", "English, Kannada") or "English, Kannada",
            theme_preference=getattr(user, "theme_preference", "system") or "system",
            created_at=user.created_at,
        )

    @classmethod
    def update_user_profile(
        cls,
        db: Session,
        user: User,
        payload: UserProfileUpdateRequest,
    ) -> UserResponse:
        """Update allowed editable fields on user profile."""
        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            return cls.get_user_profile(user)

        # Validate display name if provided
        if "full_name" in update_data:
            name = update_data["full_name"].strip()
            if len(name) < 2:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Full name must be at least 2 characters long.",
                )
            update_data["full_name"] = name

        updated_user = UserRepository.update_profile(db, user, update_data)
        return cls.get_user_profile(updated_user)

    @classmethod
    def get_user_settings(cls, user: User) -> UserSettingsResponse:
        """Retrieve settings and preferences for user."""
        default_notif = {
            "email": True,
            "sms": True,
            "promo": False,
            "bookings": True,
            "payments": True,
            "collaborations": True,
            "support": True,
        }
        default_priv = {
            "share_profile": True,
            "personalize_location": True,
        }

        notif = cls._parse_json(getattr(user, "notification_preferences", None), default_notif)
        priv = cls._parse_json(getattr(user, "privacy_preferences", None), default_priv)

        return UserSettingsResponse(
            user_id=str(user.id),
            email=user.email,
            mobile=user.mobile,
            language=getattr(user, "language", "English, Kannada") or "English, Kannada",
            theme=getattr(user, "theme_preference", "system") or "system",
            notifications=notif,
            privacy=priv,
        )

    @classmethod
    def update_user_settings(
        cls,
        db: Session,
        user: User,
        payload: UserSettingsUpdateRequest,
    ) -> UserSettingsResponse:
        """Update settings and preferences for user."""
        update_data = payload.model_dump(exclude_unset=True)
        if update_data:
            UserRepository.update_settings(db, user, update_data)

        return cls.get_user_settings(user)

    @classmethod
    def get_user_preferences(cls, user: User) -> UserPreferencesResponse:
        """Retrieve canonical user theme and language preferences."""
        raw_lang = (user.language or "en").lower()
        if "kannada" in raw_lang or raw_lang == "kn":
            norm_lang = "kn"
        elif "hindi" in raw_lang or raw_lang == "hi":
            norm_lang = "hi"
        else:
            norm_lang = "en"

        raw_theme = user.theme_preference or "system"
        norm_theme = raw_theme.lower() if raw_theme.lower() in ["light", "dark", "system"] else "system"

        return UserPreferencesResponse(
            theme_preference=norm_theme,
            language=norm_lang,
        )

    @classmethod
    def update_user_preferences(
        cls,
        db: Session,
        user: User,
        payload: UserPreferencesUpdateRequest,
    ) -> UserPreferencesResponse:
        """Update authenticated user's theme and language preferences."""
        update_data = {}
        if payload.theme_preference is not None:
            theme_val = payload.theme_preference.lower().strip()
            if theme_val not in ["light", "dark", "system"]:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid theme preference. Must be 'light', 'dark', or 'system'.",
                )
            update_data["theme_preference"] = theme_val

        if payload.language is not None:
            lang_val = payload.language.lower().strip()
            if lang_val not in ["en", "kn", "hi"]:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid language preference. Must be 'en', 'kn', or 'hi'.",
                )
            update_data["language"] = lang_val

        if update_data:
            UserRepository.update(db, user, **update_data)

        return cls.get_user_preferences(user)

    @classmethod
    def submit_verification_change_request(
        cls,
        db: Session,
        user: User,
        payload: VerificationChangeRequest,
    ) -> Dict[str, Any]:
        """Submit a compliance review request for protected identity fields."""
        if not payload.requested_value.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Requested value cannot be empty.",
            )

        if not payload.reason.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A valid reason/document justification is required for verified credential updates.",
            )

        # In production this queues an admin compliance ticket or audit log
        return {
            "status": "PENDING_REVIEW",
            "field": payload.field,
            "requested_value": payload.requested_value,
            "message": "Change request submitted successfully for administrator compliance review.",
        }
