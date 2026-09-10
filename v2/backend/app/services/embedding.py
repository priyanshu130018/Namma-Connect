"""Google Gemini Embedding Service for Semantic Search and Recommendations."""

import json
import urllib.request
import urllib.error
import math
import hashlib
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.logging import logger
from app.models.service import Service


class EmbeddingService:
    """Centralized service for generating and managing 768-dimensional text embeddings via Google Gemini."""

    MODEL_NAME = "models/gemini-embedding-001"
    VECTOR_DIMENSION = 768

    @classmethod
    def is_configured(cls) -> bool:
        """Check if Gemini API Key is configured with valid production credentials."""
        k = (settings.GEMINI_API_KEY or "").strip()
        if not k or k.startswith("your-") or k.startswith("placeholder") or k.startswith("dummy"):
            return False
        return True

    @classmethod
    def build_searchable_text(cls, service: Service) -> str:
        """Construct rich semantic text representation of a service for embedding generation."""
        parts = [
            f"Title: {service.title}",
            f"Category: {service.category} ({service.category_slug})",
            f"Location: {service.location}, District: {service.district}, State: {service.state}",
            f"Provider: {service.provider_name} ({service.provider_type})",
            f"Starting Price: INR {service.price} per {service.unit}",
            f"Description: {service.description}",
        ]

        if service.duration_hours:
            parts.append(f"Duration: {service.duration_hours} hours")
        if service.max_capacity:
            parts.append(f"Capacity: up to {service.max_capacity} guests")

        try:
            inclusions = json.loads(service.inclusions_json) if service.inclusions_json else []
            if inclusions:
                parts.append(f"Inclusions: {', '.join(inclusions)}")
        except Exception:
            pass

        try:
            amenities = json.loads(service.amenities_json) if service.amenities_json else []
            if amenities:
                parts.append(f"Amenities: {', '.join(amenities)}")
        except Exception:
            pass

        return " | ".join(parts)

    @classmethod
    def _generate_deterministic_vector(cls, text: str) -> List[float]:
        """Generate deterministic normalized 768-dim vector using token feature hashing and multilingual concept mapping."""
        import re
        dim = cls.VECTOR_DIMENSION
        vec = [0.0] * dim
        clean = (text or "").lower()
        # Word token extraction handling Indic scripts with matras/viramas
        # Split on whitespace, then strip punctuation
        punctuation = '.,!?;:()[]{}"\'\u201c\u201d\u2018\u2019\\/|@#$%^&*+-=_~`'
        raw_words = [w.strip(punctuation) for w in clean.split() if w.strip(punctuation)]
        if not raw_words:
            return [0.0] * dim

        # Multilingual concept cross-lingual alignment mapping
        MULTILINGUAL_CONCEPTS = {
            # Kannada script
            "ಕಾಫಿ": ["coffee"],
            "ತೋಟ": ["plantation", "farm"],
            "ತೋಟದ": ["plantation", "farm"],
            "ತೋಟಗಳು": ["plantation", "farm"],
            "ಕೊಡಗು": ["coorg", "kodagu"],
            "ಕೊಡಗಿನಲ್ಲಿ": ["coorg", "kodagu"],
            "ಕೊಡಗಿನ": ["coorg", "kodagu"],
            "ಅನುಭವ": ["experience"],
            "ಕೃಷಿ": ["farm", "agriculture"],
            "ಕುಂಬಾರಿಕೆ": ["pottery", "craft"],
            "ಮಣ್ಣಿನ": ["pottery", "clay", "earthen"],
            "ವಾಸ್ತವ್ಯ": ["stay", "homestay"],
            "ಉಳಿಯಲು": ["stay", "homestay"],
            "ಪ್ರವಾಸ": ["tour", "travel"],
            "ಪ್ರವಾಸೋದ್ಯಮ": ["tour", "tourism"],
            "ಆಹಾರ": ["food", "dining"],
            "ಊಟ": ["food", "meal"],
            "ಚಿಕ್ಕಮಗಳೂರು": ["chikmagalur"],
            "ಚಿಕ್ಕಮಗಳೂರಿನ": ["chikmagalur"],
            "ಮಂಡ್ಯ": ["mandya"],
            "ಮಂಡ್ಯದ": ["mandya"],
            "ಮೈಸೂರು": ["mysore", "mysuru"],
            "ಮೈಸೂರಿನ": ["mysore", "mysuru"],
            "ಶಿವಮೊಗ್ಗ": ["shimoga"],
            "ಬೆಂಗಳೂರು": ["bangalore", "bengaluru"],
            "ಬೆಂಗಳೂರಿನಲ್ಲಿ": ["bangalore", "bengaluru"],
            "ನಿಸರ್ಗ": ["nature", "scenic"],
            "ಪ್ರಕೃತಿ": ["nature"],
            "ಸಾವಯವ": ["organic"],
            "ಹಣ್ಣು": ["fruit", "harvest"],
            "ಕೊಯ್ಲು": ["harvest"],
            "ಕಾರ್ಯಾಗಾರ": ["workshop"],
            # Hindi script
            "कॉफी": ["coffee"],
            "कूर्ग": ["coorg", "kodagu"],
            "फार्म": ["farm", "plantation"],
            "खेत": ["farm", "plantation"],
            "खेती": ["farm", "agriculture"],
            "अनुभव": ["experience"],
            "स्टे": ["stay", "homestay"],
            "ठहरने": ["stay", "homestay"],
            "पर्यटन": ["tour", "travel"],
            "सफर": ["tour", "travel"],
            "यात्रा": ["tour", "travel"],
            "चिकमगलूर": ["chikmagalur"],
            "मिट्टी": ["pottery", "clay"],
            "बर्तन": ["pottery", "craft"],
            "खाना": ["food", "dining"],
            "भोजन": ["food", "dining"],
            "प्रकृति": ["nature"],
            "मांड्या": ["mandya"],
            "मैसूर": ["mysore", "mysuru"],
            "बंगलौर": ["bangalore", "bengaluru"],
            "बैंगलोर": ["bangalore", "bengaluru"],
            "जैविक": ["organic"],
            "फल": ["fruit", "harvest"],
            "कटाई": ["harvest"],
            "कार्यशाला": ["workshop"],
            # Romanized Kannada / Hindi terms
            "thota": ["plantation", "farm"],
            "thotada": ["plantation", "farm"],
            "oota": ["food", "dining"],
            "krishi": ["farm", "agriculture"],
            "khed": ["farm"],
            "kheti": ["farm", "agriculture"],
        }

        # Expand tokens with semantic concepts
        tokens = []
        for w in raw_words:
            tokens.append(w)
            # Direct match
            if w in MULTILINGUAL_CONCEPTS:
                tokens.extend(MULTILINGUAL_CONCEPTS[w])
            else:
                # Substring match for inflected Kannada/Hindi forms
                for concept_key, mapped_terms in MULTILINGUAL_CONCEPTS.items():
                    if len(concept_key) >= 3 and (concept_key in w or w in concept_key):
                        tokens.extend(mapped_terms)

        # Feature hashing across word tokens and stemming variants
        for t in tokens:
            variants = {t}
            if t.endswith('s') and len(t) > 3:
                variants.add(t[:-1])
            if t.endswith('ing') and len(t) > 5:
                variants.add(t[:-3])
            if t.endswith('ed') and len(t) > 4:
                variants.add(t[:-2])
            for v in variants:
                w = 2.0 if len(v) > 3 else 0.8
                for s in range(5):
                    h = int(hashlib.md5(f"{v}_{s}".encode("utf-8")).hexdigest(), 16)
                    idx = h % dim
                    sign = 1.0 if ((h >> 16) & 1) else -1.0
                    vec[idx] += sign * w

        # Normalize to unit length (L2 norm = 1.0)
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

    @classmethod
    def generate_embedding(cls, text: str) -> List[float]:
        """Generate 768-dimensional embedding vector for a given query or document text."""
        if not text or not text.strip():
            return [0.0] * cls.VECTOR_DIMENSION

        clean_text = text.strip()

        if cls.is_configured():
            url = f"https://generativelanguage.googleapis.com/v1beta/{cls.MODEL_NAME}:embedContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "model": cls.MODEL_NAME,
                "content": {"parts": [{"text": clean_text}]},
                "outputDimensionality": cls.VECTOR_DIMENSION,
            }
            try:
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=2) as resp:
                    res = json.loads(resp.read().decode("utf-8"))
                    values = res.get("embedding", {}).get("values", [])
                    if len(values) == cls.VECTOR_DIMENSION:
                        return values
                    logger.warning(f"Unexpected embedding dimension: {len(values)}. Falling back.")
            except Exception as e:
                logger.warning(f"Gemini embedding API call failed: {e}. Using deterministic embedding fallback.")

        return cls._generate_deterministic_vector(clean_text)

    @classmethod
    def batch_generate_embeddings(cls, texts: List[str], batch_size: int = 50) -> List[List[float]]:
        """Batch generate embeddings for multiple texts using Gemini batchEmbedContents."""
        results: List[List[float]] = []
        if not texts:
            return results

        if not cls.is_configured():
            return [cls._generate_deterministic_vector(t) for t in texts]

        for i in range(0, len(texts), batch_size):
            chunk = texts[i : i + batch_size]
            url = f"https://generativelanguage.googleapis.com/v1beta/{cls.MODEL_NAME}:batchEmbedContents?key={settings.GEMINI_API_KEY}"
            requests_list = [
                {
                    "model": cls.MODEL_NAME,
                    "content": {"parts": [{"text": t.strip() or "NammaConnect Experience"}]},
                    "outputDimensionality": cls.VECTOR_DIMENSION,
                }
                for t in chunk
            ]
            payload = {"requests": requests_list}
            try:
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    res = json.loads(resp.read().decode("utf-8"))
                    embs = res.get("embeddings", [])
                    for e in embs:
                        vals = e.get("values", [])
                        if len(vals) == cls.VECTOR_DIMENSION:
                            results.append(vals)
                        else:
                            results.append(cls._generate_deterministic_vector("fallback"))
            except Exception as err:
                logger.warning(f"Batch embedding request failed: {err}. Falling back per-item.")
                for t in chunk:
                    results.append(cls.generate_embedding(t))

        return results

    @classmethod
    def backfill_service_embeddings(
        cls,
        db: Any,
        force: bool = False,
        batch_size: int = 50,
    ) -> Dict[str, Any]:
        """Safe backfill mechanism to generate and persist missing service embeddings."""
        from sqlalchemy.orm import Session
        from app.services.redis_service import RedisService

        query = db.query(Service)
        if not force:
            query = query.filter(Service.embedding.is_(None))

        services_to_update = query.all()
        total_eligible = db.query(Service).count()
        to_process = len(services_to_update)

        updated_count = 0
        skipped_count = total_eligible - to_process
        error_count = 0

        logger.info(f"Starting service embedding backfill: {to_process} to process (force={force})")

        for i in range(0, to_process, batch_size):
            batch = services_to_update[i : i + batch_size]
            for srv in batch:
                try:
                    search_text = cls.build_searchable_text(srv)
                    emb = cls.generate_embedding(search_text)
                    if len(emb) == cls.VECTOR_DIMENSION:
                        srv.embedding = emb
                        updated_count += 1
                        # Update Redis cache
                        try:
                            RedisService.set(f"service_embedding:{srv.id}", emb)
                        except Exception:
                            pass
                    else:
                        error_count += 1
                except Exception as err:
                    logger.warning(f"Failed to generate embedding for service {srv.id}: {err}")
                    error_count += 1

            try:
                db.commit()
            except Exception as commit_err:
                db.rollback()
                logger.error(f"Failed to commit batch: {commit_err}")
                error_count += len(batch)

        result = {
            "total_services": total_eligible,
            "processed": to_process,
            "updated": updated_count,
            "skipped": skipped_count,
            "errors": error_count,
            "vector_dimension": cls.VECTOR_DIMENSION,
            "model_configured": cls.is_configured(),
        }
        logger.info(f"Service embedding backfill completed: {result}")
        return result

