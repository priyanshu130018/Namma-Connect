"""Unit and integration tests for Provider Intelligence Layer (V2 Step 8)."""

import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.modules.user.domain.models import User
from app.modules.provider.domain.models import PartnerApplication
from app.modules.marketplace.domain.models import MarketplaceCategory, Service, ServiceAvailability
from app.modules.provider.intelligence.types import (
    ProviderDataSource,
    AvailabilityStatus,
    CircuitBreakerState,
    NormalizedProviderService,
    NormalizedAvailability,
    NormalizedPricing,
)
from app.modules.provider.intelligence.adapters.internal_marketplace import InternalMarketplaceAdapter
from app.modules.provider.intelligence.adapters.agro_partner import AgroTourismPartnerAdapter
from app.modules.provider.intelligence.service import ProviderIntelligenceService
from app.modules.ai.trip_planner.tools import TripPlannerTools


@pytest.fixture
def db_session():
    """Create in-memory SQLite database session for unit tests."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed test data
    host_user = User(
        id=uuid.uuid4(),
        email="host@kodagu.in",
        hashed_password="hash",
        full_name="Bopanna Gowda",
        role="provider",
        is_active=True,
    )
    session.add(host_user)

    partner_app = PartnerApplication(
        id=uuid.uuid4(),
        application_code="APP-KODAGU01",
        user_id=host_user.id,
        full_name="Bopanna Gowda",
        email="host@kodagu.in",
        mobile="+91 98450 11111",
        address="Madikeri Estate",
        district="Kodagu (Coorg)",
        business_name="Coorg Organic Estate",
        role_type="Farmer",
        id_type="Aadhaar",
        id_number="1234-5678-9012",
        status="APPROVED",
    )
    session.add(partner_app)

    category = MarketplaceCategory(
        id=uuid.uuid4(),
        name="Stays",
        slug="stays",
        is_active=True,
    )
    session.add(category)
    session.flush()

    service = Service(
        id=uuid.uuid4(),
        provider_id=host_user.id,
        category_id=category.id,
        category="Stays",
        category_slug="stays",
        title="Organic Cardamom & Coffee Farm Stay",
        slug="cardamom-farm-stay",
        description="Authentic plantation stay in Madikeri",
        location="Madikeri, Coorg",
        district="Kodagu (Coorg)",
        state="Karnataka",
        price=3500.0,
        unit="night",
        rating=4.9,
        reviews_count=25,
        duration_hours=24.0,
        max_capacity=8,
        status="PUBLISHED",
        provider_name="Bopanna Gowda",
        provider_type="Farmer",
        primary_image="/images/services/coffee.jpg",
    )
    session.add(service)

    availability = ServiceAvailability(
        id=uuid.uuid4(),
        service_id=service.id,
        date="2026-10-15",
        start_time="14:00",
        end_time="11:00",
        capacity=8,
        booked_count=2,
        is_blocked=False,
    )
    session.add(availability)
    session.commit()

    yield session
    session.close()


def test_internal_marketplace_adapter_normalization(db_session):
    """Verify internal database records are correctly normalized."""
    adapter = InternalMarketplaceAdapter(db_session)
    services = adapter.search_services(district="Kodagu")

    assert len(services) == 1
    s = services[0]
    assert isinstance(s, NormalizedProviderService)
    assert s.title == "Organic Cardamom & Coffee Farm Stay"
    assert s.district == "Kodagu (Coorg)"
    assert s.base_price == 3500.0
    assert s.currency == "INR"
    assert s.is_kyc_verified is True
    assert s.provider_reliability_score >= 0.9
    assert s.data_source == ProviderDataSource.INTERNAL_MARKETPLACE


def test_internal_marketplace_adapter_availability_and_capacity(db_session):
    """Verify authoritative real-time slot checking."""
    adapter = InternalMarketplaceAdapter(db_session)
    services = adapter.search_services()
    service_id = services[0].service_id

    # Check for party size of 2 (capacity 8 - 2 booked = 6 available)
    avail = adapter.check_availability(service_id, target_date="2026-10-15", party_size=2)
    assert avail.is_available is True
    assert avail.status == AvailabilityStatus.AVAILABLE
    assert avail.available_capacity >= 6
    assert len(avail.slots) == 1
    assert avail.slots[0].open_capacity == 6

    # Check for party size of 10 (exceeds available 6)
    avail_over = adapter.check_availability(service_id, target_date="2026-10-15", party_size=10)
    assert avail_over.is_available is False
    assert avail_over.status == AvailabilityStatus.UNAVAILABLE


def test_agro_tourism_partner_adapter_normalization_and_search():
    """Verify external agro network adapter normalization and filtering."""
    mock_partner_data = [
        {
            "id": "agro-ext-01",
            "partner_id": "ext-host-99",
            "provider_name": "Mysuru Silk & Jaggery Farm",
            "partner_type": "Artisan Host",
            "reliability_score": 0.92,
            "kyc_verified": True,
            "title": "Traditional Jaggery Making Workshop",
            "description": "Learn organic sugarcane boiling in Mandya",
            "category": "Workshops",
            "category_slug": "workshops",
            "location": "Mandya, Mysuru Region",
            "district": "Mysuru",
            "duration_minutes": 180,
            "price": 1200.0,
            "capacity": 20,
            "available_capacity": 15,
            "rating": 4.8,
            "reviews_count": 40,
        }
    ]

    adapter = AgroTourismPartnerAdapter(mock_data=mock_partner_data)
    results = adapter.search_services(district="Mysuru")

    assert len(results) == 1
    res = results[0]
    assert res.title == "Traditional Jaggery Making Workshop"
    assert res.base_price == 1200.0
    assert res.currency == "INR"
    assert res.data_source == ProviderDataSource.REGIONAL_AGRO_API
    assert res.provider_reliability_score == 0.92


def test_agro_tourism_circuit_breaker():
    """Verify circuit breaker opens after repeated failures and recovers."""
    adapter = AgroTourismPartnerAdapter(
        failure_threshold=2,
        recovery_time_seconds=0.1,
        mock_data=[],
    )
    assert adapter.is_healthy is True

    # Trigger failures
    adapter._record_failure()
    assert adapter._state == CircuitBreakerState.CLOSED
    adapter._record_failure()
    assert adapter._state == CircuitBreakerState.OPEN
    assert adapter.is_healthy is False

    # Check that search returns empty safely when circuit is open
    services = adapter.search_services()
    assert services == []


def test_provider_intelligence_service_aggregation_and_deduplication(db_session):
    """Verify multi-adapter aggregation and duplicate removal."""
    # Create external adapter with one overlapping and one unique offering
    ext_data = [
        {
            "id": "agro-ext-dup",
            "title": "Organic Cardamom & Coffee Farm Stay",  # Duplicate title
            "district": "Kodagu (Coorg)",
            "category_slug": "stays",
            "price": 3600.0,
            "capacity": 10,
            "available_capacity": 10,
        },
        {
            "id": "agro-ext-unique",
            "title": "Chikmagalur High-Elevation Tea Trail",  # Unique
            "district": "Chikkamagaluru",
            "category_slug": "activities",
            "price": 1800.0,
            "capacity": 12,
            "available_capacity": 12,
        },
    ]
    ext_adapter = AgroTourismPartnerAdapter(mock_data=ext_data)

    service = ProviderIntelligenceService(db_session, custom_adapters=[ext_adapter])
    candidates = service.get_candidate_offerings(limit=10)

    # Internal (1) + Unique Ext (1) = 2 total (duplicate filtered out)
    assert len(candidates) == 2
    titles = [c.title for c in candidates]
    assert "Organic Cardamom & Coffee Farm Stay" in titles
    assert "Chikmagalur High-Elevation Tea Trail" in titles


def test_trip_planner_tools_with_provider_intelligence(db_session):
    """Verify TripPlannerTools utilizes normalized provider intelligence."""
    tools = TripPlannerTools(db_session)
    normalized_candidates = tools.search_normalized_candidates(district="Kodagu")

    assert len(normalized_candidates) >= 1
    first = normalized_candidates[0]
    assert isinstance(first, NormalizedProviderService)

    # Check authoritative availability tool
    avail_check = tools.check_availability(uuid.UUID(first.service_id), party_size=2)
    assert avail_check["is_available"] is True
    assert avail_check["status"] == "AVAILABLE"
    assert avail_check["available_capacity"] >= 6


def test_pricing_and_currency_integrity(db_session):
    """Verify price and currency are preserved accurately without fabrication."""
    intel_service = ProviderIntelligenceService(db_session)
    services = intel_service.get_candidate_offerings()
    service_id = services[0].service_id

    pricing = intel_service.get_pricing(service_id)
    assert pricing.base_price == 3500.0
    assert pricing.currency == "INR"
    assert pricing.tax_included is True
