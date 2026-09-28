"""Internal Marketplace Provider Adapter (authoritative local database records)."""

import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.marketplace.domain.models import Service, ServiceAvailability
from app.modules.provider.domain.models import PartnerApplication
from app.modules.provider.intelligence.adapters.base import BaseProviderAdapter
from app.modules.provider.intelligence.types import (
    NormalizedProviderService,
    NormalizedAvailability,
    NormalizedAvailabilitySlot,
    NormalizedPricing,
    ProviderDataSource,
    AvailabilityStatus,
)


class InternalMarketplaceAdapter(BaseProviderAdapter):
    """Adapter wrapping native PostgreSQL marketplace listings & provider records."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = MarketplaceRepository(db)

    @property
    def source_type(self) -> ProviderDataSource:
        return ProviderDataSource.INTERNAL_MARKETPLACE

    @property
    def is_healthy(self) -> bool:
        return self.db.is_active

    def search_services(
        self,
        district: Optional[str] = None,
        category_slug: Optional[str] = None,
        max_price: Optional[float] = None,
        limit: int = 20,
    ) -> List[NormalizedProviderService]:
        """Search published, verified services from PostgreSQL."""
        services, _ = self.repo.search_services(
            category_slug=category_slug,
            district=district,
            max_price=max_price,
            page=1,
            page_size=limit,
        )
        return [self._normalize_service(s) for s in services]

    def get_service_by_id(self, service_id: str) -> Optional[NormalizedProviderService]:
        """Fetch service by UUID string."""
        try:
            uid = uuid.UUID(service_id)
        except (ValueError, TypeError):
            return None

        service = self.repo.get_service_by_id(uid)
        if not service:
            return None
        return self._normalize_service(service)

    def check_availability(
        self,
        service_id: str,
        target_date: Optional[str] = None,
        party_size: int = 1,
    ) -> NormalizedAvailability:
        """Check real-time slot records in service_availabilities."""
        try:
            uid = uuid.UUID(service_id)
        except (ValueError, TypeError):
            return NormalizedAvailability(
                service_id=service_id,
                status=AvailabilityStatus.UNAVAILABLE,
                is_available=False,
                reason="Invalid service UUID",
            )

        query = self.db.query(ServiceAvailability).filter(
            ServiceAvailability.service_id == uid,
            ServiceAvailability.is_blocked.is_(False),
        )
        if target_date:
            query = query.filter(ServiceAvailability.date == target_date)

        slots = query.order_by(ServiceAvailability.date.asc()).all()

        normalized_slots = []
        for s in slots:
            open_cap = max(0, (s.capacity or 10) - (s.booked_count or 0))
            if open_cap >= party_size:
                normalized_slots.append(
                    NormalizedAvailabilitySlot(
                        date=s.date,
                        start_time=s.start_time,
                        end_time=s.end_time,
                        open_capacity=open_cap,
                        price_override=float(s.price_override) if s.price_override is not None else None,
                    )
                )

        is_avail = len(normalized_slots) > 0 or len(slots) == 0  # open if unconstrained or matching slots exist
        total_open_cap = sum(sl.open_capacity for sl in normalized_slots) if normalized_slots else 10

        return NormalizedAvailability(
            service_id=service_id,
            status=AvailabilityStatus.AVAILABLE if is_avail else AvailabilityStatus.UNAVAILABLE,
            is_available=is_avail,
            available_capacity=total_open_cap,
            slots=normalized_slots,
            reason=None if is_avail else f"No open capacity for party size {party_size}",
        )

    def get_pricing(
        self,
        service_id: str,
        target_date: Optional[str] = None,
    ) -> NormalizedPricing:
        """Retrieve authoritative base and overridden price."""
        try:
            uid = uuid.UUID(service_id)
        except (ValueError, TypeError):
            return NormalizedPricing(service_id=service_id, base_price=0.0)

        service = self.repo.get_service_by_id(uid)
        if not service:
            return NormalizedPricing(service_id=service_id, base_price=0.0)

        base_price = float(service.price or 0.0)
        price_override = None

        if target_date:
            avail = self.db.query(ServiceAvailability).filter(
                ServiceAvailability.service_id == uid,
                ServiceAvailability.date == target_date,
                ServiceAvailability.price_override.isnot(None),
            ).first()
            if avail and avail.price_override is not None:
                price_override = float(avail.price_override)

        return NormalizedPricing(
            service_id=service_id,
            base_price=base_price,
            currency="INR",
            unit=service.unit or "person",
            tax_included=True,
            price_override=price_override,
        )

    def _normalize_service(self, service: Service) -> NormalizedProviderService:
        """Map SQLAlchemy Service entity to NormalizedProviderService."""
        provider_name = "Local Agro Host"
        provider_type = "Host"
        reliability_score = 0.90
        is_kyc = True

        if service.provider_id:
            app = self.db.query(PartnerApplication).filter(
                PartnerApplication.user_id == service.provider_id
            ).first()
            if app:
                provider_name = app.business_name or app.full_name or provider_name
                provider_type = app.role_type or provider_type
                is_kyc = app.status == "APPROVED"
                # Compute reliability score based on KYC and rating
                rating_factor = (float(service.rating or 4.5) / 5.0) * 0.5
                kyc_factor = 0.35 if is_kyc else 0.15
                reliability_score = round(min(1.0, rating_factor + kyc_factor + 0.15), 2)

        return NormalizedProviderService(
            service_id=str(service.id),
            provider_id=str(service.provider_id) if service.provider_id else "unknown",
            provider_name=provider_name,
            provider_type=provider_type,
            provider_reliability_score=reliability_score,
            is_kyc_verified=is_kyc,
            title=service.title,
            description=service.description,
            category=str(service.category) if service.category else "Activity",
            category_slug=str(service.category_slug) if service.category_slug else "activity",
            location=service.location or f"{service.district}, Karnataka",
            district=service.district or "Karnataka",
            state=service.state or "Karnataka",
            duration_minutes=int((service.duration_hours or 2.0) * 60) if hasattr(service, "duration_hours") and service.duration_hours else 120,
            base_price=float(service.price or 0.0),
            currency="INR",
            unit=service.unit or "person",
            max_capacity=service.max_capacity or 10,
            available_capacity=service.max_capacity or 10,
            availability_status=AvailabilityStatus.AVAILABLE if service.status == "PUBLISHED" else AvailabilityStatus.UNAVAILABLE,
            rating=float(service.rating or 4.8),
            reviews_count=service.reviews_count or 0,
            inclusions=self._safe_json_list(getattr(service, "inclusions_json", "[]")),
            amenities=self._safe_json_list(getattr(service, "amenities_json", "[]")),
            images=self._safe_json_list(getattr(service, "images_json", "[]")) or ([service.primary_image] if getattr(service, "primary_image", None) else []),
            data_source=ProviderDataSource.INTERNAL_MARKETPLACE,
            booking_handoff_info={
                "provider_id": str(service.provider_id) if service.provider_id else None,
                "service_code": getattr(service, "slug", None),
                "cancellation_policy": "STANDARD_48H",
            },
        )

    def _safe_json_list(self, val: Any) -> List[str]:
        if isinstance(val, list):
            return val
        if isinstance(val, str):
            try:
                import json
                res = json.loads(val)
                if isinstance(res, list):
                    return [str(x) for x in res]
            except Exception:
                pass
        return []
