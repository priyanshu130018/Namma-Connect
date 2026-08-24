"""Service and Review Repository for Database Operations."""

import json
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc, func
from app.models.service import Service, Review


class ServiceRepository:
    """Encapsulates SQL queries for Services and Reviews."""

    @staticmethod
    def get_by_id(db: Session, service_id: str) -> Optional[Service]:
        """Fetch service by ID."""
        try:
            return db.query(Service).filter(Service.id == service_id).first()
        except Exception:
            return None

    @staticmethod
    def get_by_slug(db: Session, slug: str) -> Optional[Service]:
        """Fetch service by unique slug."""
        return db.query(Service).filter(Service.slug == slug).first()

    @staticmethod
    def list_services(
        db: Session,
        category: Optional[str] = None,
        location: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        sort_by: Optional[str] = "rating",
        page: int = 1,
        limit: int = 12,
        status: str = "PUBLISHED",
    ) -> Tuple[List[Service], int]:
        """List discoverable services with SQL-level filters and pagination."""
        query = db.query(Service).filter(Service.status == status)

        if category and category.lower() != "all":
            cat_clean = category.lower().strip()
            query = query.filter(
                or_(
                    Service.category_slug == cat_clean,
                    Service.category.ilike(f"%{cat_clean}%"),
                )
            )

        if location:
            loc_clean = location.strip()
            query = query.filter(
                or_(
                    Service.location.ilike(f"%{loc_clean}%"),
                    Service.district.ilike(f"%{loc_clean}%"),
                    Service.state.ilike(f"%{loc_clean}%"),
                )
            )

        if min_price is not None:
            query = query.filter(Service.price >= min_price)

        if max_price is not None:
            query = query.filter(Service.price <= max_price)

        if min_rating is not None:
            query = query.filter(Service.rating >= min_rating)

        # Sorting
        if sort_by == "price_asc":
            query = query.order_by(asc(Service.price))
        elif sort_by == "price_desc":
            query = query.order_by(desc(Service.price))
        elif sort_by == "newest":
            query = query.order_by(desc(Service.created_at))
        else:  # rating / relevance default
            query = query.order_by(desc(Service.rating), desc(Service.reviews_count))

        total = query.count()
        offset = (page - 1) * limit
        items = query.offset(offset).limit(limit).all()
        return items, total

    @staticmethod
    def search_services(
        db: Session,
        query_text: str,
        category: Optional[str] = None,
        location: Optional[str] = None,
        page: int = 1,
        limit: int = 12,
        status: str = "PUBLISHED",
    ) -> Tuple[List[Service], int]:
        """Execute full search on titles, descriptions, and locations."""
        query = db.query(Service).filter(Service.status == status)

        if query_text:
            search_pattern = f"%{query_text.strip()}%"
            query = query.filter(
                or_(
                    Service.title.ilike(search_pattern),
                    Service.description.ilike(search_pattern),
                    Service.location.ilike(search_pattern),
                    Service.district.ilike(search_pattern),
                    Service.provider_name.ilike(search_pattern),
                )
            )

        if category and category.lower() != "all":
            clean_cat = category.lower().strip()
            if clean_cat in ["farms", "farm"]:
                query = query.filter(
                    or_(
                        Service.category_slug.in_(["stay", "experiences"]),
                        Service.category.ilike("%farm%"),
                        Service.title.ilike("%farm%"),
                    )
                )
            elif clean_cat in ["activities", "activity"]:
                query = query.filter(
                    or_(
                        Service.category_slug.in_(["experiences", "guides-tours"]),
                        Service.category.ilike("%activit%"),
                        Service.category.ilike("%tour%"),
                    )
                )
            elif clean_cat in ["stays", "stay", "homestay", "farmstay"]:
                query = query.filter(
                    or_(
                        Service.category_slug == "stay",
                        Service.category.ilike("%stay%"),
                    )
                )
            elif clean_cat in ["tours", "guides", "guides & tours", "guides-tours"]:
                query = query.filter(
                    or_(
                        Service.category_slug == "guides-tours",
                        Service.category.ilike("%tour%"),
                        Service.category.ilike("%guide%"),
                    )
                )
            else:
                query = query.filter(
                    or_(
                        Service.category_slug == clean_cat,
                        Service.category.ilike(f"%{clean_cat}%"),
                    )
                )

        if location:
            query = query.filter(Service.location.ilike(f"%{location}%"))

        total = query.count()
        offset = (page - 1) * limit
        items = query.order_by(desc(Service.rating)).offset(offset).limit(limit).all()
        return items, total

    @staticmethod
    def get_suggestions(
        db: Session,
        query_text: str,
        limit: int = 8,
        status: str = "PUBLISHED",
    ) -> List[dict]:
        """Generate debounced autocomplete suggestions."""
        if not query_text or len(query_text.strip()) < 1:
            return []

        clean_q = query_text.strip()
        pattern = f"%{clean_q}%"
        results = []
        seen_texts = set()

        # 1. Check known categories matching query
        categories = [
            ("Farm stays", "stay", "category"),
            ("Farms & agriculture experiences", "experiences", "category"),
            ("Trekking & Adventure", "guides-tours", "category"),
            ("Coffee & Spice Tours", "experiences", "category"),
            ("Organic Farm Tours", "experiences", "category"),
            ("Rural Food & Dining", "food", "category"),
            ("Cultural & Harvest Events", "events", "category"),
            ("Travel & Guide Services", "travel-services", "category"),
        ]
        for cat_label, cat_slug, cat_type in categories:
            if clean_q.lower() in cat_label.lower() or clean_q.lower() in cat_slug.lower():
                if cat_label not in seen_texts:
                    seen_texts.add(cat_label)
                    results.append({
                        "id": f"cat-{cat_slug}",
                        "title": cat_label,
                        "text": cat_label,
                        "category": cat_slug,
                        "location": "Karnataka",
                        "type": "category",
                    })

        # 2. Check services matching title/location/provider
        services = (
            db.query(Service)
            .filter(
                Service.status == status,
                or_(
                    Service.title.ilike(pattern),
                    Service.location.ilike(pattern),
                    Service.district.ilike(pattern),
                    Service.category.ilike(pattern),
                    Service.provider_name.ilike(pattern),
                ),
            )
            .limit(limit)
            .all()
        )

        for s in services:
            if s.title not in seen_texts:
                seen_texts.add(s.title)
                results.append({
                    "id": str(s.id),
                    "title": s.title,
                    "text": s.title,
                    "category": s.category,
                    "location": s.location,
                    "slug": s.slug,
                    "type": "service",
                })

        return results[:limit]

    @staticmethod
    def get_reviews_for_service(
        db: Session,
        service_id: str,
        limit: int = 20,
    ) -> List[Review]:
        """Fetch reviews for a specific service."""
        try:
            return (
                db.query(Review)
                .filter(Review.service_id == service_id)
                .order_by(desc(Review.created_at))
                .limit(limit)
                .all()
            )
        except Exception:
            return []

    @staticmethod
    def count(db: Session) -> int:
        """Count total services."""
        return db.query(Service).count()

    @staticmethod
    def create(db: Session, **kwargs) -> Service:
        """Create new service in database."""
        service = Service(**kwargs)
        db.add(service)
        db.commit()
        db.refresh(service)
        return service

    @staticmethod
    def get_review_by_booking_id(db: Session, booking_id: str) -> Optional[Review]:
        """Fetch review associated with a specific booking reservation."""
        try:
            return db.query(Review).filter(Review.booking_id == booking_id).first()
        except Exception:
            return None

    @staticmethod
    def recalculate_service_rating(db: Session, service_id: str) -> None:
        """Recompute authoritative average rating and review count from published reviews."""
        try:
            reviews = (
                db.query(Review)
                .filter(Review.service_id == service_id, Review.status == "PUBLISHED")
                .all()
            )
            count = len(reviews)
            avg_rating = round(sum(r.rating for r in reviews) / count, 2) if count > 0 else 5.0

            service = db.query(Service).filter(Service.id == service_id).first()
            if service:
                service.rating = avg_rating
                service.reviews_count = count
                db.commit()
        except Exception:
            db.rollback()

    @staticmethod
    def add_review(db: Session, **kwargs) -> Review:
        """Add review for a service."""
        review = Review(**kwargs)
        db.add(review)
        db.commit()
        db.refresh(review)
        return review
