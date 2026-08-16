import logging
import os
import re
from datetime import datetime
from typing import Any, List

try:
    from sentence_transformers import SentenceTransformer, util
except Exception:  # pragma: no cover
    SentenceTransformer = None
    util = None

LOGGER = logging.getLogger(__name__)
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

class RecommendationAgent:
    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self) -> None:
        if SentenceTransformer is None:
            LOGGER.warning("sentence-transformers is unavailable; using lexical recommendation fallback.")
            return

        allow_download = os.getenv("NAMMAGIG_ALLOW_HF_DOWNLOAD", "0").lower() in {"1", "true", "yes"}
        try:
            self.model = SentenceTransformer(MODEL_NAME, local_files_only=not allow_download)
        except Exception as exc:
            self.model = None
            LOGGER.warning("Could not load embedding model; using lexical fallback. Reason: %s", exc)

    def _prepare_text(self, item: Any, item_type: str = "farm") -> str:
        if item_type == "farm":
            act_names = []
            raw_acts = getattr(item, "activities", "")
            if isinstance(raw_acts, list) or (hasattr(raw_acts, "__iter__") and not isinstance(raw_acts, str)):
                act_names = [getattr(a, "name", str(a)) for a in raw_acts]
            elif isinstance(raw_acts, str):
                act_names = [raw_acts]
            
            raw_crops = getattr(item, "primary_crops", "") or getattr(item, "crop_types", "") or ""
            crop_str = ", ".join(raw_crops) if isinstance(raw_crops, list) else str(raw_crops)

            parts = [
                str(getattr(item, "name", "") or getattr(item, "farm_name", "") or ""),
                str(getattr(item, "description", "") or ""),
                str(getattr(item, "district", "") or getattr(item, "city", "") or ""),
                str(getattr(item, "state", "") or ""),
                crop_str,
                " ".join(act_names),
            ]
        else:
            parts = [
                str(getattr(item, "display_name", "") or getattr(item, "name", "") or ""),
                str(getattr(item, "category", "") or getattr(item, "niche", "") or ""),
                str(getattr(item, "state", "") or ""),
                str(getattr(item, "bio", "") or ""),
            ]
        return " ".join([p for p in parts if p]).lower()

    def _token_overlap_score(self, query: str, text: str) -> float:
        query_tokens = set(re.findall(r"[a-z0-9]+", (query or "").lower()))
        text_tokens = set(re.findall(r"[a-z0-9]+", (text or "").lower()))
        if not query_tokens or not text_tokens:
            return 0.0

        score = len(query_tokens.intersection(text_tokens)) / len(query_tokens)
        return max(0.0, min(score, 1.0))

    def _semantic_scores(self, query: str, texts: List[str]) -> List[float]:
        if self.model is not None and util is not None:
            try:
                item_embeddings = self.model.encode(texts, convert_to_tensor=True)
                query_embedding = self.model.encode((query or "").lower(), convert_to_tensor=True)
                raw_scores = util.cos_sim(query_embedding, item_embeddings).cpu().numpy().flatten()

                normalized_scores = []
                for score in raw_scores:
                    mapped = (float(score) + 1.0) / 2.0
                    normalized_scores.append(max(0.0, min(mapped, 1.0)))
                return normalized_scores
            except Exception as exc:
                LOGGER.warning("Embedding inference failed; using lexical fallback. Reason: %s", exc)

        return [self._token_overlap_score(query, text) for text in texts]

    def _popularity_score(self, item: Any, item_type: str = "farm") -> float:
        score = 0.5

        if item_type == "farm":
            if getattr(item, "owner", None) and item.owner.is_verified:
                score += 0.2

            if getattr(item, "stay_available", False):
                score += 0.1

            created_at = getattr(item, "created_at", None)
            if created_at:
                try:
                    if isinstance(created_at, datetime):
                        age_days = (datetime.utcnow() - created_at).days
                        if age_days < 90:
                            score += 0.1
                except Exception:
                    pass
        else:
            if getattr(item, "is_verified", False):
                score += 0.3
            if getattr(item, "has_work_experience", False):
                score += 0.2

        return max(0.0, min(score, 1.0))

    def get_recommendations(
        self,
        query: str,
        items: List[Any],
        item_type: str = "farm",
        top_n: int = 10,
    ):
        if not items:
            return []

        texts = [self._prepare_text(item, item_type) for item in items]
        semantic_scores = self._semantic_scores(query=query, texts=texts)

        ranked = []
        for i, item in enumerate(items):
            popularity = self._popularity_score(item, item_type=item_type)
            combined = 0.7 * semantic_scores[i] + 0.3 * popularity
            final_score = int(combined * 100)
            ranked.append({"item": item, "matchScore": final_score})

        ranked.sort(key=lambda x: x["matchScore"], reverse=True)
        return ranked[:top_n]

recommendation_agent = RecommendationAgent()
recommender_agent = recommendation_agent
