from datetime import datetime
from typing import Any, List

from sentence_transformers import SentenceTransformer, util


class RecommendationAgent:
    def __init__(self):
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    def _prepare_text(self, item: Any, item_type: str = "farm") -> str:
        if item_type == "farm":
            parts = [
                getattr(item, "name", "") or "",
                getattr(item, "description", "") or "",
                getattr(item, "location", "") or "",
                getattr(item, "area", "") or "",
                getattr(item, "state", "") or "",
                getattr(item, "crop_types", "") or "",
                getattr(item, "activities", "") or "",
            ]
        else:
            parts = [
                getattr(item, "name", "") or "",
                getattr(item, "niche", "") or "",
                getattr(item, "state", "") or "",
                getattr(item, "bio", "") or "",
            ]
        return " ".join(parts).lower()

    def _popularity_score(self, item: Any, item_type: str = "farm") -> float:
        score = 0.5

        if item_type == "farm":
            owner = getattr(item, "owner", None)
            if owner and getattr(owner, "is_verified", False):
                score += 0.2

            if getattr(item, "stay_available", None):
                score += 0.1

            created_at = getattr(item, "created_at", None)
            if created_at:
                try:
                    if isinstance(created_at, datetime):
                        age_days = (datetime.utcnow() - created_at).days
                    else:
                        age_days = 365
                    if age_days < 90:
                        score += 0.1
                except Exception:
                    pass
        else:
            if getattr(item, "is_verified", False):
                score += 0.3
            if getattr(item, "has_work_experience", False):
                score += 0.2

        if score < 0.0:
            return 0.0
        if score > 1.0:
            return 1.0
        return score

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
        item_embeddings = self.model.encode(texts, convert_to_tensor=True)
        query_embedding = self.model.encode(query.lower(), convert_to_tensor=True)
        scores = util.cos_sim(query_embedding, item_embeddings).cpu().numpy().flatten()

        ranked = []
        for i, item in enumerate(items):
            semantic_score = float(scores[i])
            semantic_score = (semantic_score + 1.0) / 2.0
            if semantic_score < 0.0:
                semantic_score = 0.0
            if semantic_score > 1.0:
                semantic_score = 1.0

            popularity = self._popularity_score(item, item_type=item_type)
            combined = 0.7 * semantic_score + 0.3 * popularity
            final_score = int(combined * 100)

            ranked.append(
                {
                    "item": item,
                    "matchScore": final_score,
                }
            )

        ranked.sort(key=lambda x: x["matchScore"], reverse=True)
        return ranked[:top_n]


recommendation_agent = RecommendationAgent()
