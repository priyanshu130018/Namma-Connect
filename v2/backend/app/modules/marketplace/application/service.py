"""Marketplace application service orchestrating discovery, catalog management, and wishlist operations."""

import json
import uuid
import re
from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException, status
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.marketplace.presentation.schemas import (
    ServiceCreateRequest,
    ServiceUpdateRequest,
    ServiceAvailabilityCreateRequest,
)
from app.modules.marketplace.domain.models import (
    MarketplaceCategory,
    Service,
    ServiceAvailability,
    SavedService,
)
from app.modules.user.domain.models import User
from app.core.enums import ServiceStatus, MarketplaceType


class MarketplaceService:
    """Application service for marketplace catalog and discovery."""

    def __init__(self, repo: MarketplaceRepository):
        self.repo = repo

    def list_categories(self) -> List[Dict[str, Any]]:
        """List permanent marketplace taxonomy categories."""
        cats = self.repo.list_active_categories()
        return [
            {
                "id": str(c.id),
                "slug": c.slug,
                "name": c.name,
                "marketplace_type": c.marketplace_type,
                "icon": c.icon,
                "description": c.description,
                "sort_order": c.sort_order,
                "is_active": c.is_active,
            }
            for c in cats
        ]

    def search_services(
        self,
        query_str: Optional[str] = None,
        category: Optional[str] = None,
        district: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Execute faceted search across published services."""
        items, total = self.repo.search_services(
            query_str=query_str,
            category_slug=category,
            district=district,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
            page=page,
            page_size=page_size,
        )
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
        return {
            "items": [self._serialize_service(s) for s in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def get_service_by_id(self, service_id) -> Dict[str, Any]:
        """Retrieve single service details by UUID."""
        service = self.repo.get_service_by_id(service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
        return self._serialize_service(service)

    def create_service(self, provider: User, payload: ServiceCreateRequest) -> Dict[str, Any]:
        """Create a new service listing (requires Provider role)."""
        category = self.repo.get_category_by_slug(payload.category_slug)
        cat_id = category.id if category else None
        cat_name = category.name if category else payload.category_slug.title()
        cat_type = category.marketplace_type if category else MarketplaceType.ACTIVITY.value

        base_slug = re.sub(r"[^a-z0-9]+", "-", payload.title.lower()).strip("-")
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

        service = Service(
            title=payload.title.strip(),
            slug=slug,
            description=payload.description.strip(),
            category=cat_name,
            category_slug=payload.category_slug.strip().lower(),
            category_id=cat_id,
            marketplace_type=cat_type,
            location=payload.location.strip(),
            district=payload.district.strip(),
            state=payload.state or "Karnataka",
            latitude=payload.latitude,
            longitude=payload.longitude,
            formatted_address=payload.formatted_address,
            price=payload.price,
            unit=payload.unit or "night",
            duration_hours=payload.duration_hours,
            max_capacity=payload.max_capacity or 10,
            primary_image=payload.primary_image.strip(),
            images_json=json.dumps(payload.images or []),
            inclusions_json=json.dumps(payload.inclusions or []),
            amenities_json=json.dumps(payload.amenities or []),
            provider_id=provider.id,
            provider_name=provider.full_name,
            provider_type="Partner",
            provider_avatar=provider.avatar_url,
            status=ServiceStatus.PENDING.value,
        )
        saved = self.repo.save_service(service)
        return self._serialize_service(saved)

    def update_service(self, provider: User, service_id, payload: ServiceUpdateRequest) -> Dict[str, Any]:
        """Update existing service (with ownership authorization check)."""
        service = self.repo.get_service_by_id(service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

        # Authorization: Provider must own the service or be ADMIN
        if service.provider_id != provider.id and provider.role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this service listing.",
            )

        if payload.title is not None:
            service.title = payload.title.strip()
        if payload.description is not None:
            service.description = payload.description.strip()
        if payload.location is not None:
            service.location = payload.location.strip()
        if payload.district is not None:
            service.district = payload.district.strip()
        if payload.price is not None:
            service.price = payload.price
        if payload.unit is not None:
            service.unit = payload.unit
        if payload.duration_hours is not None:
            service.duration_hours = payload.duration_hours
        if payload.max_capacity is not None:
            service.max_capacity = payload.max_capacity
        if payload.primary_image is not None:
            service.primary_image = payload.primary_image
        if payload.images is not None:
            service.images_json = json.dumps(payload.images)
        if payload.inclusions is not None:
            service.inclusions_json = json.dumps(payload.inclusions)
        if payload.amenities is not None:
            service.amenities_json = json.dumps(payload.amenities)
        if payload.status is not None and provider.role == "ADMIN":
            service.status = payload.status

        saved = self.repo.save_service(service)
        return self._serialize_service(saved)

    # ── Availability ──
    def get_service_availability(self, service_id, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Retrieve real-time calendar availability slots."""
        slots = self.repo.get_availabilities(service_id, start_date, end_date)
        return [
            {
                "id": str(s.id),
                "service_id": str(s.service_id),
                "date": s.date,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "slot_label": s.slot_label,
                "capacity": s.capacity,
                "booked_count": s.booked_count,
                "is_blocked": s.is_blocked,
                "price_override": float(s.price_override) if s.price_override is not None else None,
            }
            for s in slots
        ]

    # ── Saved Services (Wishlist) ──
    def save_service(self, user: User, service_id) -> Dict[str, Any]:
        """Save/bookmark a marketplace service."""
        service = self.repo.get_service_by_id(service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

        existing = self.repo.get_saved_service(user.id, service.id)
        if existing:
            return {"saved": True, "service_id": str(service.id), "message": "Already saved"}

        saved = SavedService(user_id=user.id, service_id=service.id)
        self.repo.add_saved_service(saved)
        return {"saved": True, "service_id": str(service.id), "message": "Service saved to wishlist"}

    def unsave_service(self, user: User, service_id) -> Dict[str, Any]:
        """Remove a service from wishlist."""
        existing = self.repo.get_saved_service(user.id, service_id)
        if existing:
            self.repo.remove_saved_service(existing)
        return {"saved": False, "service_id": str(service_id), "message": "Service removed from wishlist"}

    def list_saved_services(self, user: User) -> List[Dict[str, Any]]:
        """List all saved services for the authenticated user."""
        saved_items = self.repo.list_saved_services(user.id)
        results = []
        for item in saved_items:
            if item.service:
                results.append(
                    {
                        "id": str(item.id),
                        "service_id": str(item.service_id),
                        "service": self._serialize_service(item.service),
                        "created_at": item.created_at.isoformat() if item.created_at else "",
                    }
                )
        return results

    def _serialize_service(self, s: Service) -> Dict[str, Any]:
        try:
            images = json.loads(s.images_json) if s.images_json else []
        except Exception:
            images = []
        try:
            inclusions = json.loads(s.inclusions_json) if s.inclusions_json else []
        except Exception:
            inclusions = []
        try:
            amenities = json.loads(s.amenities_json) if s.amenities_json else []
        except Exception:
            amenities = []

        return {
            "id": str(s.id),
            "title": s.title,
            "slug": s.slug,
            "description": s.description,
            "category": s.category,
            "category_slug": s.category_slug,
            "category_id": str(s.category_id) if s.category_id else None,
            "marketplace_type": s.marketplace_type,
            "location": s.location,
            "district": s.district,
            "state": s.state,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "formatted_address": s.formatted_address,
            "price": float(s.price),
            "unit": s.unit,
            "duration_hours": s.duration_hours,
            "max_capacity": s.max_capacity,
            "rating": s.rating,
            "reviews_count": s.reviews_count,
            "is_verified": s.is_verified,
            "status": s.status,
            "provider_id": str(s.provider_id) if s.provider_id else None,
            "provider_name": s.provider_name,
            "provider_type": s.provider_type,
            "provider_avatar": s.provider_avatar,
            "primary_image": s.primary_image,
            "images": images,
            "inclusions": inclusions,
            "amenities": amenities,
            "created_at": s.created_at.isoformat() if s.created_at else "",
        }
