"""Collaborative filtering recommendation package."""

from app.modules.recommendation.collaborative.user_similarity_calculator import (
    UserSimilarityCalculator,
)
from app.modules.recommendation.collaborative.collaborative_recommender import (
    CollaborativeRecommender,
)

__all__ = [
    "UserSimilarityCalculator",
    "CollaborativeRecommender",
]
