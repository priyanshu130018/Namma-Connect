"""Marketplace module infrastructure repository."""

from typing import List, Optional, Tuple
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from app.modules.marketplace.domain.models import (
    MarketplaceCategory,
    Service,
    ServiceAvailability,
    SavedService,
)
from app.models.base import GUID


class MarketplaceRepository:
    """Repository for categories, services, availability, and saved wishlists."""

    def __init__(self, db: Session):
        self.db = db

    # ── Categories ──
    def list_active_categories(self) -> List[MarketplaceCategory]:
        return (
            self.db.query(MarketplaceCategory)
            .filter(MarketplaceCategory.is_active == True)
            .order_by(MarketplaceCategory.sort_order.asc())
            .all()
        )

    def get_category_by_slug(self, slug: str) -> Optional[MarketplaceCategory]:
        return self.db.query(MarketplaceCategory).filter(MarketplaceCategory.slug == slug).first()

    def get_category_by_id(self, category_id) -> Optional[MarketplaceCategory]:
        return self.db.query(MarketplaceCategory).filter(MarketplaceCategory.id == category_id).first()

    # ── Services ──
    def get_service_by_id(self, service_id) -> Optional[Service]:
        return self.db.query(Service).filter(Service.id == service_id).first()

    def get_service_by_slug(self, slug: str) -> Optional[Service]:
        return self.db.query(Service).filter(Service.slug == slug).first()

    def search_services(
        self,
        query_str: Optional[str] = None,
        category_slug: Optional[str] = None,
        district: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        status_filter: str = "PUBLISHED",
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Service], int]:
        q = self.db.query(Service)

        if status_filter:
            q = q.filter(Service.status == status_filter)

        if category_slug and category_slug.lower() != "all":
            q = q.filter(Service.category_slug == category_slug.lower())

        if district and district.lower() != "all":
            q = q.filter(Service.district.ilike(f"%{district.strip()}%"))

        if min_price is not None:
            q = q.filter(Service.price >= min_price)

        if max_price is not None:
            q = q.filter(Service.price <= max_price)

        if min_rating is not None:
            q = q.filter(Service.rating >= min_rating)

        if query_str and query_str.strip():
            term = f"%{query_str.strip()}%"
            q = q.filter(
                or_(
                    Service.title.ilike(term),
                    Service.description.ilike(term),
                    Service.district.ilike(term),
                    Service.location.ilike(term),
                )
            )

        total = q.count()
        items = q.order_by(Service.rating.desc(), Service.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def save_service(self, service: Service) -> Service:
        self.db.add(service)
        self.db.commit()
        self.db.refresh(service)
        return service

    # ── Availability ──
    def get_availabilities(self, service_id, start_date: str, end_date: str) -> List[ServiceAvailability]:
        return (
            self.db.query(ServiceAvailability)
            .filter(
                ServiceAvailability.service_id == service_id,
                ServiceAvailability.date >= start_date,
                ServiceAvailability.date <= end_date,
                ServiceAvailability.is_blocked == False,
            )
            .order_by(ServiceAvailability.date.asc())
            .all()
        )

    def save_availability(self, avail: ServiceAvailability) -> ServiceAvailability:
        self.db.add(avail)
        self.db.commit()
        self.db.refresh(avail)
        return avail

    # ── Saved Services (Wishlist) ──
    def get_saved_service(self, user_id, service_id) -> Optional[SavedService]:
        return (
            self.db.query(SavedService)
            .filter(SavedService.user_id == user_id, SavedService.service_id == service_id)
            .first()
        )

    def list_saved_services(self, user_id) -> List[SavedService]:
        return (
            self.db.query(SavedService)
            .filter(SavedService.user_id == user_id)
            .order_by(SavedService.created_at.desc())
            .all()
        )

    def add_saved_service(self, saved: SavedService) -> SavedService:
        self.db.add(saved)
        self.db.commit()
        self.db.refresh(saved)
        return saved

    def remove_saved_service(self, saved: SavedService) -> None:
        self.db.delete(saved)
        self.db.commit()
