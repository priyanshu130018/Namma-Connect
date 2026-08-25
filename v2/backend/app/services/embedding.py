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
        """Check if Gemini API Key is configured."""
        return bool(settings.GEMINI_API_KEY)

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
        """Generate deterministic normalized 768-dim vector for offline/testing scenarios."""
        # Hash text to generate seed values
        vec = []
        for i in range(cls.VECTOR_DIMENSION):
            h = hashlib.sha256(f"{text}_{i}".encode("utf-8")).hexdigest()
            val = (int(h[:8], 16) / 0xFFFFFFFF) * 2.0 - 1.0
            vec.append(val)
        # Normalize to unit length
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
                with urllib.request.urlopen(req, timeout=10) as resp:
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
