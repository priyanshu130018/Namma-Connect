"""Tests for TranslationService, Dynamic Content Translations, Security Sanitization, and Staleness Lifecycle."""

import pytest
import uuid
from app.services.translation import TranslationService
from app.models.translation import ContentTranslation
from app.models.user import User
from app.models.service import Service
from app.services.marketplace import MarketplaceService
from app.schemas.service import ServiceUpdatePayload


def test_translation_service_mock_dictionary():
    """Verify standard Kannada and Hindi translations for authentic tourism vocabulary."""
    kn_res = TranslationService.translate_text("Heritage Farm Stay", target_lang="kn")
    assert kn_res == "ಪರಂಪರೆ ಕೃಷಿ ವಾಸ್ತವ್ಯ"

    hi_res = TranslationService.translate_text("Heritage Farm Stay", target_lang="hi")
    assert hi_res == "विरासत फार्म स्टे"

    en_res = TranslationService.translate_text("Heritage Farm Stay", target_lang="en")
    assert en_res == "Heritage Farm Stay"


def test_translation_html_and_script_sanitization():
    """Verify XSS scripts and dangerous HTML markup are stripped during translation (Security Gate)."""
    malicious_text = "Farm Stay <script>alert('xss')</script><a href='javascript:steal()'>Click</a>"
    clean = TranslationService.sanitize_text(malicious_text)
    assert "<script>" not in clean
    assert "alert" not in clean
    assert "javascript:" not in clean
    assert "Farm Stay Click" in clean

    # Ensure translate_text sanitizes output
    translated = TranslationService.translate_text("<script>bad()</script>Heritage Farm Stay", target_lang="kn")
    assert "<script>" not in translated
    assert "ಪರಂಪರೆ ಕೃಷಿ ವಾಸ್ತವ್ಯ" in translated


def test_save_and_get_translated_field(db_session):
    """Test persisting translation to database and retrieving with cache integration."""
    service_id = str(uuid.uuid4())
    original_title = "Coorg Arabica Coffee Tour"

    # Save translation in Kannada
    record = TranslationService.save_translation(
        db=db_session,
        resource_type="service",
        resource_id=service_id,
        language="kn",
        field_name="title",
        translated_text="ಕೊಡಗು ಅರೇಬಿಕಾ ಕಾಫಿ ಪ್ರವಾಸ",
        source_lang="en",
    )
    assert record.id is not None
    assert record.translated_text == "ಕೊಡಗು ಅರೇಬಿಕಾ ಕಾಫಿ ಪ್ರವಾಸ"

    # Fetch translation via get_translated_field
    fetched_kn = TranslationService.get_translated_field(
        db=db_session,
        resource_type="service",
        resource_id=service_id,
        field_name="title",
        original_text=original_title,
        target_lang="kn",
        trigger_async=False,
    )
    assert fetched_kn == "ಕೊಡಗು ಅರೇಬಿಕಾ ಕಾಫಿ ಪ್ರವಾಸ"

    # Fetch English (source language) returns original directly
    fetched_en = TranslationService.get_translated_field(
        db=db_session,
        resource_type="service",
        resource_id=service_id,
        field_name="title",
        original_text=original_title,
        target_lang="en",
        trigger_async=False,
    )
    assert fetched_en == original_title


def test_mark_stale_and_translate_lifecycle(db_session):
    """Test stale marking and re-translation lifecycle when source content is updated."""
    service_id = str(uuid.uuid4())

    # 1. Save initial translation
    initial_rec = TranslationService.save_translation(
        db=db_session,
        resource_type="service",
        resource_id=service_id,
        language="kn",
        field_name="title",
        translated_text="ಹಳೆಯ ಹೆಸರು",
    )
    assert initial_rec.translated_text == "ಹಳೆಯ ಹೆಸರು"
    assert initial_rec.is_stale is False

    # 2. Mark stale directly in DB
    initial_rec.is_stale = True
    db_session.commit()
    db_session.refresh(initial_rec)
    assert initial_rec.is_stale is True

    # 3. Trigger mark_stale_and_translate_async
    TranslationService.mark_stale_and_translate_async(
        db=db_session,
        resource_type="service",
        resource_id=service_id,
        fields={"title": "Heritage Farm Stay"},
    )

    db_session.expire_all()
    updated_rec = (
        db_session.query(ContentTranslation)
        .filter(
            ContentTranslation.resource_type == "service",
            ContentTranslation.resource_id == service_id,
            ContentTranslation.language == "kn",
        )
        .first()
    )
    assert updated_rec is not None
    assert updated_rec.translated_text == "ಪರಂಪರೆ ಕೃಷಿ ವಾಸ್ತವ್ಯ"
    assert updated_rec.is_stale is False


