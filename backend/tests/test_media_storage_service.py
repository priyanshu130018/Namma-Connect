"""Tests for Media Storage Abstraction and Cloudinary Integration for Real Uploads."""

import json
import uuid
import pytest
from unittest.mock import patch, MagicMock
from app.services.media.base import BaseMediaStorage
from app.services.media.cloudinary_storage import CloudinaryMediaStorage
from app.services.media.service import MediaService, get_media_storage
from app.modules.marketplace.domain.models import Service, ServiceMedia, MarketplaceCategory
from app.modules.marketplace.application.service import MarketplaceService


def test_media_storage_factory():
    """Verify get_media_storage returns configured storage backend."""
    storage = get_media_storage()
    assert isinstance(storage, BaseMediaStorage)
    assert isinstance(storage, CloudinaryMediaStorage)


def test_cloudinary_storage_upload_and_url_generation():
    """Verify upload returns standard dict with public_id, url, and metadata."""
    storage = CloudinaryMediaStorage()
    dummy_bytes = b"fake_jpeg_image_data_12345"

    res = storage.upload(
        file_bytes=dummy_bytes,
        filename="scenic_coorg.jpg",
        folder="namma-connect/services/test",
        content_type="image/jpeg",
        public_id="namma-connect/services/test/scenic_coorg_custom",
    )

    assert res["public_id"] == "namma-connect/services/test/scenic_coorg_custom"
    assert "cloudinary.com" in res["url"]
    assert res["storage_provider"] == "cloudinary"
    assert res["format"] == "jpg"
    assert res["bytes"] == len(dummy_bytes)


def test_cloudinary_storage_validation():
    """Verify MIME and size validations."""
    storage = CloudinaryMediaStorage()

    with pytest.raises(Exception):
        # Empty bytes
        storage.upload(b"", "empty.jpg", content_type="image/jpeg")

    with pytest.raises(Exception):
        # Disallowed MIME
        storage.upload(b"executable content", "script.exe", content_type="application/x-msdownload")


def test_cloudinary_storage_delete():
    """Verify delete operation returns success."""
    storage = CloudinaryMediaStorage()
    del_res = storage.delete("namma-connect/services/test/to_delete")
    assert del_res["status"] == "deleted"
    assert del_res["public_id"] == "namma-connect/services/test/to_delete"


def test_media_service_upload_service_media(db_session):
    """Verify MediaService creates and persists ServiceMedia database entity."""
    media_svc = MediaService()
    test_svc_id = uuid.uuid4()

    # Create dummy service first
    srv = Service(
        id=test_svc_id,
        title="Test Estate Homestay",
        slug=f"test-estate-{uuid.uuid4().hex[:6]}",
        description="A quiet coffee plantation stay.",
        category="Stays",
        category_slug="farm",
        location="Madikeri, Kodagu",
        district="Kodagu (Coorg)",
        price=3500.0,
        primary_image="https://res.cloudinary.com/namma-connect-dev/image/upload/sample.jpg",
        images_json="[]",
        provider_name="Ramesh",
        is_synthetic=False,
    )
    db_session.add(srv)
    db_session.commit()

    media_item = media_svc.upload_service_media(
        db=db_session,
        service_id=test_svc_id,
        file_bytes=b"sample_image_bytes",
        filename="cover.jpg",
        role="primary",
        sort_order=0,
        is_synthetic=False,
        custom_public_id=f"namma-connect/services/real/farm/{test_svc_id}/cover",
    )
    db_session.commit()

    assert media_item.id is not None
    assert media_item.service_id == test_svc_id
    assert media_item.role == "primary"
    assert media_item.storage_provider == "cloudinary"
    assert "namma-connect/services/real/farm" in media_item.storage_key

    # Query from database to verify persistence
    saved_media = db_session.query(ServiceMedia).filter(ServiceMedia.id == media_item.id).first()
    assert saved_media is not None
    assert saved_media.storage_key == media_item.storage_key


def test_api_service_serialization_with_service_media(db_session):
    """Verify MarketplaceService._serialize_service correctly reads ServiceMedia."""
    mp_svc = MarketplaceService(db_session)
    test_svc_id = uuid.uuid4()

    srv = Service(
        id=test_svc_id,
        title="Kabini Wildlife Camp",
        slug=f"kabini-camp-{uuid.uuid4().hex[:6]}",
        description="Camp near Kabini river.",
        category="Wildlife Tours",
        category_slug="wildlife",
        location="HD Kote, Mysuru",
        district="Mysuru (Mysore)",
        price=4200.0,
        primary_image="https://res.cloudinary.com/namma-connect-dev/image/upload/fallback.jpg",
        images_json=json.dumps(["https://res.cloudinary.com/namma-connect-dev/image/upload/fallback.jpg"]),
        provider_name="Anand Rao",
        is_synthetic=False,
    )
    db_session.add(srv)
    db_session.flush()

    media_1 = ServiceMedia(
        id=uuid.uuid4(),
        service_id=test_svc_id,
        storage_provider="cloudinary",
        storage_key=f"namma-connect/services/real/wildlife/{test_svc_id}/cover",
        secure_url="https://res.cloudinary.com/namma-connect-dev/image/upload/namma-connect/services/real/wildlife/cover.jpg",
        media_type="image",
        role="primary",
        sort_order=0,
        is_synthetic=False,
    )
    media_2 = ServiceMedia(
        id=uuid.uuid4(),
        service_id=test_svc_id,
        storage_provider="cloudinary",
        storage_key=f"namma-connect/services/real/wildlife/{test_svc_id}/gallery_1",
        secure_url="https://res.cloudinary.com/namma-connect-dev/image/upload/namma-connect/services/real/wildlife/gallery_1.jpg",
        media_type="image",
        role="gallery",
        sort_order=1,
        is_synthetic=False,
    )
    db_session.add_all([media_1, media_2])
    db_session.commit()

    serialized = mp_svc._serialize_service(srv)
    assert serialized["primary_image"] == "https://res.cloudinary.com/namma-connect-dev/image/upload/namma-connect/services/real/wildlife/cover.jpg"
    assert len(serialized["images"]) == 2
    assert len(serialized["media"]) == 2
    assert serialized["media"][0]["role"] == "primary"
    assert serialized["media"][1]["role"] == "gallery"
