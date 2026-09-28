"""Provider Intelligence Domain Types and Normalization Schemas."""

import enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ProviderDataSource(str, enum.Enum):
    """Origin source of provider offerings."""
    INTERNAL_MARKETPLACE = "INTERNAL_MARKETPLACE"
    REGIONAL_AGRO_API = "REGIONAL_AGRO_API"
    EXTERNAL_PARTNER_API = "EXTERNAL_PARTNER_API"
    SANDBOX = "SANDBOX"


class AvailabilityStatus(str, enum.Enum):
    """Authoritative availability state."""
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    UNVERIFIED = "UNVERIFIED"


class CircuitBreakerState(str, enum.Enum):
    """Circuit breaker operational state."""
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class NormalizedAvailabilitySlot(BaseModel):
    """Normalized schedule/slot window."""
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    open_capacity: int = 1
    price_override: Optional[float] = None


class NormalizedAvailability(BaseModel):
    """Normalized availability response."""
    service_id: str
    status: AvailabilityStatus = AvailabilityStatus.AVAILABLE
    is_available: bool = True
    available_capacity: int = 1
    slots: List[NormalizedAvailabilitySlot] = []
    reason: Optional[str] = None


class NormalizedPricing(BaseModel):
    """Normalized authoritative pricing structure."""
    service_id: str
    base_price: float
    currency: str = "INR"
    unit: str = "person"
    tax_included: bool = True
    price_override: Optional[float] = None
    notes: Optional[str] = None


class NormalizedProviderService(BaseModel):
    """Unified normalized structure for all provider activities and farm stays."""
    service_id: str
    provider_id: str
    provider_name: str
    provider_type: str = "Host"
    provider_reliability_score: float = Field(default=0.9, ge=0.0, le=1.0)
    is_kyc_verified: bool = True
    title: str
    description: Optional[str] = None
    category: str
    category_slug: str
    location: str
    district: str
    state: str = "Karnataka"
    duration_minutes: int = 120
    base_price: float
    currency: str = "INR"
    unit: str = "person"
    max_capacity: int = 10
    available_capacity: int = 10
    availability_status: AvailabilityStatus = AvailabilityStatus.AVAILABLE
    date_slots: List[NormalizedAvailabilitySlot] = []
    rating: float = 4.8
    reviews_count: int = 0
    inclusions: List[str] = []
    amenities: List[str] = []
    images: List[str] = []
    data_source: ProviderDataSource = ProviderDataSource.INTERNAL_MARKETPLACE
    booking_handoff_info: Dict[str, Any] = {}
    raw_metadata: Dict[str, Any] = {}
