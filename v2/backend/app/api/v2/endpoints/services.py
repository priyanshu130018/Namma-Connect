"""Services endpoints for Marketplace Catalog, Details, Availability, and Partner Service Management."""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
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


@router.get("", response_model=APIResponse[ServiceListResponse])
def list_services(
    category: Optional[str] = Query(None, description="Category filter (e.g. stay, experiences, guides-tours)"),
    location: Optional[str] = Query(None, description="Location search term (e.g. Coorg, Wayanad)"),
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


@router.put("/partner/{service_id}", response_model=APIResponse[ServiceResponse])
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
    db: Session = Depends(get_db),
):
    """Get full details of a published service including reviews."""
    detail = MarketplaceService.get_service_detail(db, service_id)
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
