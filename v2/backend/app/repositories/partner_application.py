"""Repository layer for PartnerApplication CRUD."""

from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.partner_application import PartnerApplication


class PartnerApplicationRepository:
    """Database operations for PartnerApplication."""

    @staticmethod
    def get_by_id(db: Session, app_id: str) -> Optional[PartnerApplication]:
        return db.query(PartnerApplication).filter(PartnerApplication.id == app_id).first()

    @staticmethod
    def get_by_user_id(db: Session, user_id: str) -> Optional[PartnerApplication]:
        """Fetch the most recent partner application for a user."""
        return (
            db.query(PartnerApplication)
            .filter(PartnerApplication.user_id == user_id)
            .order_by(desc(PartnerApplication.created_at))
            .first()
        )

    @staticmethod
    def create(db: Session, application: PartnerApplication) -> PartnerApplication:
        db.add(application)
        db.commit()
        db.refresh(application)
        return application

    @staticmethod
    def update(db: Session, application: PartnerApplication) -> PartnerApplication:
        db.commit()
        db.refresh(application)
        return application

    @staticmethod
    def list_all(
        db: Session,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PartnerApplication], int]:
        query = db.query(PartnerApplication)
        if status:
            query = query.filter(PartnerApplication.status == status.upper())
        total = query.count()
        results = query.order_by(desc(PartnerApplication.created_at)).offset(offset).limit(limit).all()
        return results, total
