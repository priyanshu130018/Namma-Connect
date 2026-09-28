"""Controlled backend tools for the Agentic Trip Planner with Provider Intelligence."""

import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.marketplace.domain.models import Service, ServiceAvailability
from app.modules.recommendation.infrastructure.repository import RecommendationRepository
from app.modules.recommendation.application.service import RecommendationService
from app.modules.provider.intelligence.service import ProviderIntelligenceService
from app.modules.provider.intelligence.types import NormalizedProviderService


class TripPlannerTools:
    """Backend data access toolset for Trip Planner orchestration backed by Provider Intelligence."""

    def __init__(self, db: Session, provider_intelligence: Optional[ProviderIntelligenceService] = None):
        self.db = db
        self.marketplace_repo = MarketplaceRepository(db)
        rec_repo = RecommendationRepository(db)
        self.rec_service = RecommendationService(rec_repo, self.marketplace_repo)
        self.provider_intelligence = provider_intelligence or ProviderIntelligenceService(db)

    def search_candidates(
        self,
        district: Optional[str] = None,
        category_slug: Optional[str] = None,
        max_price: Optional[float] = None,
        limit: int = 10,
    ) -> List[Service]:
        """Search verified, published candidate services matching constraints."""
        services, _ = self.marketplace_repo.search_services(
            category_slug=category_slug,
            district=district,
            max_price=max_price,
            page=1,
            page_size=limit,
        )
        return services

    def search_normalized_candidates(
        self,
        district: Optional[str] = None,
        category_slug: Optional[str] = None,
        max_price: Optional[float] = None,
        party_size: int = 1,
        limit: int = 10,
    ) -> List[NormalizedProviderService]:
        """Search normalized candidate offerings via Provider Intelligence."""
        return self.provider_intelligence.get_candidate_offerings(
            district=district,
            category_slug=category_slug,
            max_price=max_price,
            party_size=party_size,
            limit=limit,
        )

    def check_availability(
        self,
        service_id: uuid.UUID,
        target_date: Optional[str] = None,
        party_size: int = 1,
    ) -> Dict[str, Any]:
        """Check real-time availability and capacity for a given date via Provider Intelligence."""
        avail = self.provider_intelligence.verify_availability(
            str(service_id), target_date=target_date, party_size=party_size
        )
        return {
            "service_id": str(service_id),
            "is_available": avail.is_available,
            "status": avail.status.value,
            "available_capacity": avail.available_capacity,
            "slots": [s.model_dump() for s in avail.slots],
            "reason": avail.reason,
        }

    def get_service_details(self, service_id: uuid.UUID) -> Optional[Service]:
        """Retrieve authoritative service details."""
        return self.marketplace_repo.get_service_by_id(service_id)

    def get_user_recommendations(self, user_id: uuid.UUID, limit: int = 5) -> List[Dict[str, Any]]:
        """Retrieve user's personalized recommendations."""
        return self.rec_service.get_personalized_recommendations(user_id=user_id, limit=limit)

