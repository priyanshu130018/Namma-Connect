import sys
from pathlib import Path

# Ensure backend root directory is on sys.path whether pytest is invoked from root or backend/
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app as fastapi_app
from app.core.database import Base, get_db
import app.models  # noqa
from app.core.config import settings
settings.ENV = "test"
from app.core.celery_app import celery_app
celery_app.conf.update(task_always_eager=True, broker_connection_retry_on_startup=False)

# In-memory SQLite with StaticPool for test isolation
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine
)


def seed_test_fixture_services(db):
    from app.core.security import get_password_hash
    from app.models.user import User
    from app.models.service import Service, ServiceAvailability
    import uuid

    # Isolated test fixture partner
    test_partner = db.query(User).filter(User.id == uuid.UUID("11111111-1111-1111-1111-111111111111")).first()
    if not test_partner:
        test_partner = User(
            id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            email="seed.partner.bopaiah@nammaconnect.test",
            hashed_password=get_password_hash("Password123!"),
            full_name="Bopaiah Kuttappa",
            mobile="+919999999999",
            role="provider",
            is_active=True,
            is_verified=True,
            phone_verified=True,
            auth_provider="local",
            is_test_data=True,
        )
        db.add(test_partner)
        db.commit()

    # Isolated test fixture services
    services_fixtures = [
        Service(
            id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
            title="Organic Cardamom Farm Stay",
            slug="organic-cardamom-farm-stay-madikeri",
            description="Immerse yourself in lush cardamom and pepper estates in Madikeri.",
            category="Homestays & Farm Stays",
            category_slug="stay",
            location="Madikeri, Coorg, Karnataka",
            district="Kodagu",
            state="Karnataka",
            latitude=12.4244,
            longitude=75.7382,
            price=2500.0,
            unit="night",
            duration_hours=24.0,
            max_capacity=8,
            rating=4.8,
            reviews_count=12,
            is_verified=True,
            status="PUBLISHED",
            provider_id=test_partner.id,
            provider_name=test_partner.full_name,
            provider_type="Estate Host",
            primary_image="https://images.unsplash.com/photo-1587061949409-02df41d5e562",
            images_json='["https://images.unsplash.com/photo-1587061949409-02df41d5e562"]',
            inclusions_json='["Traditional Kodava Breakfast", "Cardamom Trail Walk", "Campfire"]',
            amenities_json='["Wi-Fi", "Free Parking", "Hot Water", "Local Cuisine"]',
            is_test_data=True,
        ),
        Service(
            id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
            title="Coffee Estate Harvesting Experience",
            slug="coffee-estate-harvesting-chikmagalur",
            description="Hands-on Arabica & Robusta coffee cherry picking and pulping workshop.",
            category="Farm Tours & Experiences",
            category_slug="farm",
            location="Chikmagalur, Karnataka",
            district="Chikmagalur",
            state="Karnataka",
            latitude=13.3161,
            longitude=75.7720,
            price=850.0,
            unit="person",
            duration_hours=3.5,
            max_capacity=15,
            rating=4.9,
            reviews_count=18,
            is_verified=True,
            status="PUBLISHED",
            provider_id=test_partner.id,
            provider_name=test_partner.full_name,
            provider_type="Farmer",
            primary_image="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb",
            images_json='["https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb"]',
            inclusions_json='["Coffee Tasting", "Basket & Harvesting Tools", "Estate Walk"]',
            amenities_json='["Drinking Water", "Restrooms", "Guide"]',
            is_test_data=True,
        ),
        Service(
            id=uuid.UUID("44444444-4444-4444-4444-444444444444"),
            title="Western Ghats Trek & Camping",
            slug="western-ghats-trek-sakleshpur",
            description="Guided trek along the ridge lines with ridge-top tent stay.",
            category="Adventure & Trekking",
            category_slug="adventure",
            location="Sakleshpur, Hassan, Karnataka",
            district="Hassan",
            state="Karnataka",
            latitude=12.9442,
            longitude=75.7865,
            price=1200.0,
            unit="person",
            duration_hours=6.0,
            max_capacity=12,
            rating=4.7,
            reviews_count=8,
            is_verified=True,
            status="PUBLISHED",
            provider_id=test_partner.id,
            provider_name=test_partner.full_name,
            provider_type="Adventure Guide",
            primary_image="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
            images_json='["https://images.unsplash.com/photo-1464822759023-fed622ff2c3b"]',
            inclusions_json='["Safety Equipment", "Packed Energy Snacks", "First Aid Support"]',
            amenities_json='["Tents", "Campfire", "First Aid"]',
            is_test_data=True,
        ),
    ]
    for s in services_fixtures:
        existing = db.query(Service).filter(Service.id == s.id).first()
        if not existing:
            db.add(s)
    db.commit()

    # Test availability fixtures
    for s in services_fixtures:
        for day_offset in range(1, 15):
            from datetime import datetime, timedelta
            d_str = (datetime.now() + timedelta(days=day_offset)).strftime("%Y-%m-%d")
            existing_avail = db.query(ServiceAvailability).filter(
                ServiceAvailability.service_id == s.id,
                ServiceAvailability.date == d_str,
            ).first()
            if not existing_avail:
                db.add(ServiceAvailability(
                    service_id=s.id,
                    date=d_str,
                    start_time="09:00",
                    end_time="12:00",
                    slot_label="Morning Slot",
                    capacity=10,
                ))
    db.commit()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    import app.core.database as core_db
    orig_session_local = core_db.SessionLocal
    core_db.SessionLocal = TestingSessionLocal
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        from app.services.marketplace import MarketplaceService
        MarketplaceService.ensure_seeded(db)
        seed_test_fixture_services(db)
    finally:
        db.close()
    yield
    core_db.SessionLocal = orig_session_local
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session(setup_test_db):
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()
