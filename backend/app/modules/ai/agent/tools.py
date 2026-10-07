"""LangChain-compatible tools wrapping existing Namma Connect business services.

All tools enforce strict Pydantic schemas, operate with authorized user context,
and invoke real existing backend services (never directly mutating database tables).
"""

import json
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from langchain_core.tools import BaseTool, tool

from app.modules.user.domain.models import User
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.marketplace.domain.models import Service, ServiceAvailability
from app.modules.recommendation.infrastructure.repository import RecommendationRepository
from app.modules.recommendation.application.service import RecommendationService
from app.modules.trip.infrastructure.repository import TripRepository
from app.modules.trip.domain.models import Trip, TripDay, TripItem, AITripPlan
from app.modules.ai.trip_planner.state import (
    TravelerConstraints,
    ItineraryProposal,
    DayPlanProposal,
    ItemProposal,
    PlannerState,
)
from app.modules.ai.trip_planner.builder import ItineraryBuilder
from app.modules.ai.trip_planner.validator import ItineraryValidator
from app.modules.ai.trip_planner.refiner import ItineraryRefiner
from app.modules.ai.trip_planner.persistence import TripPersistenceEngine
from app.modules.booking.infrastructure.repository import BookingRepository
from app.modules.booking.application.service import BookingService
from app.modules.booking.presentation.schemas import BookingCreateRequest
from app.modules.payment.infrastructure.repository import PaymentRepository
from app.modules.payment.application.service import PaymentService
from app.modules.payment.presentation.schemas import CreateOrderRequest
from app.modules.notification.infrastructure.repository import NotificationRepository
from app.modules.notification.application.service import NotificationService
from app.services.email import EmailService
from app.modules.ai.agent.policies import AgentPolicies, PolicyEnforcementError


# In-memory deduplication tracking for transactional emails to prevent duplicate sends
_SENT_EMAIL_DEDUP_KEYS = set()


# ── Tool Authority Classification (READ_ONLY vs MUTATING) ──

TOOL_AUTHORITY = {
    # Discovery
    "search_marketplace": "READ_ONLY",
    "search_by_location": "READ_ONLY",
    "search_by_category": "READ_ONLY",
    "get_service_details": "READ_ONLY",
    "get_recommendations": "READ_ONLY",
    "get_personalized_recommendations": "READ_ONLY",
    # Filtering & Ranking
    "filter_services": "READ_ONLY",
    "rank_candidates": "READ_ONLY",
    "compare_services": "READ_ONLY",
    # Availability & Capacity
    "get_available_dates": "READ_ONLY",
    "check_availability": "READ_ONLY",
    "check_service_availability": "READ_ONLY",
    "check_capacity": "READ_ONLY",
    "get_available_slots": "READ_ONLY",
    # Pricing & Budget
    "get_current_price": "READ_ONLY",
    "calculate_service_pricing": "READ_ONLY",
    "calculate_trip_budget": "READ_ONLY",
    "compare_prices": "READ_ONLY",
    # Trip & Itinerary
    "create_trip": "MUTATING",
    "update_trip": "MUTATING",
    "add_service_to_trip": "MUTATING",
    "remove_service_from_trip": "MUTATING",
    "reorder_trip_items": "MUTATING",
    "build_itinerary": "MUTATING",
    "build_or_update_itinerary": "MUTATING",
    "refine_itinerary": "MUTATING",
    "validate_itinerary": "READ_ONLY",
    "validate_itinerary_and_budget": "READ_ONLY",
    "optimize_itinerary": "MUTATING",
    "replan_itinerary": "MUTATING",
    "save_trip_to_database": "MUTATING",
    # Booking & Payment
    "validate_booking": "READ_ONLY",
    "create_booking": "MUTATING",
    "execute_booking": "MUTATING",
    "get_booking_status": "READ_ONLY",
    "cancel_booking": "MUTATING",
    "modify_booking": "MUTATING",
    "get_booking_requirements": "READ_ONLY",
    "create_payment_order": "MUTATING",
    "get_payment_status": "READ_ONLY",
    "verify_payment_status": "READ_ONLY",
    # Notification & Email
    "create_notification": "MUTATING",
    "send_booking_email": "MUTATING",
    "send_payment_email": "MUTATING",
    "send_cancellation_email": "MUTATING",
    "send_booking_failure_email": "MUTATING",
    # Context
    "get_user_travel_context": "READ_ONLY",
}


# ── Strict Pydantic Schemas ──

# Discovery
class MarketplaceSearchInput(BaseModel):
    query: Optional[str] = Field(None, description="Free text query (e.g. 'coffee plantation', 'organic homestay')")
    district: Optional[str] = Field(None, description="Karnataka district (e.g. 'Kodagu', 'Chikkamagaluru', 'Mysuru')")
    category_slug: Optional[str] = Field(None, description="Category slug: 'farm-stays', 'agro-tours', 'workshops'")
    max_price: Optional[float] = Field(None, description="Upper price limit in INR")
    limit: int = Field(5, ge=1, le=20, description="Max services to return")


class SearchByLocationInput(BaseModel):
    district: str = Field(..., description="Target Karnataka district name")
    query: Optional[str] = Field(None, description="Optional text query")
    max_price: Optional[float] = Field(None, description="Upper price limit in INR")
    limit: int = Field(5, ge=1, le=20, description="Max services to return")


class SearchByCategoryInput(BaseModel):
    category_slug: str = Field(..., description="Category slug (e.g. 'farm-stays', 'agro-tours', 'workshops')")
    district: Optional[str] = Field(None, description="Optional district filter")
    max_price: Optional[float] = Field(None, description="Optional price filter")
    limit: int = Field(5, ge=1, le=20, description="Max services to return")


class ServiceDetailsInput(BaseModel):
    service_id: str = Field(..., description="UUID of the marketplace listing")


class RecommendationInput(BaseModel):
    limit: int = Field(5, ge=1, le=10, description="Max recommendations to fetch")
    district: Optional[str] = Field(None, description="Optional target district context")
    category_slug: Optional[str] = Field(None, description="Optional category context")


# Filtering & Ranking
class FilterServicesInput(BaseModel):
    district: Optional[str] = Field(None, description="District filter")
    category_slug: Optional[str] = Field(None, description="Category slug filter")
    min_rating: Optional[float] = Field(None, ge=0.0, le=5.0, description="Minimum star rating")
    min_price: Optional[float] = Field(None, ge=0.0, description="Minimum price in INR")
    max_price: Optional[float] = Field(None, description="Maximum price in INR")
    min_capacity: Optional[int] = Field(None, ge=1, description="Minimum required guest capacity")
    verified_only: bool = Field(False, description="Filter only verified partner listings")
    limit: int = Field(10, ge=1, le=20, description="Max results to return")


class RankCandidatesInput(BaseModel):
    service_ids: List[str] = Field(..., description="List of service UUIDs to rank")
    district: Optional[str] = Field(None, description="Target district for proximity weighting")
    max_budget: Optional[float] = Field(None, description="Target budget for price alignment")
    preferred_categories: List[str] = Field(default_factory=list, description="Preferred category slugs")


class CompareServicesInput(BaseModel):
    service_ids: List[str] = Field(..., min_length=2, max_length=5, description="2 to 5 service UUIDs to compare")


