"""Services endpoints for Marketplace Catalog, Details, Availability, and Partner Service Management."""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user, get_current_user_optional
from app.dependencies.rbac import require_partner
from app.models.user import User
from app.schemas.common import APIResponse, MessageResponse
from app.schemas.service import (
    ServiceResponse,
    ServiceListResponse,
    ServiceDetailResponse,
    ReviewCreateRequest,
    ReviewResponse,
    ServiceAvailabilityResponse,
    ServiceCreatePayload,
    ServiceUpdatePayload,
)
from app.schemas.saved_service import SavedServiceStatusResponse
from app.services.marketplace import MarketplaceService
from app.services.saved_service import SavedServiceDomainService

router = APIRouter(prefix="/services", tags=["Services"])


@router.get("/categories", response_model=APIResponse[List[dict]])
def list_activity_categories(db: Session = Depends(get_db)):
    """List static product taxonomy categories for Activities."""
    categories = [
        {
            "id": "farm",
            "slug": "farm",
            "name": "Farm Tours & Experiences 🌾",
            "icon": "farm",
            "description": "Authentic agricultural tours, harvest experiences, and rural farmstays.",
            "listingCount": 0,
        },
        {
            "id": "adventure",
            "slug": "adventure",
            "name": "Adventure & Trekking 🥾",
            "icon": "hiking",
            "description": "Western Ghats mountain treks, outdoor camping, and trail expeditions.",
            "listingCount": 0,
        },
        {
            "id": "water-sports",
            "slug": "water-sports",
            "name": "Water Sports & Activities 🌊",
            "icon": "waves",
            "description": "White water rafting, kayaking, water falls, and river adventures.",
            "listingCount": 0,
        },
        {
            "id": "wildlife",
            "slug": "wildlife",
            "name": "Wildlife Tours 🐘",
            "icon": "trees",
            "description": "Jungle safaris, birdwatching expeditions, and sanctuary explorations.",
            "listingCount": 0,
        },
        {
            "id": "food",
            "slug": "food",
            "name": "Food Tours & Cooking 🍳",
            "icon": "utensils",
            "description": "Traditional Karavali & Malnad culinary workshops and food walks.",
            "listingCount": 0,
        },
        {
            "id": "cultural-historical",
            "slug": "cultural-historical",
            "name": "Cultural & Historical Tours 🏛️",
            "icon": "landmark",
            "description": "Heritage temple circuits, palace walks, and ancient monument tours.",
            "listingCount": 0,
        },
        {
            "id": "photography",
            "slug": "photography",
            "name": "Photography 📷",
            "icon": "camera",
            "description": "Professional landscape, portrait, and rural lifestyle photography sessions.",
            "listingCount": 0,
        },
        {
            "id": "videography",
            "slug": "videography",
            "name": "Videography 🎥",
            "icon": "video",
            "description": "Cinematic documentary, travel video, and cultural footage production.",
            "listingCount": 0,
        },
        {
            "id": "drone-aerial",
            "slug": "drone-aerial",
            "name": "Drone & Aerial 🚁",
            "icon": "wind",
            "description": "High-resolution DGCA-compliant aerial cinematography and estate mapping.",
            "listingCount": 0,
        },
        {
            "id": "travel-reels",
            "slug": "travel-reels",
            "name": "Travel Reels 📱",
            "icon": "film",
            "description": "Viral social media reels, short-form storytelling, and content packages.",
            "listingCount": 0,
        },
    ]
    return APIResponse(
        success=True,
        message="Activity categories retrieved successfully",
        data=categories,
    )



@router.get("", response_model=APIResponse[ServiceListResponse])
def list_services(
    category: Optional[str] = Query(None, description="Category filter (e.g. stay, experiences, guides-tours)"),
    location: Optional[str] = Query(None, description="Location search term (e.g. Coorg, Wayanad)"),
    q: Optional[str] = Query(None, description="Search query across title, description, location, and provider"),
    min_price: Optional[float] = Query(None, description="Minimum starting price in INR"),
    max_price: Optional[float] = Query(None, description="Maximum starting price in INR"),
    min_rating: Optional[float] = Query(None, description="Minimum rating filter (e.g. 4.5)"),
    sort_by: Optional[str] = Query("rating", description="Sorting field (rating, price_asc, price_desc, newest)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=50, description="Items per page"),
    db: Session = Depends(get_db),
):
    """List published marketplace services with filtering, sorting, and pagination."""
    catalog = MarketplaceService.list_services(
        db,
        category=category,
        location=location,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        sort_by=sort_by,
        page=page,
        limit=limit,
        q=q,
    )
    return APIResponse(
        success=True,
        message="Marketplace services retrieved successfully",
        data=catalog,
    )


# ── Partner Endpoints (Must precede generic dynamic path parameters) ──

@router.get("/partner/me", response_model=APIResponse[List[ServiceResponse]])
def list_partner_services(
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """List all services owned by the authenticated host/partner."""
    services = MarketplaceService.list_partner_services(db, current_user.id)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(services)} services for partner",
        data=services,
    )


