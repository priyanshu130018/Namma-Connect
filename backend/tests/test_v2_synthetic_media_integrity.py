"""Tests for Synthetic Media Integrity and External URL Separation vs Cloudinary Real Uploads."""

import json
import uuid
from decimal import Decimal
import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models.user import User
from app.modules.marketplace.domain.models import Service, ServiceMedia
from app.modules.marketplace.application.service import MarketplaceService
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from scripts.seed_data.service_templates import IMAGE_POOLS, CATEGORY_CONFIGS
from app.services.media.cloudinary_storage import CloudinaryMediaStorage
from app.services.media.service import MediaService

def test_image_pools_use_unsplash_urls():
    """Verify all 10 category image pools in service_templates.py use external Unsplash URLs."""
    for category, urls in IMAGE_POOLS.items():
        assert len(urls) >= 3, f"Category {category} should have at least 3 images"
        for url in urls:
            assert url.startswith("https://images.unsplash.com/"), f"Expected Unsplash URL in {category}, got: {url}"
            assert "cloudinary" not in url.lower(), f"Cloudinary reference found in synthetic image pool: {url}"

def test_synthetic_service_serialization_uses_unsplash_and_dicebear(db_session: Session):
    """Verify synthetic service serialization uses direct Unsplash URLs and DiceBear avatars."""
    repo = MarketplaceRepository(db_session)
    marketplace_svc = MarketplaceService(repo)

    # Create synthetic service
    srv = Service(
        id=uuid.uuid4(),
        title="Test Synthetic Plantation Stay",
        slug="test-synthetic-plantation-stay",
        description="A beautiful organic farm experience.",
        category="Farm Tours & Experiences",
        category_slug="farm",
        location="Madikeri, Kodagu",
        district="Kodagu (Coorg)",
        state="Karnataka",
        price=Decimal("1200.00"),
        unit="night",
        rating=4.9,
        reviews_count=10,
        is_verified=True,
        status="PUBLISHED",
        provider_name="Appachu Belliappa",
        provider_type="Farmer",
        provider_avatar="https://api.dicebear.com/7.x/initials/svg?seed=Appachu Belliappa",
        primary_image="https://images.unsplash.com/photo-1500382017468-9049fed747ef",
        images_json=json.dumps([
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
            "https://images.unsplash.com/photo-1587061949409-02df41d5e562",
            "https://images.unsplash.com/photo-1592417817098-8f3d6eb2250d",
        ]),
        inclusions_json=json.dumps(["Breakfast", "Farm tour"]),
        amenities_json=json.dumps(["Wifi", "Parking"]),
        is_synthetic=True,
        is_test_data=True,
    )
    db_session.add(srv)
    db_session.commit()
    db_session.refresh(srv)

    serialized = marketplace_svc._serialize_service(srv)
    assert serialized["primary_image"].startswith("https://images.unsplash.com/")
    assert len(serialized["images"]) == 3
    for img in serialized["images"]:
        assert img.startswith("https://images.unsplash.com/")
    assert serialized["provider_avatar"].startswith("https://api.dicebear.com/")
    assert len(serialized["media"]) == 0  # No synthetic ServiceMedia rows

def test_real_provider_upload_supports_cloudinary_media_service(db_session: Session):
    """Verify real provider uploads continue using MediaService and Cloudinary infrastructure."""
    storage = CloudinaryMediaStorage()
    media_service = MediaService(storage=storage)

    # Test file validation
    valid_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 200
    storage.validate_file(valid_jpeg, "image/jpeg", resource_type="image")

    # Create real provider service with attached ServiceMedia
    provider = User(
        id=uuid.uuid4(),
        email="real.host@nammaconnect.dev",
        hashed_password="hash",
        full_name="Real Host",
        role="provider",
        is_synthetic=False,
    )
    db_session.add(provider)
    db_session.commit()

    srv = Service(
        id=uuid.uuid4(),
        title="Real Provider Homestay",
        slug="real-provider-homestay",
        description="Real verified homestay.",
        category="Farm Tours & Experiences",
        category_slug="farm",
        location="Chikkamagaluru",
        district="Chikkamagaluru",
        state="Karnataka",
        price=Decimal("2500.00"),
        unit="night",
        rating=5.0,
        reviews_count=1,
        is_verified=True,
        status="PUBLISHED",
        provider_id=provider.id,
        provider_name="Real Host",
        provider_type="Partner",
        provider_avatar=None,
        primary_image="https://res.cloudinary.com/namma-connect/services/real/cover.jpg",
        images_json="[]",
        inclusions_json="[]",
        amenities_json="[]",
        is_synthetic=False,
    )
    db_session.add(srv)
    db_session.commit()
    db_session.refresh(srv)

    media_item = ServiceMedia(
        id=uuid.uuid4(),
        service_id=srv.id,
        storage_provider="cloudinary",
        storage_key="namma-connect/services/real/cover",
        secure_url="https://res.cloudinary.com/namma-connect/services/real/cover.jpg",
        media_type="image",
        role="primary",
        sort_order=0,
        is_synthetic=False,
    )
    db_session.add(media_item)
    db_session.commit()
    db_session.refresh(srv)

    repo = MarketplaceRepository(db_session)
    marketplace_svc = MarketplaceService(repo)
    serialized = marketplace_svc._serialize_service(srv)
    assert serialized["primary_image"] == "https://res.cloudinary.com/namma-connect/services/real/cover.jpg"
    assert len(serialized["media"]) == 1
    assert serialized["media"][0]["storage_key"] == "namma-connect/services/real/cover"
