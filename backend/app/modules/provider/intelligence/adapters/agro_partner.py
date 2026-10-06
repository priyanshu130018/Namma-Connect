"""Agro-Tourism Regional Partner Adapter with Circuit Breaker and Resilient Fallback."""

import time
from typing import List, Optional, Dict, Any
from app.modules.provider.intelligence.adapters.base import BaseProviderAdapter
from app.modules.provider.intelligence.types import (
    NormalizedProviderService,
    NormalizedAvailability,
    NormalizedAvailabilitySlot,
    NormalizedPricing,
    ProviderDataSource,
    AvailabilityStatus,
    CircuitBreakerState,
)


class AgroTourismPartnerAdapter(BaseProviderAdapter):
    """Adapter for external agro-tourism network APIs with built-in resilience."""

    def __init__(
        self,
        api_endpoint: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout_seconds: float = 2.0,
        failure_threshold: int = 3,
        recovery_time_seconds: float = 30.0,
        mock_data: Optional[List[Dict[str, Any]]] = None,
    ):
        self.api_endpoint = api_endpoint
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.failure_threshold = failure_threshold
        self.recovery_time_seconds = recovery_time_seconds
        self.mock_data = mock_data or []

        # Circuit breaker state
        self._state = CircuitBreakerState.CLOSED
        self._failure_count = 0
        self._last_failure_time = 0.0

    @property
    def source_type(self) -> ProviderDataSource:
        return ProviderDataSource.REGIONAL_AGRO_API

    @property
    def is_healthy(self) -> bool:
        self._check_recovery()
        return self._state != CircuitBreakerState.OPEN

    def search_services(
        self,
        district: Optional[str] = None,
        category_slug: Optional[str] = None,
        max_price: Optional[float] = None,
        limit: int = 20,
    ) -> List[NormalizedProviderService]:
        """Query external agro network with circuit breaker protection."""
        if not self.is_healthy:
            return []

        try:
            # Simulate or execute external partner API fetch
            results = []
            for item in self.mock_data:
                if district and district.lower() not in item.get("district", "").lower():
                    continue
                if category_slug and category_slug.lower() not in item.get("category_slug", "").lower():
                    continue
                if max_price and float(item.get("price", 0)) > max_price:
                    continue
                results.append(self._normalize_external_item(item))

            self._record_success()
            return results[:limit]
        except Exception as e:
            self._record_failure()
            return []

    def get_service_by_id(self, service_id: str) -> Optional[NormalizedProviderService]:
        if not self.is_healthy:
            return None

        try:
            for item in self.mock_data:
                if item.get("id") == service_id:
                    self._record_success()
                    return self._normalize_external_item(item)
            return None
        except Exception:
            self._record_failure()
            return None

    def check_availability(
        self,
        service_id: str,
        target_date: Optional[str] = None,
        party_size: int = 1,
    ) -> NormalizedAvailability:
        if not self.is_healthy:
            return NormalizedAvailability(
                service_id=service_id,
                status=AvailabilityStatus.UNVERIFIED,
                is_available=False,
                reason="External provider network is currently unavailable (circuit open).",
            )

        svc = self.get_service_by_id(service_id)
        if not svc:
            return NormalizedAvailability(
                service_id=service_id,
                status=AvailabilityStatus.UNAVAILABLE,
                is_available=False,
                reason="Service not found in partner catalog",
            )

        is_avail = svc.available_capacity >= party_size
        return NormalizedAvailability(
            service_id=service_id,
            status=AvailabilityStatus.AVAILABLE if is_avail else AvailabilityStatus.UNAVAILABLE,
            is_available=is_avail,
            available_capacity=svc.available_capacity,
            slots=svc.date_slots,
            reason=None if is_avail else f"Requested {party_size} exceeds capacity {svc.available_capacity}",
        )

    def get_pricing(
        self,
        service_id: str,
        target_date: Optional[str] = None,
    ) -> NormalizedPricing:
        svc = self.get_service_by_id(service_id)
        if not svc:
            return NormalizedPricing(service_id=service_id, base_price=0.0)

        return NormalizedPricing(
            service_id=service_id,
            base_price=svc.base_price,
            currency=svc.currency,
            unit=svc.unit,
            tax_included=True,
        )

    def _normalize_external_item(self, item: Dict[str, Any]) -> NormalizedProviderService:
        return NormalizedProviderService(
            service_id=str(item.get("id", "")),
            provider_id=str(item.get("partner_id", "external-partner")),
            provider_name=item.get("provider_name", "Regional Agro Network"),
            provider_type=item.get("partner_type", "AgroPartner"),
            provider_reliability_score=float(item.get("reliability_score", 0.88)),
            is_kyc_verified=bool(item.get("kyc_verified", True)),
            title=item.get("title", "Agro Experience"),
            description=item.get("description"),
            category=item.get("category", "Activity"),
            category_slug=item.get("category_slug", "activity"),
            location=item.get("location", "Karnataka"),
            district=item.get("district", "Karnataka"),
            state="Karnataka",
            duration_minutes=int(item.get("duration_minutes", 120)),
            base_price=float(item.get("price", 0.0)),
            currency=item.get("currency", "INR"),
            unit=item.get("unit", "person"),
            max_capacity=int(item.get("capacity", 15)),
            available_capacity=int(item.get("available_capacity", 15)),
            availability_status=AvailabilityStatus.AVAILABLE,
            rating=float(item.get("rating", 4.7)),
            reviews_count=int(item.get("reviews_count", 10)),
            inclusions=item.get("inclusions", []),
            amenities=item.get("amenities", []),
            images=item.get("images", []),
            data_source=ProviderDataSource.REGIONAL_AGRO_API,
            booking_handoff_info={"partner_code": item.get("partner_code")},
            raw_metadata=item,
        )

    def _record_success(self):
        self._failure_count = 0
        self._state = CircuitBreakerState.CLOSED

    def _record_failure(self):
        self._failure_count += 1
        self._last_failure_time = time.time()
        if self._failure_count >= self.failure_threshold:
            self._state = CircuitBreakerState.OPEN

    def _check_recovery(self):
        if self._state == CircuitBreakerState.OPEN:
            if time.time() - self._last_failure_time > self.recovery_time_seconds:
                self._state = CircuitBreakerState.HALF_OPEN
