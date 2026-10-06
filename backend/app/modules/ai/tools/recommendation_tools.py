"""Recommendation tools for AI Assistant."""

from typing import Dict, Any
from sqlalchemy.orm import Session

from app.modules.user.domain.models import User
from app.modules.ai.tools.base import BaseAITool
from app.modules.ai.llm.base import ToolDeclaration, ToolParameter
from app.modules.recommendation.infrastructure.repository import RecommendationRepository
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.recommendation.application.service import RecommendationService


class GetUserRecommendationsTool(BaseAITool):
    """Tool to retrieve tailored hybrid recommendations for the user."""

    def __init__(self, db: Session):
        self.db = db
        rec_repo = RecommendationRepository(db)
        market_repo = MarketplaceRepository(db)
        self.service = RecommendationService(rec_repo, market_repo)

    @property
    def declaration(self) -> ToolDeclaration:
        return ToolDeclaration(
            name="get_user_recommendations",
            description="Retrieve personalized hybrid recommendations tailored to the customer's behavioral preferences and history.",
            parameters=[
                ToolParameter(
                    name="limit",
                    type="integer",
                    description="Number of recommendations to fetch (default: 5, max: 10)",
                    required=False,
                ),
            ],
        )

    def execute(self, user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
        limit = min(10, max(1, int(arguments.get("limit", 5))))
        recs = self.service.get_personalized_recommendations(user_id=user.id, limit=limit)
        return {
            "user_id": str(user.id),
            "recommendation_count": len(recs),
            "recommendations": recs,
        }