def test_marketplace_update_triggers_translation_staleness(db_session):
    """Verify modifying service title or description in MarketplaceService invokes translation staleness."""
    # Create provider and service
    provider = User(
        email=f"prov_stale_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        full_name="Farm Host",
        role="provider",
        is_verified=True,
        is_active=True,
    )
    db_session.add(provider)
    db_session.commit()
    db_session.refresh(provider)

    service = Service(
        title="Initial Coffee Estate",
        slug=f"initial-coffee-{uuid.uuid4().hex[:6]}",
        description="Original description",
        category="stays",
        category_slug="stays",
        location="Coorg",
        district="Kodagu",
        state="Karnataka",
        price=3500.0,
        primary_image="https://res.cloudinary.com/nammaconnect/image/upload/sample.jpg",
        provider_id=provider.id,
        provider_name=provider.full_name,
        status="PUBLISHED",
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)

    # Initial translation
    TranslationService.save_translation(
        db=db_session,
        resource_type="service",
        resource_id=str(service.id),
        language="kn",
        field_name="title",
        translated_text="ಹಳೆಯ ಹೆಸರು",
    )

    # Update service title via MarketplaceService.update_partner_service
    payload = ServiceUpdatePayload(title="Heritage Farm Stay")
    MarketplaceService.update_partner_service(
        db=db_session,
        provider_id=provider.id,
        service_id=str(service.id),
        payload=payload,
    )

    db_session.expire_all()
    trans_rec = (
        db_session.query(ContentTranslation)
        .filter(
            ContentTranslation.resource_type == "service",
            ContentTranslation.resource_id == str(service.id),
            ContentTranslation.language == "kn",
        )
        .first()
    )
    assert trans_rec is not None
    assert trans_rec.translated_text == "ಪರಂಪರೆ ಕೃಷಿ ವಾಸ್ತವ್ಯ"


def test_gemini_translation_provider_structure(monkeypatch):
    """Verify Gemini translation uses prompt engineering and sanitizes returned text."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "AIzaSyTestMockKey1234567890")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")

    # Mock urllib response for Gemini
    class MockResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

        def read(self):
            return b'{"candidates": [{"content": {"parts": [{"text": "\\u0caa\\u0cb0\\u0c82\\u0caa\\u0cb0\\u0cc6 \\u0c95\\u0cc3\\u0cb7\\u0cbf \\u0cb5\\u0cbe\\u0cb8\\u0ccd\\u0ca4\\u0cb5\\u0ccd\\u0caf"}]}}]}'

    import urllib.request
    monkeypatch.setattr(urllib.request, "urlopen", lambda req, timeout=10: MockResponse())

    res = TranslationService.translate_via_gemini("Heritage Farm Stay", target_lang="kn")
    assert res == "ಪರಂಪರೆ ಕೃಷಿ ವಾಸ್ತವ್ಯ"


def test_gemini_free_tier_failure_preserves_original_in_production(monkeypatch):
    """Verify that when Gemini API is unconfigured or fails in production, original text is preserved without fabrication."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    # For an arbitrary text not in domain dictionary
    novel_text = "Unique Rustic Treehouse with Canopy View"
    translated = TranslationService.translate_text(novel_text, target_lang="kn")
    assert translated == novel_text  # Source text preserved cleanly as safe production fallback

