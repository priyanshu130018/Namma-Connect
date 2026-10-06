"""Compatibility re-export for Recommendation models."""
from app.modules.recommendation.domain.models import (
    UserInteraction,
    UserInterestProfile,
    UserSimilarity,
    RecommendationResult,
    RecommendationImpression,
    RecommendationFeedback,
)

__all__ = [
    "UserInteraction",
    "UserInterestProfile",
    "UserSimilarity",
    "RecommendationResult",
    "RecommendationImpression",
    "RecommendationFeedback",
]
