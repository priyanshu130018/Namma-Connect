"""Category Repository for Database Operations on Marketplace Categories."""

from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import asc
from app.models.category import MarketplaceCategory


class CategoryRepository:
    """Encapsulates SQL queries for Marketplace Categories."""

    @staticmethod
    def get_by_id(db: Session, category_id: str) -> Optional[MarketplaceCategory]:
        """Fetch category by ID."""
        try:
            return db.query(MarketplaceCategory).filter(MarketplaceCategory.id == category_id).first()
        except Exception:
            return None

    @staticmethod
    def get_by_slug(db: Session, slug: str) -> Optional[MarketplaceCategory]:
        """Fetch category by unique slug."""
        return db.query(MarketplaceCategory).filter(MarketplaceCategory.slug == slug).first()

    @staticmethod
    def list_categories(
        db: Session,
        marketplace_type: Optional[str] = None,
        is_active: Optional[bool] = True,
    ) -> List[MarketplaceCategory]:
        """List categories filtered by marketplace_type (ACTIVITY vs CONTENT_CREATOR) and active state."""
        query = db.query(MarketplaceCategory)
        if is_active is not None:
            query = query.filter(MarketplaceCategory.is_active == is_active)
        if marketplace_type:
            query = query.filter(MarketplaceCategory.marketplace_type == marketplace_type.upper())
        return query.order_by(asc(MarketplaceCategory.sort_order), asc(MarketplaceCategory.name)).all()

    @staticmethod
    def count(db: Session) -> int:
        """Count total categories."""
        return db.query(MarketplaceCategory).count()
