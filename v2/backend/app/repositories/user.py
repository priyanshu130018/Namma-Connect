"""User repository for database queries and user/profile/settings updates."""

import json
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.user import User


class UserRepository:
    """SQLAlchemy Repository for User management."""

    @staticmethod
    def get_by_id(db: Session, user_id: str) -> Optional[User]:
        """Fetch user by ID."""
        try:
            return db.query(User).filter(User.id == user_id).first()
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        """Fetch user by email."""
        try:
            return db.query(User).filter(User.email == email.strip().lower()).first()
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def get_by_mobile(db: Session, mobile: str) -> Optional[User]:
        """Fetch user by mobile number."""
        try:
            return db.query(User).filter(User.mobile == mobile.strip()).first()
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def get_by_google_id(db: Session, google_id: str) -> Optional[User]:
        """Fetch user by Google OAuth subject ID."""
        try:
            return db.query(User).filter(User.google_id == google_id.strip()).first()
        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def create(db: Session, **kwargs) -> User:
        """Create and persist a new user entity."""
        if "id" not in kwargs:
            kwargs["id"] = uuid.uuid4()

        user = User(**kwargs)
        
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            raise
        return user

    @staticmethod
    def update(db: Session, user: User, **kwargs) -> User:
        """Update arbitrary user attributes."""
        try:
            for key, value in kwargs.items():
                setattr(user, key, value)
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            raise
        return user

    @staticmethod
    def update_profile(db: Session, user: User, update_data: Dict[str, Any]) -> User:
        """Update allowed profile fields for a user."""
        try:
            allowed_fields = {"full_name", "location", "language", "avatar_url"}
            for key, value in update_data.items():
                if key in allowed_fields and value is not None:
                    setattr(user, key, value)

            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            raise
        return user

    @staticmethod
    def update_settings(db: Session, user: User, update_data: Dict[str, Any]) -> User:
        """Update settings and preferences for a user."""
        try:
            if "language" in update_data and update_data["language"] is not None:
                user.language = update_data["language"]

            if "theme" in update_data and update_data["theme"] is not None:
                user.theme_preference = update_data["theme"]

            if "notifications" in update_data and update_data["notifications"] is not None:
                existing_notif = json.loads(user.notification_preferences) if user.notification_preferences else {}
                existing_notif.update(update_data["notifications"])
                user.notification_preferences = json.dumps(existing_notif)

            if "privacy" in update_data and update_data["privacy"] is not None:
                existing_priv = json.loads(user.privacy_preferences) if user.privacy_preferences else {}
                existing_priv.update(update_data["privacy"])
                user.privacy_preferences = json.dumps(existing_priv)

            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            raise
        return user
