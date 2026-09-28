"""Dynamic Content Translation Service for NammaConnect V2."""

import re
import json
import uuid
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging import logger
from app.models.translation import ContentTranslation
from app.services.redis_service import RedisService

# Standard vocabulary for authentic Karnataka rural tourism localization fallback
MOCK_TRANSLATION_DICTIONARY = {
    "kn": {
        "Heritage Farm Stay": "ಪರಂಪರೆ ಕೃಷಿ ವಾಸ್ತವ್ಯ",
        "Coffee Plantation Retreat": "ಕಾಫಿ ತೋಟದ ರೆಸಾರ್ಟ್",
        "Pottery Workshop": "ಮಣ್ಣಿನ ಪಾತ್ರೆಗಳ ಕಾರ್ಯಾಗಾರ",
        "Organic Mango Farm": "ಸಾವಯವ ಮಾವಿನ ತೋಟ",
        "Rural Village Experience": "ಗ್ರಾಮೀಣ ಹಳ್ಳಿ ಅನುಭವ",
        "Paddy Retreat": "ಭತ್ತದ ಗದ್ದೆ ತಂಗುದಾಣ",
        "Traditional Pottery Making": "ಸಾಂಪ್ರದಾಯಿಕ ಮಣ್ಣಿನ ಪಾತ್ರೆ ತಯಾರಿಕೆ",
        "Coorg Arabica Coffee Tour": "ಕೊಡಗು ಅರೇಬಿಕಾ ಕಾಫಿ ಪ್ರವಾಸ",
        "Western Ghats Nature Walk": "ಪಶ್ಚಿಮ ಘಟ್ಟಗಳ ಪ್ರಕೃತಿ ನಡಿಗೆ",
        "Karnataka Rural Living": "ಕರ್ನಾಟಕ ಗ್ರಾಮೀಣ ಜೀವನ",
        "Experience": "ಅನುಭವ",
        "Farm Stay": "ಫಾರ್ಮ್ ಸ್ಟೇ",
        "Activity": "ಚಟುವಟಿಕೆ",
    },
    "hi": {
        "Heritage Farm Stay": "विरासत फार्म स्टे",
        "Coffee Plantation Retreat": "कॉफी बागान रिट्रीट",
        "Pottery Workshop": "मिट्टी के बर्तन कार्यशाला",
        "Organic Mango Farm": "जैविक आम का बगीचा",
        "Rural Village Experience": "ग्रामीण गांव का अनुभव",
        "Paddy Retreat": "धान के खेत का अनुभव",
        "Traditional Pottery Making": "पारंपरिक मिट्टी के बर्तन बनाना",
        "Coorg Arabica Coffee Tour": "कूर्ग अरेबिका कॉफी यात्रा",
        "Western Ghats Nature Walk": "पश्चिमी घाट प्रकृति भ्रमण",
        "Karnataka Rural Living": "कर्नाटक ग्रामीण जीवन",
        "Experience": "अनुभव",
        "Farm Stay": "फार्म स्टे",
        "Activity": "गतिविधि",
    },
}


