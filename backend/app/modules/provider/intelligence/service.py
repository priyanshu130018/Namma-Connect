"""Provider Intelligence Service orchestrating multi-adapter candidate discovery and validation."""

import re
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.modules.provider.intelligence.adapters.base import BaseProviderAdapter
from app.modules.provider.intelligence.adapters.internal_marketplace import InternalMarketplaceAdapter
from app.modules.provider.intelligence.types import (
    NormalizedProviderService,
    NormalizedAvailability,
    NormalizedPricing,
    AvailabilityStatus,
)


class ProviderIntelligenceService:
    """Core intelligence engine coordinating multi-provider discovery, reliability scoring, and authoritative validation."""

    def __init__(self, db: Session, custom_adapters: Optional[List[BaseProviderAdapter]] = None):
        self.db = db
        self.adapters: List[BaseProviderAdapter] = [InternalMarketplaceAdapter(db)]
        if custom_adapters:
            self.adapters.extend(custom_adapters)

    def register_adapter(self, adapter: BaseProviderAdapter):
        """Register an additional provider adapter."""
        self.adapters.append(adapter)

    def get_candidate_offerings(
        self,
        district: Optional[str] = None,
        category_slug: Optional[str] = None,
        max_price: Optional[float] = None,
        party_size: int = 1,
        limit: int = 20,
    ) -> List[NormalizedProviderService]:
        """Discover and aggregate candidate services across all active adapters with deduplication & reliability ranking."""
        raw_candidates: List[NormalizedProviderService] = []

        # Query all healthy adapters
        for adapter in self.adapters:
            if not adapter.is_healthy:
                continue
            try:
                services = adapter.search_services(
                    district=district,
                    category_slug=category_slug,
                    max_price=max_price,
                    limit=limit,
                )
                raw_candidates.extend(services)
            except Exception:
                # Isolate adapter failure; do not let one adapter fail the pipeline
                continue

        # Deduplicate candidates across sources
        deduped = self._deduplicate_candidates(raw_candidates)

        # Filter by party capacity if specified
        valid_capacity = [s for s in deduped if s.available_capacity >= party_size]

        # Rank candidates by (reliability_score * 0.4 + (rating/5.0) * 0.4 + kyc_boost * 0.2)
        ranked = sorted(
            valid_capacity,
            key=lambda s: (
                s.provider_reliability_score * 0.4
                + (s.rating / 5.0) * 0.4
                + (0.2 if s.is_kyc_verified else 0.05)
            ),
            reverse=True,
        )

        return ranked[:limit]

    def get_service_details(self, service_id: str) -> Optional[NormalizedProviderService]:
        """Fetch authoritative normalized service from the appropriate adapter."""
        for adapter in self.adapters:
            if not adapter.is_healthy:
                continue
            try:
                svc = adapter.get_service_by_id(service_id)
                if svc:
                    return svc
            except Exception:
                continue
        return None

    def verify_availability(
        self,
        service_id: str,
        target_date: Optional[str] = None,
        party_size: int = 1,
    ) -> NormalizedAvailability:
        """Query authoritative availability across adapters."""
        for adapter in self.adapters:
            if not adapter.is_healthy:
                continue
            try:
                avail = adapter.check_availability(service_id, target_date, party_size)
                if avail.status != AvailabilityStatus.UNVERIFIED or avail.is_available:
                    return avail
            except Exception:
                continue

        return NormalizedAvailability(
            service_id=service_id,
            status=AvailabilityStatus.UNAVAILABLE,
            is_available=False,
            reason="Unable to verify provider availability.",
        )

    def get_pricing(
        self,
        service_id: str,
        target_date: Optional[str] = None,
    ) -> NormalizedPricing:
        """Query authoritative price across adapters."""
        for adapter in self.adapters:
            if not adapter.is_healthy:
                continue
            try:
                pricing = adapter.get_pricing(service_id, target_date)
                if pricing.base_price > 0:
                    return pricing
            except Exception:
                continue

        return NormalizedPricing(service_id=service_id, base_price=0.0)

    def _deduplicate_candidates(
        self, candidates: List[NormalizedProviderService]
    ) -> List[NormalizedProviderService]:
        """Deduplicate candidate services across internal and external adapters by normalized title & location."""
        seen_keys = set()
        unique_results = []

        for item in candidates:
            norm_title = re.sub(r"[^a-zA-Z0-9]", "", item.title.lower())
            norm_loc = re.sub(r"[^a-zA-Z0-9]", "", item.district.lower())
            key = f"{norm_title}_{norm_loc}"

            if key not in seen_keys:
                seen_keys.add(key)
                unique_results.append(item)

        return unique_results