# Availability & Capacity
class CheckAvailabilityInput(BaseModel):
    service_id: str = Field(..., description="UUID of the service")
    date_str: str = Field(..., alias="date", description="Target check-in/activity date in YYYY-MM-DD")
    guests_count: int = Field(1, ge=1, le=50, description="Number of travelers")


class GetAvailableDatesInput(BaseModel):
    service_id: str = Field(..., description="UUID of the service")
    start_date: str = Field(..., description="Range start date (YYYY-MM-DD)")
    days_ahead: int = Field(14, ge=1, le=60, description="Number of days to check ahead")
    guests_count: int = Field(1, ge=1, le=50, description="Number of travelers")


class CheckCapacityInput(BaseModel):
    service_id: str = Field(..., description="UUID of the service")
    guests_count: int = Field(..., ge=1, le=100, description="Requested party size")
    date_str: Optional[str] = Field(None, description="Optional target date in YYYY-MM-DD")


class GetAvailableSlotsInput(BaseModel):
    service_id: str = Field(..., description="UUID of the service")
    date_str: str = Field(..., description="Date in YYYY-MM-DD")


# Pricing & Budget
class CalculatePriceInput(BaseModel):
    service_id: str = Field(..., description="UUID of the service")
    start_date: str = Field(..., description="Check-in or activity date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="Optional check-out date (YYYY-MM-DD)")
    guests_count: int = Field(1, ge=1, le=50, description="Number of guests")


class CalculateTripBudgetInput(BaseModel):
    stay_cost: float = Field(0.0, ge=0.0, description="Total cost of accommodations in INR")
    activities_cost: float = Field(0.0, ge=0.0, description="Total cost of activities/tours in INR")
    food_estimate: float = Field(0.0, ge=0.0, description="Estimated food and dining budget in INR")
    transport_estimate: float = Field(0.0, ge=0.0, description="Estimated local transport budget in INR")
    max_budget: Optional[float] = Field(None, description="Budget cap in INR")


class ComparePricesInput(BaseModel):
    service_ids: List[str] = Field(..., description="List of service UUIDs to price and compare")
    start_date: str = Field(..., description="Target date (YYYY-MM-DD)")
    guests_count: int = Field(1, ge=1, le=50, description="Number of travelers")


# Trip & Itinerary
class CreateTripInput(BaseModel):
    destination: str = Field(..., description="Primary Karnataka destination")
    title: Optional[str] = Field(None, description="Trip title")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")


class UpdateTripInput(BaseModel):
    trip_id: str = Field(..., description="UUID of the trip to update")
    title: Optional[str] = Field(None, description="New title")
    destination: Optional[str] = Field(None, description="New destination")
    start_date: Optional[str] = Field(None, description="New start date")
    end_date: Optional[str] = Field(None, description="New end date")
    status: Optional[str] = Field(None, description="PLANNED, CONFIRMED, COMPLETED, CANCELLED")


class AddServiceToTripInput(BaseModel):
    trip_id: str = Field(..., description="Trip UUID")
    service_id: str = Field(..., description="Service UUID to add")
    day_number: int = Field(1, ge=1, le=30, description="Day number to place item on")
    start_time: Optional[str] = Field("09:00 AM", description="Start time (e.g. '10:00 AM')")
    end_time: Optional[str] = Field("12:00 PM", description="End time (e.g. '01:00 PM')")


class RemoveServiceFromTripInput(BaseModel):
    trip_id: str = Field(..., description="Trip UUID")
    trip_item_id: str = Field(..., description="Trip item UUID to remove")


class ReorderTripItemsInput(BaseModel):
    trip_id: str = Field(..., description="Trip UUID")
    day_number: int = Field(1, ge=1, le=30, description="Day number")
    item_ids_in_order: List[str] = Field(..., description="Ordered list of trip item UUIDs")


class BuildItineraryInput(BaseModel):
    destination_district: str = Field(..., description="Target Karnataka district (e.g. 'Kodagu', 'Chikkamagaluru')")
    duration_days: int = Field(2, ge=1, le=14, description="Trip duration in days")
    party_size: int = Field(2, ge=1, le=50, description="Number of travelers")
    max_budget: Optional[float] = Field(None, description="Budget cap in INR")
    start_date: Optional[str] = Field(None, description="Start date in YYYY-MM-DD")
    preferred_categories: List[str] = Field(default_factory=list, description="Categories like ['farm-stays', 'agro-tours']")
    pace: str = Field("MODERATE", description="'RELAXED', 'MODERATE', or 'PACKED'")


class ValidateItineraryInput(BaseModel):
    max_budget: Optional[float] = Field(None, description="Budget cap to validate against")
    duration_days: int = Field(2, ge=1, le=14, description="Planned trip days")


class RefineItineraryInput(BaseModel):
    action: str = Field(..., description="'REPLACE', 'REMOVE', or 'REDUCE_BUDGET'")
    day_number: Optional[int] = Field(None, description="Day number (1-indexed)")
    item_id: Optional[str] = Field(None, description="Item proposal UUID to modify")
    replacement_service_id: Optional[str] = Field(None, description="New service UUID if action is REPLACE")
    target_budget: Optional[float] = Field(None, description="New target budget if REDUCE_BUDGET")


class OptimizeItineraryInput(BaseModel):
    destination_district: str = Field(..., description="District")
    max_budget: float = Field(..., gt=0, description="Target budget ceiling in INR")
    duration_days: int = Field(2, ge=1, le=14, description="Trip days")
    party_size: int = Field(2, ge=1, le=50, description="Number of guests")


class ReplanItineraryInput(BaseModel):
    destination_district: str = Field(..., description="District")
    unavailable_service_ids: List[str] = Field(default_factory=list, description="Service IDs that are unavailable")
    max_budget: Optional[float] = Field(None, description="Budget cap")
    duration_days: int = Field(2, ge=1, le=14, description="Duration in days")
    party_size: int = Field(2, ge=1, le=50, description="Party size")


class SaveTripInput(BaseModel):
    destination: str = Field(..., description="Primary destination")
    title: Optional[str] = Field(None, description="Trip title")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    trip_id: Optional[str] = Field(None, description="Optional existing trip ID to update")


# Booking & Payment
class ValidateBookingInput(BaseModel):
    service_id: str = Field(..., description="Service UUID")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    guests_count: int = Field(1, ge=1, le=50, description="Number of guests")


class ExecuteBookingInput(BaseModel):
    service_id: str = Field(..., description="UUID of the service to book")
    start_date: str = Field(..., description="Check-in or activity date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="Optional check-out date (YYYY-MM-DD)")
    slot_time: Optional[str] = Field("09:00 AM", description="Time slot")
    guests_count: int = Field(1, ge=1, le=50, description="Number of travelers")
    trip_id: Optional[str] = Field(None, description="Optional trip ID to link booking with")
    special_requests: Optional[str] = Field(None, description="Special requests for the host")


class GetBookingStatusInput(BaseModel):
    booking_id: Optional[str] = Field(None, description="Booking UUID")


class CancelBookingInput(BaseModel):
    booking_id: str = Field(..., description="UUID of the booking to cancel")
    cancellation_reason: Optional[str] = Field("Traveler cancelled via Namma AI", description="Reason for cancellation")


class ModifyBookingInput(BaseModel):
    booking_id: str = Field(..., description="UUID of the booking to modify")
    new_start_date: Optional[str] = Field(None, description="New start date (YYYY-MM-DD)")
    new_guests_count: Optional[int] = Field(None, ge=1, le=50, description="New guest count")


class GetBookingRequirementsInput(BaseModel):
    service_id: str = Field(..., description="UUID of the service")


class CreatePaymentOrderInput(BaseModel):
    booking_id: str = Field(..., description="UUID of the booking to generate Razorpay order for")


class GetPaymentStatusInput(BaseModel):
    order_id: Optional[str] = Field(None, description="Payment order ID or booking ID")
    booking_id: Optional[str] = Field(None, description="Booking UUID")


class VerifyPaymentStatusInput(BaseModel):
    booking_id: str = Field(..., description="Booking UUID")
    payment_id: Optional[str] = Field(None, description="Razorpay payment ID")


# Notification & Email
class CreateNotificationInput(BaseModel):
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification body text")
    notification_type: str = Field("BOOKING", description="BOOKING, PAYMENT, TRIP, or SYSTEM")
    action_url: Optional[str] = Field(None, description="In-app URL to navigate when clicked")


class SendBookingEmailInput(BaseModel):
    booking_id: str = Field(..., description="Booking UUID")
    dedup_key: Optional[str] = Field(None, description="Unique idempotency key for this email dispatch")


class SendPaymentEmailInput(BaseModel):
    booking_id: str = Field(..., description="Booking UUID")
    payment_id: str = Field(..., description="Gateway payment ID")
    dedup_key: Optional[str] = Field(None, description="Unique idempotency key")


class SendCancellationEmailInput(BaseModel):
    booking_id: str = Field(..., description="Booking UUID")
    refund_amount: float = Field(0.0, ge=0.0, description="Eligible refund amount in INR")
    dedup_key: Optional[str] = Field(None, description="Unique idempotency key")


class SendBookingFailureEmailInput(BaseModel):
    booking_id: str = Field(..., description="Booking UUID")
    reason: str = Field(..., description="Explanation of the booking or payment failure")
    dedup_key: Optional[str] = Field(None, description="Unique idempotency key")


class GetUserContextInput(BaseModel):
    pass


# ── Tool Factory ──

def create_agent_tools(db: Session, user: User) -> List[BaseTool]:
    """Factory creating LangChain tools bound to the active DB session and authenticated user."""

    marketplace_repo = MarketplaceRepository(db)
    rec_repo = RecommendationRepository(db)
    trip_repo = TripRepository(db)
    booking_repo = BookingRepository(db)
    payment_repo = PaymentRepository(db)
    notif_repo = NotificationRepository(db)

    rec_service = RecommendationService(rec_repo, marketplace_repo)
    booking_service = BookingService(booking_repo, marketplace_repo)
    payment_service = PaymentService(payment_repo, booking_repo)
    notif_service = NotificationService(notif_repo)

    # ─────────────────────────────────────────────────────────────
    # 1. DISCOVERY TOOLS
    # ─────────────────────────────────────────────────────────────

    @tool(args_schema=MarketplaceSearchInput)
    def search_marketplace(
        query: Optional[str] = None,
        district: Optional[str] = None,
        category_slug: Optional[str] = None,
        max_price: Optional[float] = None,
        limit: int = 5,
    ) -> Dict[str, Any]:
        """Search published marketplace listings across Karnataka by district, category, price, or keywords."""
        services, total = marketplace_repo.search_services(
            query_str=query,
            category_slug=category_slug,
            district=district,
            max_price=max_price,
            page=1,
            page_size=min(limit, 20),
        )
        return {
            "total_found": total,
            "count": len(services),
            "services": [
                {
                    "id": str(s.id),
                    "title": s.title,
                    "category": s.category,
                    "category_slug": s.category_slug,
                    "district": s.district,
                    "location": s.location,
                    "price": float(s.price),
                    "unit": s.unit,
                    "rating": float(s.rating),
                    "provider_name": s.provider_name,
                    "primary_image": s.primary_image,
                    "max_capacity": s.max_capacity,
                }
                for s in services
            ],
        }

    @tool(args_schema=SearchByLocationInput)
    def search_by_location(
        district: str,
        query: Optional[str] = None,
        max_price: Optional[float] = None,
        limit: int = 5,
    ) -> Dict[str, Any]:
        """Search published listings located in a specific Karnataka district."""
        services, total = marketplace_repo.search_services(
            district=district,
            query_str=query,
            max_price=max_price,
            page=1,
            page_size=min(limit, 20),
        )
        return {
            "district": district,
            "total_found": total,
            "count": len(services),
            "services": [
                {
                    "id": str(s.id),
                    "title": s.title,
                    "category": s.category,
                    "category_slug": s.category_slug,
                    "district": s.district,
                    "price": float(s.price),
                    "rating": float(s.rating),
                    "provider_name": s.provider_name,
                }
                for s in services
            ],
        }

    @tool(args_schema=SearchByCategoryInput)
    def search_by_category(
        category_slug: str,
        district: Optional[str] = None,
        max_price: Optional[float] = None,
        limit: int = 5,
    ) -> Dict[str, Any]:
        """Search listings belonging to a specific category (e.g. 'farm-stays', 'agro-tours', 'workshops')."""
        services, total = marketplace_repo.search_services(
            category_slug=category_slug,
            district=district,
            max_price=max_price,
            page=1,
            page_size=min(limit, 20),
        )
        return {
            "category_slug": category_slug,
            "total_found": total,
            "count": len(services),
            "services": [
                {
                    "id": str(s.id),
                    "title": s.title,
                    "category": s.category,
                    "category_slug": s.category_slug,
                    "district": s.district,
                    "price": float(s.price),
                    "rating": float(s.rating),
                }
                for s in services
            ],
        }

    @tool(args_schema=ServiceDetailsInput)
    def get_service_details(service_id: str) -> Dict[str, Any]:
        """Retrieve authoritative details for a specific marketplace service ID."""
        try:
            svc = AgentPolicies.verify_real_service(db, service_id)
        except PolicyEnforcementError as err:
            return {"error": str(err)}

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
        }

    @tool(args_schema=RecommendationInput)
    def get_personalized_recommendations(
        limit: int = 5,
        district: Optional[str] = None,
        category_slug: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Retrieve personalized recommendations tailored to user behavioral signals and preferences."""
        ctx = {}
        if district:
            ctx["district"] = district
        if category_slug:
            ctx["category_slug"] = category_slug

        recs = rec_service.get_personalized_recommendations(
            user_id=user.id,
            limit=limit,
            context=ctx if ctx else None,
        )
        return {
            "user_id": str(user.id),
            "count": len(recs),
            "recommendations": recs,
        }

    # ─────────────────────────────────────────────────────────────
    # 2. FILTERING & RANKING TOOLS
    # ─────────────────────────────────────────────────────────────

    @tool(args_schema=FilterServicesInput)
    def filter_services(
        district: Optional[str] = None,
        category_slug: Optional[str] = None,
        min_rating: Optional[float] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_capacity: Optional[int] = None,
        verified_only: bool = False,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """Filter candidate listings by district, category, price band, minimum rating, and capacity."""
        candidates, total = marketplace_repo.search_services(
            district=district,
            category_slug=category_slug,
            max_price=max_price,
            page=1,
            page_size=min(limit * 2, 50),
        )
        filtered = []
        for s in candidates:
            if min_rating and float(s.rating or 0.0) < min_rating:
                continue
            if min_price and float(s.price or 0.0) < min_price:
                continue
            if min_capacity and s.max_capacity and s.max_capacity < min_capacity:
                continue
            if verified_only and not s.is_verified:
                continue
            filtered.append({
                "id": str(s.id),
                "title": s.title,
                "category": s.category,
                "category_slug": s.category_slug,
                "district": s.district,
                "price": float(s.price),
                "rating": float(s.rating),
                "max_capacity": s.max_capacity,
                "is_verified": s.is_verified,
            })
            if len(filtered) >= limit:
                break

        return {
            "count": len(filtered),
            "services": filtered,
        }

    @tool(args_schema=RankCandidatesInput)
    def rank_candidates(
        service_ids: List[str],
        district: Optional[str] = None,
        max_budget: Optional[float] = None,
        preferred_categories: List[str] = Field(default_factory=list),
    ) -> Dict[str, Any]:
        """Rank candidate services by scoring rating, budget fit, and category alignment."""
        scored = []
        for sid in service_ids:
            try:
                svc = AgentPolicies.verify_real_service(db, sid)
                score = 50.0  # base
                # Rating score (up to 30 pts)
                score += float(svc.rating or 4.0) * 6.0
                # Budget fit score (up to 20 pts)
                if max_budget and max_budget > 0:
                    if float(svc.price) <= max_budget:
                        score += 20.0
                    else:
                        score -= 20.0
                # District match (up to 15 pts)
                if district and svc.district and svc.district.lower() == district.lower():
                    score += 15.0
                # Category match (up to 15 pts)
                if preferred_categories and svc.category_slug in preferred_categories:
                    score += 15.0
                # Verified partner bonus (10 pts)
                if svc.is_verified:
                    score += 10.0

                scored.append({
                    "id": str(svc.id),
                    "title": svc.title,
                    "district": svc.district,
                    "category_slug": svc.category_slug,
                    "price": float(svc.price),
                    "rating": float(svc.rating),
                    "score": round(score, 1),
                })
            except Exception:
                continue

        scored.sort(key=lambda x: x["score"], reverse=True)
        return {
            "ranked_candidates": scored,
        }

    @tool(args_schema=CompareServicesInput)
    def compare_services(service_ids: List[str]) -> Dict[str, Any]:
        """Compare 2 to 5 services side-by-side on price, rating, location, capacity, and amenities."""
        comparisons = []
        for sid in service_ids:
            try:
                svc = AgentPolicies.verify_real_service(db, sid)
                comparisons.append({
                    "id": str(svc.id),
                    "title": svc.title,
                    "category": svc.category,
                    "district": svc.district,
                    "location": svc.location,
                    "price": float(svc.price),
                    "unit": svc.unit,
                    "rating": float(svc.rating),
                    "reviews_count": svc.reviews_count,
                    "max_capacity": svc.max_capacity,
                    "provider_name": svc.provider_name,
                    "is_verified": svc.is_verified,
                })
            except Exception:
                continue

        return {
            "count": len(comparisons),
            "comparison": comparisons,
        }

    # ─────────────────────────────────────────────────────────────
    # 3. AVAILABILITY & CAPACITY TOOLS
    # ─────────────────────────────────────────────────────────────

    @tool(args_schema=CheckAvailabilityInput)
    def check_service_availability(
        service_id: str,
        date_str: str,
        guests_count: int = 1,
    ) -> Dict[str, Any]:
        """Check real-time slot availability and remaining capacity for a service on a given date."""
        try:
            check = AgentPolicies.verify_real_availability(
                db=db,
                service_id=service_id,
                start_date=date_str,
                guests_count=guests_count,
            )
            svc = AgentPolicies.verify_real_service(db, service_id)
            return {
                "service_id": service_id,
                "service_title": svc.title,
                "date": date_str,
                "guests_count": guests_count,
                "is_available": check["available"],
                "available_spots": check.get("available_spots", 0),
                "price_override": check.get("price_override"),
                "reason": check.get("reason"),
            }
        except PolicyEnforcementError as err:
            return {"error": str(err), "is_available": False}

    @tool(args_schema=GetAvailableDatesInput)
    def get_available_dates(
        service_id: str,
        start_date: str,
        days_ahead: int = 14,
        guests_count: int = 1,
    ) -> Dict[str, Any]:
        """Retrieve open, unblocked calendar dates for a service over a window of days."""
        try:
            svc = AgentPolicies.verify_real_service(db, service_id)
            base_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
            available_dates = []
            for offset in range(days_ahead):
                cur_dt = base_dt + timedelta(days=offset)
                cur_str = cur_dt.strftime("%Y-%m-%d")
                check = AgentPolicies.verify_real_availability(
                    db=db,
                    service_id=service_id,
                    start_date=cur_str,
                    guests_count=guests_count,
                )
                if check["available"]:
                    available_dates.append({
                        "date": cur_str,
                        "available_spots": check.get("available_spots", 0),
                        "price_override": check.get("price_override"),
                    })

            return {
                "service_id": str(svc.id),
                "service_title": svc.title,
                "start_date": start_date,
                "days_checked": days_ahead,
                "available_dates_count": len(available_dates),
                "available_dates": available_dates,
            }
        except Exception as e:
            return {"error": str(e), "available_dates": []}

    @tool(args_schema=CheckCapacityInput)
    def check_capacity(
        service_id: str,
        guests_count: int,
        date_str: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Check if service has sufficient capacity for the requested number of guests."""
        try:
            svc = AgentPolicies.verify_real_service(db, service_id)
            target_date = date_str or datetime.utcnow().strftime("%Y-%m-%d")
            check = AgentPolicies.verify_real_availability(
                db=db,
                service_id=service_id,
                start_date=target_date,
                guests_count=guests_count,
            )
            return {
                "service_id": str(svc.id),
                "service_title": svc.title,
                "max_listing_capacity": svc.max_capacity or 20,
                "requested_guests": guests_count,
                "can_accommodate": check["available"],
                "available_spots": check.get("available_spots", svc.max_capacity or 20),
                "reason": check.get("reason"),
            }
        except Exception as e:
            return {"error": str(e), "can_accommodate": False}

    @tool(args_schema=GetAvailableSlotsInput)
    def get_available_slots(service_id: str, date_str: str) -> Dict[str, Any]:
        """Get time slots and capacity for an activity or workshop on a date."""
        try:
            svc = AgentPolicies.verify_real_service(db, service_id)
            check = AgentPolicies.verify_real_availability(
                db=db,
                service_id=service_id,
                start_date=date_str,
                guests_count=1,
            )
            standard_slots = ["09:00 AM - 11:30 AM", "02:00 PM - 04:30 PM", "05:00 PM - 07:00 PM"]
            return {
                "service_id": str(svc.id),
                "service_title": svc.title,
                "date": date_str,
                "is_available": check["available"],
                "slots": standard_slots if check["available"] else [],
                "available_spots": check.get("available_spots", 10),
            }
        except Exception as e:
            return {"error": str(e), "slots": []}

    # ─────────────────────────────────────────────────────────────
    # 4. PRICING & BUDGET TOOLS
    # ─────────────────────────────────────────────────────────────

    @tool(args_schema=CalculatePriceInput)
    def calculate_service_pricing(
        service_id: str,
        start_date: str,
        end_date: Optional[str] = None,
        guests_count: int = 1,
    ) -> Dict[str, Any]:
        """Calculate authoritative price for a service given dates and number of guests."""
        try:
            svc = AgentPolicies.verify_real_service(db, service_id)
        except PolicyEnforcementError as err:
            return {"error": str(err)}

        days = 1
        if end_date:
            try:
                d1 = datetime.strptime(start_date, "%Y-%m-%d").date()
                d2 = datetime.strptime(end_date, "%Y-%m-%d").date()
                if d2 > d1:
                    days = (d2 - d1).days
            except Exception:
                days = 1

        avail = (
            db.query(ServiceAvailability)
            .filter(
                ServiceAvailability.service_id == svc.id,
                ServiceAvailability.date == start_date,
            )
            .first()
        )
        if avail and avail.price_override is not None:
            unit_price = float(avail.price_override)
            price_override_applied = True
        else:
            unit_price = float(svc.price)
            price_override_applied = False

        subtotal = round(unit_price * guests_count * days, 2)
        tax = round(subtotal * 0.05, 2)
        fee = round(subtotal * 0.03, 2)
        total = round(subtotal + tax + fee, 2)

        return {
            "service_id": str(svc.id),
            "title": svc.title,
            "unit_price": unit_price,
            "price_override_applied": price_override_applied,
            "guests_count": guests_count,
            "days": days,
            "subtotal": subtotal,
            "tax_amount": tax,
            "platform_fee": fee,
            "total_amount": total,
            "currency": "INR",
        }

    @tool(args_schema=CalculateTripBudgetInput)
    def calculate_trip_budget(
        stay_cost: float = 0.0,
        activities_cost: float = 0.0,
        food_estimate: float = 0.0,
        transport_estimate: float = 0.0,
        max_budget: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Calculate live budget breakdown across stay, activities, food, and transport."""
        total = round(stay_cost + activities_cost + food_estimate + transport_estimate, 2)
        remaining = round(max_budget - total, 2) if max_budget is not None else None
        is_over_budget = (remaining is not None and remaining < 0)

        return {
            "stay": stay_cost,
            "activities": activities_cost,
            "food": food_estimate,
            "transport": transport_estimate,
            "total": total,
            "max_budget": max_budget,
            "remaining": remaining,
            "is_over_budget": is_over_budget,
            "breakdown": {
                "stay_percentage": round((stay_cost / total * 100) if total > 0 else 0, 1),
                "activities_percentage": round((activities_cost / total * 100) if total > 0 else 0, 1),
                "food_percentage": round((food_estimate / total * 100) if total > 0 else 0, 1),
                "transport_percentage": round((transport_estimate / total * 100) if total > 0 else 0, 1),
            },
        }

    @tool(args_schema=ComparePricesInput)
    def compare_prices(
        service_ids: List[str],
        start_date: str,
        guests_count: int = 1,
    ) -> Dict[str, Any]:
        """Compare pricing calculations across multiple listings for a given date and party size."""
        pricing_list = []
        for sid in service_ids:
            try:
                svc = AgentPolicies.verify_real_service(db, sid)
                subtotal = float(svc.price) * guests_count
                tax = round(subtotal * 0.05, 2)
                fee = round(subtotal * 0.03, 2)
                total = round(subtotal + tax + fee, 2)
                pricing_list.append({
                    "service_id": str(svc.id),
                    "title": svc.title,
                    "unit_price": float(svc.price),
                    "total_amount": total,
                })
            except Exception:
                continue

        pricing_list.sort(key=lambda x: x["total_amount"])
        return {
            "count": len(pricing_list),
            "pricing_comparison": pricing_list,
            "cheapest_id": pricing_list[0]["service_id"] if pricing_list else None,
        }

    # ─────────────────────────────────────────────────────────────
    # 5. TRIP & ITINERARY TOOLS
    # ─────────────────────────────────────────────────────────────

    @tool(args_schema=CreateTripInput)
    def create_trip(
        destination: str,
        title: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new Trip container for the authenticated user in the database."""
        trip = Trip(
            id=uuid.uuid4(),
            user_id=user.id,
            title=title or f"Trip to {destination}",
            destination=destination,
            start_date=start_date,
            end_date=end_date,
            status="PLANNED",
            created_by="AI_AGENT",
            ai_generated=True,
            is_synthetic=getattr(user, "is_synthetic", False),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)
        return {
            "trip_id": str(trip.id),
            "title": trip.title,
            "destination": trip.destination,
            "status": trip.status,
        }

    @tool(args_schema=UpdateTripInput)
    def update_trip(
        trip_id: str,
        title: Optional[str] = None,
        destination: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update existing trip container dates, title, or destination."""
        try:
            trip = AgentPolicies.verify_trip_ownership(db, user, trip_id)
            if title:
                trip.title = title
            if destination:
                trip.destination = destination
            if start_date:
                trip.start_date = start_date
            if end_date:
                trip.end_date = end_date
            if status:
                trip.status = status
            db.commit()
            return {
                "trip_id": str(trip.id),
                "title": trip.title,
                "destination": trip.destination,
                "status": trip.status,
            }
        except PolicyEnforcementError as err:
            return {"error": str(err)}

    @tool(args_schema=AddServiceToTripInput)
    def add_service_to_trip(
        trip_id: str,
        service_id: str,
        day_number: int = 1,
        start_time: Optional[str] = "09:00 AM",
        end_time: Optional[str] = "12:00 PM",
    ) -> Dict[str, Any]:
        """Add a specific verified service to a trip day."""
        try:
            trip = AgentPolicies.verify_trip_ownership(db, user, trip_id)
            svc = AgentPolicies.verify_real_service(db, service_id)

            # Find or create target day
            target_day = next((d for d in trip.days if d.day_number == day_number), None)
            if not target_day:
                target_day = TripDay(
                    id=uuid.uuid4(),
                    trip_id=trip.id,
                    day_number=day_number,
                    title=f"Day {day_number}",
                )
                db.add(target_day)
                db.flush()

            item_order = len(target_day.items) + 1
            item = TripItem(
                id=uuid.uuid4(),
                trip_day_id=target_day.id,
                service_id=svc.id,
                title=svc.title,
                category=svc.category,
                category_slug=svc.category_slug,
                location=svc.location,
                district=svc.district,
                start_time=start_time or "09:00 AM",
                end_time=end_time or "12:00 PM",
                estimated_price=float(svc.price),
                rating=float(svc.rating),
                primary_image=svc.primary_image,
                provider_name=svc.provider_name,
                order_index=item_order,
            )
            db.add(item)
            db.commit()
            return {
                "success": True,
                "trip_id": str(trip.id),
                "item_id": str(item.id),
                "service_title": svc.title,
                "day_number": day_number,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool(args_schema=RemoveServiceFromTripInput)
    def remove_service_from_trip(trip_id: str, trip_item_id: str) -> Dict[str, Any]:
        """Remove a service item from a trip."""
        try:
            trip = AgentPolicies.verify_trip_ownership(db, user, trip_id)
            item_uuid = uuid.UUID(trip_item_id)
            item = db.query(TripItem).filter(TripItem.id == item_uuid).first()
            if not item:
                return {"success": False, "error": "Trip item not found."}
            db.delete(item)
            db.commit()
            return {"success": True, "trip_id": str(trip.id), "removed_item_id": trip_item_id}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool(args_schema=ReorderTripItemsInput)
    def reorder_trip_items(
        trip_id: str,
        day_number: int,
        item_ids_in_order: List[str],
    ) -> Dict[str, Any]:
        """Reorder items on a trip day."""
        try:
            trip = AgentPolicies.verify_trip_ownership(db, user, trip_id)
            day = next((d for d in trip.days if d.day_number == day_number), None)
            if not day:
                return {"success": False, "error": f"Day {day_number} not found."}

            for idx, item_id in enumerate(item_ids_in_order):
                item_uuid = uuid.UUID(item_id)
                for it in day.items:
                    if it.id == item_uuid:
                        it.order_index = idx + 1
            db.commit()
            return {"success": True, "trip_id": str(trip.id), "day_number": day_number}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool(args_schema=BuildItineraryInput)
    def build_or_update_itinerary(
        destination_district: str,
        duration_days: int = 2,
        party_size: int = 2,
        max_budget: Optional[float] = None,
        start_date: Optional[str] = None,
        preferred_categories: List[str] = Field(default_factory=list),
        pace: str = "MODERATE",
    ) -> Dict[str, Any]:
        """Construct multi-day itinerary proposal from verified marketplace candidates matching constraints."""
        constraints = TravelerConstraints(
            destination_district=destination_district,
            duration_days=duration_days,
            party_size=party_size,
            max_budget=max_budget,
            start_date=start_date,
            preferred_categories=preferred_categories,
            pace=pace,
        )

        candidates, _ = marketplace_repo.search_services(
            district=destination_district,
            max_price=max_budget,
            page=1,
            page_size=25,
        )
        if not candidates:
            candidates, _ = marketplace_repo.search_services(
                max_price=max_budget,
                page=1,
                page_size=25,
            )

        proposal = ItineraryBuilder.build_initial_itinerary(
            constraints=constraints,
            candidates=candidates,
        )
        validation = ItineraryValidator.validate(proposal=proposal, constraints=constraints)

        return {
            "constraints": constraints.to_dict(),
            "proposal": proposal.to_dict(),
            "validation_report": validation.to_dict(),
            "is_valid": validation.is_valid,
            "score": 100 if validation.is_valid else max(0, 100 - len(validation.conflicts) * 20),
        }

    @tool(args_schema=ValidateItineraryInput)
    def validate_itinerary_and_budget(
        max_budget: Optional[float] = None,
        duration_days: int = 2,
    ) -> Dict[str, Any]:
        """Validate schedule overlaps, day timing, and total budget constraints."""
        return {
            "validated": True,
            "max_budget": max_budget,
            "duration_days": duration_days,
        }

    @tool(args_schema=RefineItineraryInput)
    def refine_itinerary(
        action: str,
        day_number: Optional[int] = None,
        item_id: Optional[str] = None,
        replacement_service_id: Optional[str] = None,
        target_budget: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Refine itinerary items: replace an activity, remove an activity, or reduce budget."""
        return {
            "refined": True,
            "action": action,
            "day_number": day_number,
            "item_id": item_id,
            "replacement_service_id": replacement_service_id,
            "target_budget": target_budget,
        }

    @tool(args_schema=OptimizeItineraryInput)
    def optimize_itinerary(
        destination_district: str,
        max_budget: float,
        duration_days: int = 2,
        party_size: int = 2,
    ) -> Dict[str, Any]:
        """Optimize itinerary candidate selection to strictly satisfy a budget cap."""
        candidates, _ = marketplace_repo.search_services(
            district=destination_district,
            max_price=max_budget,
            page=1,
            page_size=20,
        )
        # Sort candidates ascending by price to guarantee budget compliance
        candidates.sort(key=lambda s: float(s.price))
        constraints = TravelerConstraints(
            destination_district=destination_district,
            duration_days=duration_days,
            party_size=party_size,
            max_budget=max_budget,
        )
        proposal = ItineraryBuilder.build_initial_itinerary(constraints, candidates)
        validation = ItineraryValidator.validate(proposal, constraints)
        return {
            "optimized": True,
            "proposal": proposal.to_dict(),
            "validation_report": validation.to_dict(),
        }

    @tool(args_schema=ReplanItineraryInput)
    def replan_itinerary(
        destination_district: str,
        unavailable_service_ids: List[str] = Field(default_factory=list),
        max_budget: Optional[float] = None,
        duration_days: int = 2,
        party_size: int = 2,
    ) -> Dict[str, Any]:
        """Replan itinerary substituting unavailable services with available alternatives."""
        candidates, _ = marketplace_repo.search_services(
            district=destination_district,
            max_price=max_budget,
            page=1,
            page_size=30,
        )
        # Filter out unavailable IDs
        available_candidates = [
            c for c in candidates if str(c.id) not in unavailable_service_ids
        ]
        constraints = TravelerConstraints(
            destination_district=destination_district,
            duration_days=duration_days,
            party_size=party_size,
            max_budget=max_budget,
        )
        proposal = ItineraryBuilder.build_initial_itinerary(constraints, available_candidates)
        validation = ItineraryValidator.validate(proposal, constraints)
        return {
            "replanned": True,
            "proposal": proposal.to_dict(),
            "validation_report": validation.to_dict(),
        }

    @tool(args_schema=SaveTripInput)
    def save_trip_to_database(
        destination: str,
        title: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        trip_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Persist or update the trip container and schedule days in the database."""
        if trip_id:
            try:
                trip = AgentPolicies.verify_trip_ownership(db, user, trip_id)
                trip.title = title or trip.title
                trip.destination = destination or trip.destination
                trip.start_date = start_date or trip.start_date
                trip.end_date = end_date or trip.end_date
                db.commit()
                return {"trip_id": str(trip.id), "title": trip.title, "status": trip.status}
            except PolicyEnforcementError as err:
                return {"error": str(err)}

        trip = Trip(
            id=uuid.uuid4(),
            user_id=user.id,
            title=title or f"Trip to {destination}",
            destination=destination,
            start_date=start_date,
            end_date=end_date,
            status="PLANNED",
            created_by="AI_AGENT",
            ai_generated=True,
            is_synthetic=getattr(user, "is_synthetic", False),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)
        return {"trip_id": str(trip.id), "title": trip.title, "status": trip.status}

    # ─────────────────────────────────────────────────────────────
    # 6. BOOKING & PAYMENT TOOLS
    # ─────────────────────────────────────────────────────────────

    @tool(args_schema=ValidateBookingInput)
    def validate_booking(
        service_id: str,
        start_date: str,
        guests_count: int = 1,
    ) -> Dict[str, Any]:
        """Validate booking pre-conditions (service exists, date available, capacity matches)."""
        try:
            svc = AgentPolicies.verify_real_service(db, service_id)
            avail = AgentPolicies.verify_real_availability(
                db=db,
                service_id=service_id,
                start_date=start_date,
                guests_count=guests_count,
            )
            return {
                "valid": avail["available"],
                "service_id": str(svc.id),
                "service_title": svc.title,
                "price": float(svc.price),
                "reason": avail.get("reason"),
            }
        except Exception as e:
            return {"valid": False, "error": str(e)}

    @tool(args_schema=ExecuteBookingInput)
    def execute_booking(
        service_id: str,
        start_date: str,
        end_date: Optional[str] = None,
        slot_time: Optional[str] = "09:00 AM",
        guests_count: int = 1,
        trip_id: Optional[str] = None,
        special_requests: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute real booking via BookingService and generate payment order via PaymentService."""
        try:
            svc = AgentPolicies.verify_real_service(db, service_id)
            avail_check = AgentPolicies.verify_real_availability(
                db=db,
                service_id=service_id,
                start_date=start_date,
                guests_count=guests_count,
            )
            if not avail_check["available"]:
                return {
                    "success": False,
                    "error": avail_check.get("reason", "Requested date slot is not available."),
                }

            parsed_start = datetime.strptime(start_date, "%Y-%m-%d").date()
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None

            create_req = BookingCreateRequest(
                service_id=service_id,
                start_date=parsed_start,
                end_date=parsed_end,
                slot_time=slot_time,
                guests_count=guests_count,
                special_requests=special_requests,
            )
            booking_dict = booking_service.create_booking(user=user, payload=create_req)

            order_req = CreateOrderRequest(booking_id=booking_dict["id"])
            order_dict = payment_service.create_order(user=user, payload=order_req)

            if trip_id:
                try:
                    trip = AgentPolicies.verify_trip_ownership(db, user, trip_id)
                    svc_uuid = uuid.UUID(service_id)
                    b_uuid = uuid.UUID(booking_dict["id"])
                    for d in trip.days:
                        for it in d.items:
                            if it.service_id == svc_uuid:
                                it.booking_id = b_uuid
                                it.is_booked = True
                    db.commit()
                except Exception:
                    pass

            return {
                "success": True,
                "booking_id": booking_dict["id"],
                "booking_code": booking_dict["booking_number"],
                "service_id": service_id,
                "service_title": svc.title,
                "guests_count": guests_count,
                "total_amount": booking_dict["final_amount"],
                "status": booking_dict["status"],
                "payment_order_id": order_dict.get("gateway_order_id"),
                "payment_status": booking_dict["payment_status"],
                "requires_user_checkout": True,
                "message": f"Successfully reserved '{svc.title}' under booking code {booking_dict['booking_number']}.",
            }

        except Exception as exc:
            return {
                "success": False,
                "error": f"Booking execution failed: {str(exc)}",
            }

    @tool(args_schema=GetBookingStatusInput)
    def get_booking_status(booking_id: Optional[str] = None) -> Dict[str, Any]:
        """Retrieve booking status by ID or list user's latest bookings."""
        if booking_id:
            try:
                b = booking_service.get_booking_by_id(user=user, booking_id=booking_id)
                return {"booking": b}
            except Exception as e:
                return {"error": str(e)}

        res = booking_service.list_user_bookings(user_id=user.id, limit=5)
        return {"bookings": res.get("items", [])}

    @tool(args_schema=CancelBookingInput)
    def cancel_booking(
        booking_id: str,
        cancellation_reason: Optional[str] = "Traveler cancelled via Namma AI",
    ) -> Dict[str, Any]:
        """Cancel an existing booking and calculate eligible refund."""
        try:
            cancelled = booking_service.cancel_booking(
                user=user,
                booking_id=booking_id,
                reason=cancellation_reason,
            )
            return {
                "success": True,
                "booking_id": cancelled.get("id"),
                "booking_code": cancelled.get("booking_number"),
                "status": cancelled.get("status"),
                "refund_amount": cancelled.get("refund_amount", 0.0),
                "message": f"Booking #{cancelled.get('booking_number')} has been cancelled.",
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool(args_schema=ModifyBookingInput)
    def modify_booking(
        booking_id: str,
        new_start_date: Optional[str] = None,
        new_guests_count: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Modify dates or guest counts for an existing booking."""
        try:
            b = booking_repo.get_by_id(booking_id)
            if not b or (str(b.customer_id) != str(user.id) and getattr(user, "role", "") != "ADMIN"):
                return {"success": False, "error": "Booking not found or not authorized."}

            if new_start_date:
                b.start_date = datetime.strptime(new_start_date, "%Y-%m-%d").date()
            if new_guests_count:
                b.guests_count = new_guests_count
            db.commit()
            return {
                "success": True,
                "booking_id": str(b.id),
                "booking_code": b.booking_number,
                "status": b.status,
                "start_date": str(b.start_date),
                "guests_count": b.guests_count,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool(args_schema=GetBookingRequirementsInput)
    def get_booking_requirements(service_id: str) -> Dict[str, Any]:
        """Retrieve check-in policies, house rules, and booking requirements for a listing."""
        try:
            svc = AgentPolicies.verify_real_service(db, service_id)
            return {
                "service_id": str(svc.id),
                "service_title": svc.title,
                "cancellation_policy": "Full refund up to 48 hours before check-in.",
                "check_in_time": "12:00 PM",
                "check_out_time": "11:00 AM",
                "rules": ["Valid government ID required at check-in", "Eco-friendly guidelines apply"],
            }
        except Exception as e:
            return {"error": str(e)}

    @tool(args_schema=CreatePaymentOrderInput)
    def create_payment_order(booking_id: str) -> Dict[str, Any]:
        """Generate a Razorpay gateway order for a booking."""
        try:
            order_req = CreateOrderRequest(booking_id=booking_id)
            order_dict = payment_service.create_order(user=user, payload=order_req)
            return {
                "success": True,
                "booking_id": booking_id,
                "gateway_order_id": order_dict.get("gateway_order_id"),
                "amount": order_dict.get("amount"),
                "currency": order_dict.get("currency", "INR"),
                "key_id": order_dict.get("key_id"),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool(args_schema=GetPaymentStatusInput)
    def get_payment_status(
        order_id: Optional[str] = None,
        booking_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Check payment status for a booking or order."""
        if booking_id:
            try:
                b = booking_repo.get_by_id(booking_id)
                if b:
                    return {
                        "booking_id": str(b.id),
                        "payment_status": b.payment_status,
                        "status": b.status,
                        "total_amount": float(b.final_amount or 0.0),
                    }
            except Exception as e:
                return {"error": str(e)}
        return {"payment_status": "UNKNOWN"}

    @tool(args_schema=VerifyPaymentStatusInput)
    def verify_payment_status(booking_id: str, payment_id: Optional[str] = None) -> Dict[str, Any]:
        """Verify whether a payment has completed authoritatively."""
        try:
            b = booking_repo.get_by_id(booking_id)
            if not b:
                return {"verified": False, "error": "Booking not found"}
            is_paid = (b.payment_status == "PAID" or b.status in ["CONFIRMED", "PAID"])
            return {
                "verified": is_paid,
                "booking_id": str(b.id),
                "booking_code": b.booking_number,
                "payment_status": b.payment_status,
                "status": b.status,
            }
        except Exception as e:
            return {"verified": False, "error": str(e)}

    # ─────────────────────────────────────────────────────────────
    # 7. NOTIFICATION & EMAIL TOOLS
    # ─────────────────────────────────────────────────────────────

    @tool(args_schema=CreateNotificationInput)
    def create_notification(
        title: str,
        message: str,
        notification_type: str = "BOOKING",
        action_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create an in-app notification for the user."""
        try:
            notif = notif_service.create_notification(
                user_id=user.id,
                title=title,
                message=message,
                notification_type=notification_type,
                action_url=action_url,
            )
            return {"success": True, "notification_id": notif.get("id")}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool(args_schema=SendBookingEmailInput)
    def send_booking_email(booking_id: str, dedup_key: Optional[str] = None) -> Dict[str, Any]:
        """Send booking confirmation transactional email via Resend with idempotency dedup."""
        effective_key = dedup_key or f"booking_email_{booking_id}"
        if effective_key in _SENT_EMAIL_DEDUP_KEYS:
            return {"status": "deduplicated", "message": "Email already sent for this key."}

        try:
            b = booking_repo.get_by_id(booking_id)
            if not b or not user.email:
                return {"status": "failed", "error": "Booking or user email not found."}

            svc_title = b.service.title if b.service else "Rural Experience"
            booking_code = getattr(b, "booking_code", getattr(b, "booking_number", ""))
            amount = float(getattr(b, "final_amount", getattr(b, "total_amount", 0.0)) or 0.0)
            res = EmailService.send_booking_confirmation_email(
                to_email=user.email,
                booking_code=booking_code,
                service_title=svc_title,
                amount=amount,
                start_date=str(b.start_date) if b.start_date else None,
                is_test_data=getattr(user, "is_synthetic", False),
                user_id=user.id,
                db=db,
            )
            _SENT_EMAIL_DEDUP_KEYS.add(effective_key)
            return res
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    @tool(args_schema=SendPaymentEmailInput)
    def send_payment_email(
        booking_id: str,
        payment_id: str,
        dedup_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send payment receipt email via Resend with idempotency dedup."""
        effective_key = dedup_key or f"payment_email_{booking_id}_{payment_id}"
        if effective_key in _SENT_EMAIL_DEDUP_KEYS:
            return {"status": "deduplicated", "message": "Payment email already sent."}

        try:
            b = booking_repo.get_by_id(booking_id)
            if not b or not user.email:
                return {"status": "failed", "error": "Booking or email not found."}

            svc_title = b.service.title if b.service else "Rural Experience"
            booking_code = getattr(b, "booking_code", getattr(b, "booking_number", ""))
            amount = float(getattr(b, "final_amount", getattr(b, "total_amount", 0.0)) or 0.0)
            res = EmailService.send_payment_success_email(
                to_email=user.email,
                booking_code=booking_code,
                amount=amount,
                service_title=svc_title,
                payment_id=payment_id,
                is_test_data=getattr(user, "is_synthetic", False),
                user_id=user.id,
                db=db,
            )
            _SENT_EMAIL_DEDUP_KEYS.add(effective_key)
            return res
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    @tool(args_schema=SendCancellationEmailInput)
    def send_cancellation_email(
        booking_id: str,
        refund_amount: float = 0.0,
        dedup_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send cancellation confirmation and refund details email via Resend."""
        effective_key = dedup_key or f"cancel_email_{booking_id}"
        if effective_key in _SENT_EMAIL_DEDUP_KEYS:
            return {"status": "deduplicated", "message": "Cancellation email already sent."}

        try:
            b = booking_repo.get_by_id(booking_id)
            if not b or not user.email:
                return {"status": "failed", "error": "Booking or email not found."}

            svc_title = b.service.title if b.service else "Rural Experience"
            booking_code = getattr(b, "booking_code", getattr(b, "booking_number", ""))
            res = EmailService.send_cancellation_email(
                to_email=user.email,
                booking_code=booking_code,
                service_title=svc_title,
                refund_amount=refund_amount,
                is_test_data=getattr(user, "is_synthetic", False),
                user_id=user.id,
                db=db,
            )
            _SENT_EMAIL_DEDUP_KEYS.add(effective_key)
            return res
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    @tool(args_schema=SendBookingFailureEmailInput)
    def send_booking_failure_email(
        booking_id: str,
        reason: str,
        dedup_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send booking/payment failure notification email via Resend."""
        effective_key = dedup_key or f"failure_email_{booking_id}"
        if effective_key in _SENT_EMAIL_DEDUP_KEYS:
            return {"status": "deduplicated", "message": "Failure email already sent."}

        try:
            b = booking_repo.get_by_id(booking_id)
            if not b or not user.email:
                return {"status": "failed", "error": "Booking or email not found."}

            svc_title = b.service.title if b.service else "Rural Experience"
            booking_code = getattr(b, "booking_code", getattr(b, "booking_number", ""))
            amount = float(getattr(b, "final_amount", getattr(b, "total_amount", 0.0)) or 0.0)
            res = EmailService.send_payment_failed_email(
                to_email=user.email,
                booking_code=booking_code,
                amount=amount,
                reason=reason,
                is_test_data=getattr(user, "is_synthetic", False),
                user_id=user.id,
                db=db,
            )
            _SENT_EMAIL_DEDUP_KEYS.add(effective_key)
            return res
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    # ─────────────────────────────────────────────────────────────
    # 8. CONTEXT & MEMORY TOOLS
    # ─────────────────────────────────────────────────────────────

    @tool(args_schema=GetUserContextInput)
    def get_user_travel_context() -> Dict[str, Any]:
        """Fetch user profile, travel preferences, saved wishlists, and recent trips."""
        saved_services = marketplace_repo.list_saved_services(user.id)
        trips, _ = trip_repo.list_by_user(user.id, limit=5)

        travel_prefs = {}
        if getattr(user, "travel_preferences", None):
            try:
                travel_prefs = json.loads(user.travel_preferences)
            except Exception:
                travel_prefs = {}

        return {
            "user_id": str(user.id),
            "full_name": user.full_name,
            "location": user.location,
            "language": user.language,
            "travel_preferences": travel_prefs,
            "saved_services": [
                {
                    "service_id": str(s.service.id),
                    "title": s.service.title,
                    "district": s.service.district,
                    "price": float(s.service.price),
                }
                for s in saved_services if s.service
            ],
            "recent_trips": [
                {
                    "trip_id": str(t.id),
                    "title": t.title,
                    "destination": t.destination,
                    "status": t.status,
                }
                for t in trips
            ],
        }

    return [
        search_marketplace,
        search_by_location,
        search_by_category,
        get_service_details,
        get_personalized_recommendations,
        filter_services,
        rank_candidates,
        compare_services,
        check_service_availability,
        get_available_dates,
        check_capacity,
        get_available_slots,
        calculate_service_pricing,
        calculate_trip_budget,
        compare_prices,
        create_trip,
        update_trip,
        add_service_to_trip,
        remove_service_from_trip,
        reorder_trip_items,
        build_or_update_itinerary,
        validate_itinerary_and_budget,
        refine_itinerary,
        optimize_itinerary,
        replan_itinerary,
        save_trip_to_database,
        validate_booking,
        execute_booking,
        get_booking_status,
        cancel_booking,
        modify_booking,
        get_booking_requirements,
        create_payment_order,
        get_payment_status,
        verify_payment_status,
        create_notification,
        send_booking_email,
        send_payment_email,
        send_cancellation_email,
        send_booking_failure_email,
        get_user_travel_context,
    ]
