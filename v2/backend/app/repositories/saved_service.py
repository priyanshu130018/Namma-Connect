"""Repository for Saved Services (Wishlist) database operations."""

import uuid
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.models.saved_service import SavedService
from app.models.service import Service


class SavedServiceRepository:
    """SQLAlchemy Repository for SavedService database operations."""

    @staticmethod
    def get_saved(db: Session, user_id: str, service_id: str) -> Optional[SavedService]:
        """Fetch a saved record by user and service."""
        try:
            return (
                db.query(SavedService)
                .filter(
                    SavedService.user_id == user_id,
                    SavedService.service_id == service_id,
                )
                .first()
            )
        except Exception:
            return None

    @staticmethod
    def list_by_user(db: Session, user_id: str) -> List[SavedService]:
        """Fetch all saved services for a customer, joined with Service entity."""
        try:
            return (
                db.query(SavedService)
                .options(joinedload(SavedService.service))
                .filter(SavedService.user_id == user_id)
                .order_by(desc(SavedService.created_at))
                .all()
            )
        except Exception:
            return []

    @staticmethod
    def save_service(db: Session, user_id: str, service_id: str) -> SavedService:
        """Idempotently save a service for a customer."""
        existing = SavedServiceRepository.get_saved(db, user_id, service_id)
        if existing:
            return existing

        saved = SavedService(
            id=uuid.uuid4(),
            user_id=user_id,
            service_id=service_id,
        )
        db.add(saved)
        db.commit()
        db.refresh(saved)
        return saved

    @staticmethod
    def remove_saved(db: Session, user_id: str, service_id: str) -> bool:
        """Remove a saved service association for a customer."""
        saved = SavedServiceRepository.get_saved(db, user_id, service_id)
        if not saved:
            return False

        db.delete(saved)
        db.commit()
        return True

    @staticmethod
    def is_saved(db: Session, user_id: str, service_id: str) -> bool:
        """Check if a service is saved by a customer."""
        return SavedServiceRepository.get_saved(db, user_id, service_id) is not None