@router.get("/partner/{service_id}", response_model=APIResponse[ServiceResponse])
def get_partner_service(
    service_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Get service details owned by the authenticated partner."""
    service = MarketplaceService.get_partner_service_by_id(db, current_user.id, service_id)
    return APIResponse(
        success=True,
        message="Partner service retrieved successfully",
        data=service,
    )


@router.patch("/partner/{service_id}", response_model=APIResponse[ServiceResponse])
def update_partner_service(
    service_id: str,
    payload: ServiceUpdatePayload,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Update service listing owned by the authenticated partner."""
    service = MarketplaceService.update_partner_service(db, current_user.id, service_id, payload)
    return APIResponse(
        success=True,
        message="Service updated successfully",
        data=service,
    )


@router.post("/partner/{service_id}/submit-review", response_model=APIResponse[ServiceResponse])
def submit_partner_service_for_review(
    service_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Submit a draft or rejected service for administrative review."""
    service = MarketplaceService.submit_partner_service_for_review(db, current_user.id, service_id)
    return APIResponse(
        success=True,
        message="Service submitted for administrative review successfully",
        data=service,
    )


@router.post("", response_model=APIResponse[ServiceResponse])
def create_service(
    payload: Optional[ServiceCreatePayload] = None,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Create a new service listing under the authenticated provider's account."""
    if payload is None:
        payload = ServiceCreatePayload(
            title="New Experience Draft",
            description="Service description draft.",
            category="Stay",
            location="Karnataka",
            price=1000.0,
        )
    service = MarketplaceService.create_partner_service(db, current_user, payload)
    return APIResponse(
        success=True,
        message="Service listing created successfully",
        data=service,
    )


# ── Public Detail & Availability Endpoints ──

@router.get("/{service_id}", response_model=APIResponse[ServiceDetailResponse])
def get_service_detail(
    service_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get full details of a published service including reviews."""
    detail = MarketplaceService.get_service_detail(db, service_id)

    if current_user and detail and detail.service:
        try:
            import uuid
            from app.services.recommendation_engine import RecommendationEngine
            srv_id = uuid.UUID(detail.service.id) if detail.service.id else None
            RecommendationEngine.record_interaction(
                db=db,
                user_id=current_user.id,
                event_type="view",
                service_id=srv_id,
                metadata={
                    "category_slug": detail.service.category_slug,
                    "district": detail.service.district,
                    "price": detail.service.price,
                },
            )
        except Exception:
            pass

    return APIResponse(
        success=True,
        message="Service details retrieved successfully",
        data=detail,
    )


@router.get("/{service_id}/reviews", response_model=APIResponse[List[ReviewResponse]])
def get_service_reviews(
    service_id: str,
    db: Session = Depends(get_db),
):
    """Get verified customer reviews for a service."""
    reviews = MarketplaceService.get_service_reviews(db, service_id)
    return APIResponse(
        success=True,
        message="Service reviews retrieved successfully",
        data=reviews,
    )


@router.post("/{service_id}/reviews", response_model=APIResponse[ReviewResponse], status_code=status.HTTP_201_CREATED)
def submit_service_review(
    service_id: str,
    req: ReviewCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a verified review for a completed booking reservation."""
    review = MarketplaceService.submit_service_review(db, current_user, service_id, req)
    return APIResponse(
        success=True,
        message="Review submitted successfully.",
        data=review,
    )


@router.get("/{service_id}/availability", response_model=APIResponse[ServiceAvailabilityResponse])
def get_service_availability(
    service_id: str,
    month: Optional[int] = Query(None, ge=1, le=12, description="Month number (1-12)"),
    year: Optional[int] = Query(None, ge=2024, le=2030, description="Year (e.g. 2026)"),
    db: Session = Depends(get_db),
):
    """Get authoritative availability calendar, days, and slot matrix for a service."""
    availability = MarketplaceService.get_service_availability(db, service_id, month=month, year=year)
    return APIResponse(
        success=True,
        message="Service availability retrieved successfully",
        data=availability,
    )


@router.post("/{service_id}/save", response_model=APIResponse[SavedServiceStatusResponse])
def save_service(
    service_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a service to the authenticated customer's private wishlist."""
    status_resp = SavedServiceDomainService.save_service(db, current_user, service_id)
    return APIResponse(
        success=True,
        message="Service saved to wishlist.",
        data=status_resp,
    )


@router.delete("/{service_id}/save", response_model=APIResponse[SavedServiceStatusResponse])
def remove_saved_service(
    service_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a service from the authenticated customer's private wishlist."""
    status_resp = SavedServiceDomainService.remove_saved_service(db, current_user, service_id)
    return APIResponse(
        success=True,
        message="Service removed from wishlist.",
        data=status_resp,
    )


@router.get("/{service_id}/save-status", response_model=APIResponse[SavedServiceStatusResponse])
def get_saved_status(
    service_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check whether a service is saved by the authenticated customer."""
    status_resp = SavedServiceDomainService.check_saved_status(db, current_user, service_id)
    return APIResponse(
        success=True,
        message="Saved status retrieved.",
        data=status_resp,
    )
