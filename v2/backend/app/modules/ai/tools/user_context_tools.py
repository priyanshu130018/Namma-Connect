"""User context tools (Saved Services, User Trips) for AI Assistant."""

from typing import Dict, Any
from sqlalchemy.orm import Session

from app.modules.user.domain.models import User
from app.modules.ai.tools.base import BaseAITool
from app.modules.ai.llm.base import ToolDeclaration, ToolParameter
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.trip.infrastructure.repository import TripRepository


class GetUserSavedServicesTool(BaseAITool):
    """Tool to inspect customer's bookmarked / saved listings."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = MarketplaceRepository(db)

    @property
    def declaration(self) -> ToolDeclaration:
        return ToolDeclaration(
            name="get_user_saved_services",
            description="Retrieve the authenticated customer's bookmarked or saved wishlist services.",
            parameters=[],
        )

    def execute(self, user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
        saved_services = self.repo.list_saved_services(user.id)
        results = []
        for saved in saved_services:
            svc = saved.service
            if svc:
                results.append({
                    "service_id": str(svc.id),
                    "title": svc.title,
                    "category": svc.category,
                    "district": svc.district,
                    "price": float(svc.price),
                    "rating": float(svc.rating),
                    "notes": saved.notes,
                })
        return {
            "saved_count": len(results),
            "saved_services": results,
        }


class GetUserTripsTool(BaseAITool):
    """Tool to inspect customer's planned or active trip itineraries."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = TripRepository(db)

    @property
    def declaration(self) -> ToolDeclaration:
        return ToolDeclaration(
            name="get_user_trips",
            description="Retrieve the customer's existing trip itineraries and schedules.",
            parameters=[
                ToolParameter(
                    name="status",
                    type="string",
                    description="Optional filter status ('DRAFT', 'PLANNED', 'CONFIRMED', 'COMPLETED')",
                    required=False,
                ),
            ],
        )

    def execute(self, user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
        status_filter = arguments.get("status")
        trips, total = self.repo.list_user_trips(user.id, status=status_filter, limit=10)
        return {
            "trips_count": total,
            "trips": [
                {
                    "trip_id": str(t.id),
                    "title": t.title,
                    "start_date": t.start_date,
                    "end_date": t.end_date,
                    "destination": t.destination,
                    "status": t.status,
                    "days_count": len(t.days) if t.days else 0,
                }
                for t in trips
            ],
        }
