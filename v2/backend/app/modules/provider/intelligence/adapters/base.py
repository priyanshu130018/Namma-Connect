"""Base abstract adapter for provider integrations."""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from app.modules.provider.intelligence.types import (
    NormalizedProviderService,
    NormalizedAvailability,
    NormalizedPricing,
    ProviderDataSource,
)


class BaseProviderAdapter(ABC):
    """Abstract interface that all provider adapters must implement."""

    @property
    @abstractmethod
    def source_type(self) -> ProviderDataSource:
        """Provider data source enum."""
        pass

    @property
    @abstractmethod
    def is_healthy(self) -> bool:
        """Check if provider connection is healthy."""
        pass

    @abstractmethod
    def search_services(
        self,
        district: Optional[str] = None,
        category_slug: Optional[str] = None,
        max_price: Optional[float] = None,
        limit: int = 20,
    ) -> List[NormalizedProviderService]:
        """Search and normalize candidate services from this provider."""
        pass

    @abstractmethod
    def get_service_by_id(self, service_id: str) -> Optional[NormalizedProviderService]:
        """Fetch and normalize a specific service by its identifier."""
        pass

    @abstractmethod
    def check_availability(
        self,
        service_id: str,
        target_date: Optional[str] = None,
        party_size: int = 1,
    ) -> NormalizedAvailability:
        """Verify real-time availability and open capacity."""
        pass

    @abstractmethod
    def get_pricing(
        self,
        service_id: str,
        target_date: Optional[str] = None,
    ) -> NormalizedPricing:
        """Retrieve authoritative pricing for service."""
        pass
