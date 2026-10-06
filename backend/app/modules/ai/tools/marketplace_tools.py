"""Marketplace tools for AI Assistant (search, details, availability, categories)."""

import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.modules.user.domain.models import User
from app.modules.ai.tools.base import BaseAITool
from app.modules.ai.llm.base import ToolDeclaration, ToolParameter
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.marketplace.domain.models import ServiceAvailability


class SearchServicesTool(BaseAITool):
    """Tool to search published marketplace listings by district, category, price, and keywords."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = MarketplaceRepository(db)

    @property
    def declaration(self) -> ToolDeclaration:
        return ToolDeclaration(
            name="search_services",
            description="Search real, verified marketplace services (farm stays, spice tours, agro activities) in Karnataka.",
            parameters=[
                ToolParameter(
                    name="query",
                    type="string",
                    description="Optional text search query or keywords (e.g. 'coffee plantation', 'organic farm')",
                    required=False,
                ),
                ToolParameter(
                    name="district",
                    type="string",
                    description="Karnataka district filter (e.g. 'Kodagu', 'Chikkamagaluru', 'Mysuru', 'Shivamogga')",
                    required=False,
                ),
                ToolParameter(
                    name="category_slug",
                    type="string",
                    description="Taxonomy category slug (e.g. 'farm-stays', 'agro-tours')",
                    required=False,
                ),
                ToolParameter(
                    name="max_price",
                    type="number",
                    description="Maximum price filter in INR",
                    required=False,
                ),
                ToolParameter(
                    name="limit",
                    type="integer",
                    description="Maximum number of services to return (default: 5, max: 10)",
                    required=False,
                ),
            ],
        )

    def execute(self, user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
        query_str = arguments.get("query")
        district = arguments.get("district")
        category_slug = arguments.get("category_slug")
        max_price = arguments.get("max_price")
        limit = min(10, max(1, int(arguments.get("limit", 5))))

        services, total = self.repo.search_services(
            query_str=query_str,
            category_slug=category_slug,
            district=district,
            max_price=float(max_price) if max_price is not None else None,
            page=1,
            page_size=limit,
        )

        results = []
        for s in services:
            results.append({
                "id": str(s.id),
                "title": s.title,
                "category": s.category,
                "location": s.location,
                "district": s.district,
                "price": float(s.price),
                "unit": s.unit,
                "rating": float(s.rating),
                "reviews_count": s.reviews_count,
                "primary_image": s.primary_image,
                "provider_name": s.provider_name,
            })

        return {
            "found_count": total,
            "returned_count": len(results),
            "services": results,
        }


class GetServiceDetailsTool(BaseAITool):
    """Tool to retrieve factual details for a specific marketplace service."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = MarketplaceRepository(db)

    @property
    def declaration(self) -> ToolDeclaration:
        return ToolDeclaration(
            name="get_service_details",
            description="Retrieve authoritative details (description, inclusions, price, rating, provider) for a service ID.",
            parameters=[
                ToolParameter(
                    name="service_id",
                    type="string",
                    description="UUID of the marketplace service",
                    required=True,
                ),
            ],
        )

    def execute(self, user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
        sid_raw = arguments.get("service_id")
        if not sid_raw:
            return {"error": "Missing required argument 'service_id'"}
        try:
            s_id = uuid.UUID(sid_raw)
        except ValueError:
            return {"error": f"Invalid service_id format: '{sid_raw}'"}

        svc = self.repo.get_service_by_id(s_id)
        if not svc:
            return {"error": f"Service with ID '{sid_raw}' not found."}

        return {
            "id": str(svc.id),
            "title": svc.title,
            "description": svc.description,
            "category": svc.category,
            "category_slug": svc.category_slug,
            "location": svc.location,
            "district": svc.district,
            "price": float(svc.price),
            "unit": svc.unit,
            "max_capacity": svc.max_capacity,
            "rating": float(svc.rating),
            "reviews_count": svc.reviews_count,
            "provider_name": svc.provider_name,
            "is_verified": svc.is_verified,
            "status": svc.status,
        }


class GetServiceAvailabilityTool(BaseAITool):
    """Tool to inspect real-time availability slots for a service."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = MarketplaceRepository(db)

    @property
    def declaration(self) -> ToolDeclaration:
        return ToolDeclaration(
            name="get_service_availability",
            description="Check real-time booking availability slots and open capacity for a service.",
            parameters=[
                ToolParameter(
                    name="service_id",
                    type="string",
                    description="UUID of the marketplace service",
                    required=True,
                ),
                ToolParameter(
                    name="start_date",
                    type="string",
                    description="Optional filter start date (YYYY-MM-DD)",
                    required=False,
                ),
                ToolParameter(
                    name="end_date",
                    type="string",
                    description="Optional filter end date (YYYY-MM-DD)",
                    required=False,
                ),
            ],
        )

    def execute(self, user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
        sid_raw = arguments.get("service_id")
        if not sid_raw:
            return {"error": "Missing required argument 'service_id'"}
        try:
            s_id = uuid.UUID(sid_raw)
        except ValueError:
            return {"error": f"Invalid service_id format: '{sid_raw}'"}

        start_date = arguments.get("start_date") or "2000-01-01"
        end_date = arguments.get("end_date") or "2099-12-31"

        slots = (
            self.db.query(ServiceAvailability)
            .filter(
                ServiceAvailability.service_id == s_id,
                ServiceAvailability.date >= start_date,
                ServiceAvailability.date <= end_date,
            )
            .order_by(ServiceAvailability.date.asc())
            .all()
        )

        result_slots = []
        for sl in slots:
            available_spots = max(0, sl.capacity - sl.booked_count) if not sl.is_blocked else 0
            result_slots.append({
                "date": sl.date,
                "start_time": sl.start_time,
                "end_time": sl.end_time,
                "capacity": sl.capacity,
                "booked_count": sl.booked_count,
                "available_spots": available_spots,
                "is_blocked": sl.is_blocked,
                "price_override": float(sl.price_override) if sl.price_override is not None else None,
            })

        return {
            "service_id": str(s_id),
            "available_slots_count": len(result_slots),
            "slots": result_slots,
        }


class GetCategoriesTool(BaseAITool):
    """Tool to list active marketplace categories."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = MarketplaceRepository(db)

    @property
    def declaration(self) -> ToolDeclaration:
        return ToolDeclaration(
            name="get_categories",
            description="List active marketplace taxonomy categories (e.g. Farm Stays, Agro Tours, Workshops).",
            parameters=[],
        )

    def execute(self, user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
        categories = self.repo.list_active_categories()
        return {
            "categories": [
                {
                    "slug": c.slug,
                    "name": c.name,
                    "marketplace_type": c.marketplace_type,
                    "description": c.description,
                }
                for c in categories
            ]
        }
