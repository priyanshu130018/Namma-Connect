"""Payout Repository for Database Operations and Balance Queries."""

from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.models.payout import Payout


class PayoutRepository:
    """Encapsulates SQL operations for Payout records."""

    @staticmethod
    def create(db: Session, **kwargs) -> Payout:
        """Create a new payout record in the database."""
        payout = Payout(**kwargs)
        db.add(payout)
        db.commit()
        db.refresh(payout)
        return payout

    @staticmethod
    def get_by_id(db: Session, payout_id: str) -> Optional[Payout]:
        """Fetch payout by primary key ID."""
        try:
            return db.query(Payout).filter(Payout.id == payout_id).first()
        except Exception:
            return None

    @staticmethod
    def get_by_code(db: Session, payout_code: str) -> Optional[Payout]:
        """Fetch payout by unique code."""
        return db.query(Payout).filter(Payout.payout_code == payout_code).first()

    @staticmethod
    def list_by_provider(db: Session, provider_id: str) -> List[Payout]:
        """Fetch all payouts requested by a provider, ordered by newest first."""
        try:
            return (
                db.query(Payout)
                .filter(Payout.provider_id == provider_id)
                .order_by(desc(Payout.created_at))
                .all()
            )
        except Exception:
            return []

    @staticmethod
    def sum_by_provider_and_statuses(db: Session, provider_id: str, statuses: List[str]) -> float:
        """Sum payout amounts for a provider across specified statuses."""
        try:
            result = (
                db.query(func.coalesce(func.sum(Payout.amount), 0.0))
                .filter(Payout.provider_id == provider_id, Payout.status.in_(statuses))
                .scalar()
            )
            return float(result or 0.0)
        except Exception:
            return 0.0