class TranslationService:
    """Enterprise domain service managing dynamic content translation with Redis caching and asynchronous Celery workers.
    
    Architecture:
    - Primary Engine: Google Gemini API (via GEMINI_API_KEY) / Google Cloud Translation v2 REST API (via GEMINI_API_KEY)
    - Fallback Engine: Domain Dictionary for Karnataka Rural Tourism (Development/Test)
    - Storage / Cache: PostgreSQL content_translations table + Redis Cache
    - Resolution Path: Redis -> PostgreSQL -> Async Celery Translation Task
    """

    SUPPORTED_LANGUAGES = ["en", "kn", "hi"]
    CACHE_TTL = 86400  # 24 hours

    @classmethod
    def sanitize_text(cls, text: str) -> str:
        """Sanitize text to prevent HTML injection, XSS scripts, or unsafe markup."""
        if not text:
            return ""
        # Strip dangerous HTML script tags, event handlers, and javascript: protocols
        cleaned = re.sub(r"<script.*?>.*?</script>", "", text, flags=re.IGNORECASE | re.DOTALL)
        cleaned = re.sub(r"javascript:", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"<[^>]+>", "", cleaned)
        return cleaned.strip()

    @classmethod
    def is_provider_configured(cls) -> bool:
        """Check if live Gemini translation API credentials are configured."""
        return bool(getattr(settings, "GEMINI_API_KEY", None) and str(settings.GEMINI_API_KEY).strip())

    @classmethod
    def _cache_key(cls, resource_type: str, resource_id: str, language: str, field_name: str) -> str:
        return f"trans:{resource_type}:{resource_id}:{language}:{field_name}"

    @classmethod
    def translate_via_gemini(cls, text: str, target_lang: str, source_lang: str = "en") -> Optional[str]:
        """Translate text via Google Gemini Free-tier API with prompt engineering."""
        gemini_key = getattr(settings, "GEMINI_API_KEY", None)
        if not gemini_key or not gemini_key.strip():
            return None

        try:
            model_name = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite")
            if model_name.startswith("models/"):
                model_name = model_name.replace("models/", "")

            base_url = getattr(settings, "GEMINI_API_URL", "https://generativelanguage.googleapis.com/v1beta/models").rstrip("/")
            url = f"{base_url}/{model_name}:generateContent"

            target_lang_name = "Kannada" if target_lang == "kn" else ("Hindi" if target_lang == "hi" else target_lang)
            source_lang_name = "English" if source_lang == "en" else source_lang

            prompt = (
                f"You are a professional multilingual translator for Karnataka rural tourism and cultural experiences.\n"
                f"Translate the following {source_lang_name} text accurately into {target_lang_name}.\n"
                f"Return ONLY the raw translated {target_lang_name} text without markdown formatting, quotes, explanations, or introductory text.\n\n"
                f"Text to translate:\n{text}"
            )

            body = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                },
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(body).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": gemini_key,
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts and "text" in parts[0]:
                        raw_translated = parts[0]["text"].strip()
                        return cls.sanitize_text(raw_translated)
        except Exception as e:
            logger.warning(f"Gemini translation provider failed: {e}")
        return None

    @classmethod
    def translate_text(cls, text: str, target_lang: str, source_lang: str = "en") -> str:
        """Translate raw text to target language via live Gemini API, domain dictionary, or safe fallback."""
        if not text or target_lang == source_lang:
            return text

        if target_lang not in cls.SUPPORTED_LANGUAGES:
            return text

        # Sanitize source text
        clean_text = cls.sanitize_text(text)

        # 1. Live Google Gemini API (Sole active dynamic translation provider)
        if getattr(settings, "GEMINI_API_KEY", None) and settings.ENV not in ["test", "testing"]:
            gemini_res = cls.translate_via_gemini(clean_text, target_lang, source_lang)
            if gemini_res:
                return gemini_res

        # 2. Domain Dictionary Fallback (for Karnataka Rural Tourism vocabulary)
        dict_lang = MOCK_TRANSLATION_DICTIONARY.get(target_lang, {})
        if clean_text in dict_lang:
            return dict_lang[clean_text]

        for en_phrase, translated_phrase in dict_lang.items():
            if en_phrase.lower() in clean_text.lower():
                return clean_text.replace(en_phrase, translated_phrase)

        # 4. Fallback formatting for local dev / unmapped mock text in unit tests
        if settings.ENV in ["test", "testing"]:
            prefix = "[KN]" if target_lang == "kn" else "[HI]"
            return f"{prefix} {clean_text}"

        # 5. Production fallback: preserve original text without fabricating fake strings
        return clean_text

    @classmethod
    def get_translated_field(
        cls,
        db: Session,
        resource_type: str,
        resource_id: str,
        field_name: str,
        original_text: str,
        target_lang: str = "en",
        source_lang: str = "en",
        trigger_async: bool = True,
    ) -> str:
        """Fetch translated field from Redis cache, fallback to PostgreSQL, or return source text while dispatching async translation."""
        if not original_text or target_lang == source_lang or target_lang not in cls.SUPPORTED_LANGUAGES:
            return original_text

        cache_k = cls._cache_key(resource_type, resource_id, target_lang, field_name)

        # 1. Fast path: Redis Cache
        cached = RedisService.get(cache_k)
        if cached is not None:
            return cls.sanitize_text(cached)

        # 2. Database lookup
        record = (
            db.query(ContentTranslation)
            .filter(
                ContentTranslation.resource_type == resource_type,
                ContentTranslation.resource_id == str(resource_id),
                ContentTranslation.language == target_lang,
                ContentTranslation.field_name == field_name,
            )
            .first()
        )

        if record and not record.is_stale:
            sanitized = cls.sanitize_text(record.translated_text)
            RedisService.set(cache_k, sanitized, ttl=cls.CACHE_TTL)
            return sanitized

        # 3. If missing or stale, trigger background translation
        if trigger_async:
            if settings.ENV in ["test", "testing"]:
                translated = cls.translate_text(original_text, target_lang, source_lang)
                cls.save_translation(
                    db=db,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    language=target_lang,
                    field_name=field_name,
                    translated_text=translated,
                    source_lang=source_lang,
                )
                return translated
            else:
                try:
                    from app.tasks.translation_tasks import translate_resource_task
                    translate_resource_task.delay(
                        resource_type=resource_type,
                        resource_id=str(resource_id),
                        fields={field_name: original_text},
                        source_lang=source_lang,
                    )
                except Exception as task_err:
                    logger.warning(f"Failed to queue background translation: {task_err}")

        return cls.sanitize_text(record.translated_text) if record else original_text

    @classmethod
    def save_translation(
        cls,
        db: Session,
        resource_type: str,
        resource_id: str,
        language: str,
        field_name: str,
        translated_text: str,
        source_lang: str = "en",
    ) -> ContentTranslation:
        """Persist sanitized translated field in PostgreSQL and warm Redis cache."""
        sanitized_text = cls.sanitize_text(translated_text)
        record = (
            db.query(ContentTranslation)
            .filter(
                ContentTranslation.resource_type == resource_type,
                ContentTranslation.resource_id == str(resource_id),
                ContentTranslation.language == language,
                ContentTranslation.field_name == field_name,
            )
            .first()
        )

        if record:
            record.translated_text = sanitized_text
            record.source_language = source_lang
            record.is_stale = False
        else:
            record = ContentTranslation(
                resource_type=resource_type,
                resource_id=str(resource_id),
                language=language,
                field_name=field_name,
                translated_text=sanitized_text,
                source_language=source_lang,
                is_stale=False,
            )
            db.add(record)

        db.commit()
        db.refresh(record)

        cache_k = cls._cache_key(resource_type, resource_id, language, field_name)
        RedisService.set(cache_k, sanitized_text, ttl=cls.CACHE_TTL)
        return record

    @classmethod
    def mark_stale_and_translate_async(
        cls,
        db: Session,
        resource_type: str,
        resource_id: str,
        fields: Dict[str, str],
        source_lang: str = "en",
    ):
        """Mark existing translations as stale, evict Redis cache, and queue asynchronous re-translation."""
        records = (
            db.query(ContentTranslation)
            .filter(
                ContentTranslation.resource_type == resource_type,
                ContentTranslation.resource_id == str(resource_id),
            )
            .all()
        )

        for r in records:
            r.is_stale = True
            cache_k = cls._cache_key(resource_type, resource_id, r.language, r.field_name)
            RedisService.delete(cache_k)

        db.commit()

        if settings.ENV in ["test", "testing"]:
            for lang in [l for l in cls.SUPPORTED_LANGUAGES if l != source_lang]:
                for f_name, orig_txt in fields.items():
                    trans = cls.translate_text(orig_txt, lang, source_lang)
                    cls.save_translation(db, resource_type, resource_id, lang, f_name, trans, source_lang)
        else:
            try:
                from app.tasks.translation_tasks import translate_resource_task
                translate_resource_task.delay(
                    resource_type=resource_type,
                    resource_id=str(resource_id),
                    fields=fields,
                    source_lang=source_lang,
                )
            except Exception as err:
                logger.warning(f"Could not queue async translation task: {err}")
