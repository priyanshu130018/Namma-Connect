"""Celery Background Tasks for Dynamic Multilingual Translation."""

from typing import Dict, Any
from app.core.celery_app import celery_app
from app.core.logging import logger
from app.core.database import SessionLocal
from app.services.translation import TranslationService


@celery_app.task(name="app.tasks.translation_tasks.translate_resource_task", bind=True, max_retries=3)
def translate_resource_task(
    self,
    resource_type: str,
    resource_id: str,
    fields: Dict[str, str],
    source_lang: str = "en",
) -> Dict[str, Any]:
    """Asynchronously compute and store translations in Kannada (kn) and Hindi (hi) for the given resource."""
    logger.info(f"Starting async translation for {resource_type} {resource_id} (fields: {list(fields.keys())})")
    
    db = SessionLocal()
    results = {}
    try:
        target_languages = [lang for lang in TranslationService.SUPPORTED_LANGUAGES if lang != source_lang]
        
        for lang in target_languages:
            results[lang] = {}
            for field_name, source_text in fields.items():
                if not source_text:
                    continue
                translated = TranslationService.translate_text(
                    text=source_text,
                    target_lang=lang,
                    source_lang=source_lang,
                )
                TranslationService.save_translation(
                    db=db,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    language=lang,
                    field_name=field_name,
                    translated_text=translated,
                    source_lang=source_lang,
                )
                results[lang][field_name] = translated
                
        return {"status": "success", "resource_type": resource_type, "resource_id": resource_id, "translations": results}
    except Exception as exc:
        logger.error(f"Error during async translation: {exc}")
        raise self.retry(exc=exc, countdown=10)
    finally:
        db.close()
