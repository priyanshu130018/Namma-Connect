"""Content-based recommendation package."""

from app.modules.recommendation.content_based.content_recommender import (
    ContentBasedRecommender,
    cosine_similarity,
)

__all__ = ["ContentBasedRecommender", "cosine_similarity"]
