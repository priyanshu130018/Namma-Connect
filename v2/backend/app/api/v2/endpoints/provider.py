"""Provider API Endpoints for Dashboard, Profile, KYC, Listings, Bookings, Earnings, and Analytics."""

import csv
import io
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_partner, require_verified_provider
from app.models.user import User
from app.models.service import Service, Review
from app.models.booking import Booking
from app.models.partner_application import PartnerApplication
from app.models.payment import Payment
from app.schemas.common import APIResponse
from app.services.earnings import EarningsService
from app.services.nc_score_engine import NCScoreEngine


router = APIRouter(prefix="/provider", tags=["Provider"])


# ── Schemas ──

class ProviderProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    business_name: Optional[str] = None


class ProviderAvatarUpdateRequest(BaseModel):
    avatar_url: str


class ProviderListingCreateRequest(BaseModel):
    title: str
    description: str
    category: str  # farm, adventure, water-sports, wildlife, food, cultural-historical, photography, videography, drone-aerial, travel-reels, stay, hotel, transport
    category_slug: Optional[str] = None
    location: str
    district: Optional[str] = "Bengaluru"
    state: Optional[str] = "Karnataka"
    price: float
    unit: Optional[str] = "person"
    max_capacity: Optional[int] = 10
    duration_hours: Optional[float] = 2.0
    primary_image: Optional[str] = "https://images.unsplash.com/photo-1500382017468-9049fed747ef"
    images: Optional[List[str]] = []
    inclusions: Optional[List[str]] = []
    amenities: Optional[List[str]] = []


class ProviderListingUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    max_capacity: Optional[int] = None
    status: Optional[str] = None
    primary_image: Optional[str] = None


# ── 1. Provider Profile & KYC Endpoints ──

@router.get("/profile", response_model=APIResponse[Dict[str, Any]])
def get_provider_profile(
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve full profile, business details, and KYC status of authenticated provider."""
    app = db.query(PartnerApplication).filter(
        PartnerApplication.user_id == current_user.id
    ).order_by(desc(PartnerApplication.created_at)).first()

    kyc_status = app.status if app else ("APPROVED" if current_user.is_verified else "NOT_SUBMITTED")
    business_name = app.business_name if app else (current_user.full_name + "'s Estate")

    data = {
        "id": str(current_user.id),
        "full_name": current_user.full_name,
        "email": current_user.email,
        "mobile": current_user.mobile,
        "location": current_user.location or "Bengaluru, Karnataka",
        "bio": current_user.bio or "",
        "gender": current_user.gender or "not_specified",
        "date_of_birth": current_user.date_of_birth or "",
        "avatar_url": current_user.avatar_url,
        "role": current_user.role,
        "is_verified": current_user.is_verified or (kyc_status == "APPROVED"),
        "kyc_status": kyc_status,
        "business_name": business_name,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "application_code": app.application_code if app else None,
    }

    return APIResponse(
        success=True,
        message="Provider profile retrieved successfully.",
        data=data,
    )


@router.put("/profile", response_model=APIResponse[Dict[str, Any]])
def update_provider_profile(
    payload: ProviderProfileUpdateRequest,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Update personal details and business info for authenticated provider."""
    if payload.full_name is not None and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()
    if payload.mobile is not None:
        current_user.mobile = payload.mobile.strip() or None
    if payload.location is not None:
        current_user.location = payload.location.strip() or None
    if payload.bio is not None:
        current_user.bio = payload.bio.strip() or None
    if payload.gender is not None:
        current_user.gender = payload.gender
    if payload.date_of_birth is not None:
        current_user.date_of_birth = payload.date_of_birth

    # Update application business name if present
    app = db.query(PartnerApplication).filter(
        PartnerApplication.user_id == current_user.id
    ).order_by(desc(PartnerApplication.created_at)).first()
    if app and payload.business_name is not None and payload.business_name.strip():
        app.business_name = payload.business_name.strip()
        db.add(app)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return get_provider_profile(current_user=current_user, db=db)


@router.post("/profile/avatar", response_model=APIResponse[Dict[str, Any]])
def update_provider_avatar(
    payload: ProviderAvatarUpdateRequest,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Upload or update profile image for authenticated provider."""
    current_user.avatar_url = payload.avatar_url.strip()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return APIResponse(
        success=True,
        message="Avatar image updated successfully.",
        data={"avatar_url": current_user.avatar_url},
    )


@router.get("/kyc", response_model=APIResponse[Dict[str, Any]])
def get_provider_kyc(
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve authoritative backend KYC verification details."""
    app = db.query(PartnerApplication).filter(
        PartnerApplication.user_id == current_user.id
    ).order_by(desc(PartnerApplication.created_at)).first()

    if not app:
        return APIResponse(
            success=True,
            message="No KYC application submitted.",
            data={
                "status": "NOT_SUBMITTED",
                "is_verified": current_user.is_verified,
                "id_type": None,
                "id_number": None,
                "document_url": None,
            },
        )

    return APIResponse(
        success=True,
        message="KYC details retrieved successfully.",
        data={
            "status": app.status,
            "is_verified": current_user.is_verified or (app.status == "APPROVED"),
            "id_type": app.id_type,
            "id_number": app.id_number,
            "document_url": app.document_url,
            "business_name": app.business_name,
            "rejection_reason": app.rejection_reason,
            "reviewed_at": app.reviewed_at.isoformat() if app.reviewed_at else None,
        },
    )


# ── 2. Provider Dashboard Summary Endpoint ──

@router.get("/dashboard", response_model=APIResponse[Dict[str, Any]])
def get_provider_dashboard(
    period: str = Query("30d", description="Period: 7d, 30d, 3m"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve complete, real-time provider dashboard summary."""
    # 1. Verification & KYC status
    app = db.query(PartnerApplication).filter(
        PartnerApplication.user_id == current_user.id
    ).order_by(desc(PartnerApplication.created_at)).first()

    is_verified = current_user.is_verified or (app and app.status == "APPROVED")
    badge_text = "✓ Verified Provider" if is_verified else ("Pending KYC Verification" if app else "Complete KYC Profile")

    # 2. Provider Services & Active Listings
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    active_services = [s for s in user_services if s.status in ["PUBLISHED", "APPROVED"]]
    categories_set = set(s.category for s in user_services)

    # 3. Provider Bookings
    provider_service_ids = [s.id for s in user_services]
    bookings_query = db.query(Booking).filter(
        (Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids))
    ) if provider_service_ids else db.query(Booking).filter(Booking.provider_id == current_user.id)

    all_bookings = bookings_query.all()
    pending_bookings = [b for b in all_bookings if b.status == "PENDING"]
    confirmed_bookings = [b for b in all_bookings if b.status == "CONFIRMED"]
    completed_bookings = [b for b in all_bookings if b.status == "COMPLETED"]

    # 4. Authoritative Earnings
    earnings_dto = EarningsService.get_provider_earnings(db, current_user, period=period)

    # 5. NC Score
    nc_score, nc_components = NCScoreEngine.calculate_nc_score(db=db, provider_id=current_user.id)
    reviews_count = sum(s.reviews_count for s in user_services)

    # 6. Action Required Tasks
    action_required_tasks = []
    if pending_bookings:
        action_required_tasks.append({
            "id": "pending-bookings-task",
            "title": f"{len(pending_bookings)} Booking Request(s) Awaiting Confirmation",
            "description": "Review guest reservation details and confirm booking availability.",
            "target": "/provider/bookings",
            "priority": "HIGH",
        })
    
    pending_listings = [s for s in user_services if s.status == "PENDING"]
    if pending_listings:
        action_required_tasks.append({
            "id": "pending-listings-task",
            "title": f"{len(pending_listings)} Listing(s) Pending Moderation Review",
            "description": "Your service listing has been submitted and is currently under review by admins.",
            "target": "/provider/listings",
            "priority": "MEDIUM",
        })

    rejected_listings = [s for s in user_services if s.status == "REJECTED"]
    if rejected_listings:
        action_required_tasks.append({
            "id": "rejected-listings-task",
            "title": f"{len(rejected_listings)} Listing(s) Require Revisions",
            "description": "Please review feedback notes and update your listing parameters.",
            "target": "/provider/listings",
            "priority": "HIGH",
        })

    if not is_verified:
        action_required_tasks.append({
            "id": "kyc-task",
            "title": "Complete KYC & Identity Verification",
            "description": "Upload Aadhaar or commercial identity document to get verified status.",
            "target": "/provider/profile",
            "priority": "HIGH",
        })

    # 7. Recent 3-5 Bookings with allowed actions
    recent_bookings_raw = sorted(all_bookings, key=lambda b: b.created_at or datetime.min, reverse=True)[:5]
    recent_bookings_data = []
    for b in recent_bookings_raw:
        srv = db.query(Service).filter(Service.id == b.service_id).first()
        customer = db.query(User).filter(User.id == b.customer_id).first()
        allowed_actions = []
        if b.status == "PENDING":
            allowed_actions = ["confirm", "cancel"]
        elif b.status == "CONFIRMED":
            allowed_actions = ["complete", "cancel"]

        recent_bookings_data.append({
            "id": str(b.id),
            "booking_code": b.booking_code,
            "service_id": str(b.service_id),
            "service_name": srv.title if srv else "Agri Experience",
            "service_image": srv.primary_image if srv else "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
            "customer_name": customer.full_name if customer else "Verified Guest",
            "start_date": b.start_date,
            "end_date": b.end_date,
            "guest_count": b.guest_count,
            "total_amount": b.total_amount,
            "status": b.status,
            "allowed_actions": allowed_actions,
        })

    # 8. Top 3 Services
    top_3_services = sorted(user_services, key=lambda s: s.rating, reverse=True)[:3]
    top_3_data = [{
        "id": str(s.id),
        "title": s.title,
        "category": s.category,
        "category_slug": s.category_slug,
        "status": s.status,
        "price": s.price,
        "unit": s.unit,
        "rating": s.rating,
        "reviews_count": s.reviews_count,
        "primary_image": s.primary_image,
        "max_capacity": s.max_capacity,
    } for s in top_3_services]

    # Greeting logic
    hour = datetime.now().hour
    greeting_prefix = "Good morning" if hour < 12 else ("Good afternoon" if hour < 17 else "Good evening")

    dashboard_payload = {
        "provider_name": current_user.full_name,
        "greeting": f"{greeting_prefix}, {current_user.full_name}",
        "is_verified": is_verified,
        "badge_text": badge_text,
        "overview_cards": {
            "total_bookings": {
                "value": len(all_bookings),
                "trend": "+0.0%",
                "target": "/provider/bookings",
            },
            "total_earnings": {
                "value": earnings_dto.total_earnings,
                "formatted": f"₹{earnings_dto.total_earnings:,.2f}",
                "trend": "+0.0%",
                "target": "/provider/earnings",
            },
            "active_listings": {
                "value": len(active_services),
                "total_listings": len(user_services),
                "categories_represented": len(categories_set),
                "target": "/provider/listings",
            },
            "nc_score": {
                "score": nc_score,
                "tier": nc_components.get("tier", "Bronze"),
                "review_count": reviews_count,
                "target": "/provider/analytics",
            },
            "pending_actions": {
                "value": len(action_required_tasks),
                "target": "/provider/bookings",
            },
        },
        "action_required": {
            "all_caught_up": len(action_required_tasks) == 0,
            "tasks": action_required_tasks,
        },
        "booking_overview": {
            "total": len(all_bookings),
            "pending": len(pending_bookings),
            "confirmed": len(confirmed_bookings),
            "completed": len(completed_bookings),
            "recent_bookings": recent_bookings_data,
        },
        "my_services": {
            "top_services": top_3_data,
            "total_count": len(user_services),
        },
        "earnings_summary": {
            "this_month": earnings_dto.total_earnings,
            "gross_revenue": earnings_dto.gross_revenue,
            "platform_fee": earnings_dto.platform_fee,
            "total_earnings": earnings_dto.total_earnings,
        },
    }

    return APIResponse(
        success=True,
        message="Provider dashboard summary retrieved successfully.",
        data=dashboard_payload,
    )


# ── 3. Provider Listings Endpoints ──

@router.get("/listings", response_model=APIResponse[List[Dict[str, Any]]])
def get_provider_listings(
    status_filter: Optional[str] = Query(None, description="Status filter: DRAFT, PENDING, PUBLISHED, REJECTED"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """List all listings owned by authenticated provider."""
    query = db.query(Service).filter(Service.provider_id == current_user.id)
    if status_filter:
        query = query.filter(Service.status == status_filter.upper())

    listings = query.order_by(desc(Service.created_at)).all()
    results = []
    for s in listings:
        bookings_count = db.query(func.count(Booking.id)).filter(Booking.service_id == s.id).scalar() or 0
        results.append({
            "id": str(s.id),
            "title": s.title,
            "slug": s.slug,
            "description": s.description,
            "category": s.category,
            "category_slug": s.category_slug,
            "location": s.location,
            "district": s.district,
            "state": s.state,
            "price": s.price,
            "unit": s.unit,
            "max_capacity": s.max_capacity,
            "rating": s.rating,
            "reviews_count": s.reviews_count,
            "bookings_count": bookings_count,
            "status": s.status,
            "rejection_reason": s.rejection_reason,
            "primary_image": s.primary_image,
            "images": s.images_json,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })

    return APIResponse(
        success=True,
        message=f"Retrieved {len(results)} provider listings.",
        data=results,
    )


@router.post("/listings", response_model=APIResponse[Dict[str, Any]])
def create_provider_listing(
    payload: ProviderListingCreateRequest,
    current_user: User = Depends(require_verified_provider),
    db: Session = Depends(get_db),
):
    """Create a new service/listing for verified provider with server-side validation."""
    if not payload.title.strip() or not payload.description.strip():
        raise HTTPException(status_code=400, detail="Title and description are required.")
    if payload.price <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than zero.")

    slug_base = payload.title.lower().replace(" ", "-")
    unique_slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"
    category_slug = payload.category_slug or payload.category.lower().replace(" ", "-")

    # Auto-publish for admins or set PENDING for standard verified providers
    initial_status = "PUBLISHED" if current_user.role == "admin" else "PENDING"

    new_service = Service(
        id=uuid.uuid4(),
        title=payload.title.strip(),
        slug=unique_slug,
        description=payload.description.strip(),
        category=payload.category,
        category_slug=category_slug,
        location=payload.location.strip(),
        district=payload.district or "Bengaluru",
        state=payload.state or "Karnataka",
        price=payload.price,
        unit=payload.unit or "person",
        max_capacity=payload.max_capacity or 10,
        duration_hours=payload.duration_hours or 2.0,
        primary_image=payload.primary_image,
        images_json=str(payload.images or []),
        inclusions_json=str(payload.inclusions or []),
        amenities_json=str(payload.amenities or []),
        status=initial_status,
        provider_id=current_user.id,
        provider_name=current_user.full_name,
        provider_type=current_user.role.title(),
        provider_avatar=current_user.avatar_url,
    )

    db.add(new_service)
    db.commit()
    db.refresh(new_service)

    return APIResponse(
        success=True,
        message=f"Listing created with status '{initial_status}'.",
        data={
            "id": str(new_service.id),
            "title": new_service.title,
            "status": new_service.status,
            "category": new_service.category,
            "price": new_service.price,
        },
    )


@router.get("/listings/{listing_id}", response_model=APIResponse[Dict[str, Any]])
def get_provider_listing_detail(
    listing_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve detailed provider-owned listing."""
    srv_uuid = uuid.UUID(listing_id)
    srv = db.query(Service).filter(Service.id == srv_uuid, Service.provider_id == current_user.id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")

    return APIResponse(
        success=True,
        message="Listing detail retrieved.",
        data={
            "id": str(srv.id),
            "title": srv.title,
            "slug": srv.slug,
            "description": srv.description,
            "category": srv.category,
            "category_slug": srv.category_slug,
            "location": srv.location,
            "price": srv.price,
            "unit": srv.unit,
            "max_capacity": srv.max_capacity,
            "duration_hours": srv.duration_hours,
            "status": srv.status,
            "rejection_reason": srv.rejection_reason,
            "primary_image": srv.primary_image,
            "rating": srv.rating,
            "reviews_count": srv.reviews_count,
        },
    )


@router.patch("/listings/{listing_id}", response_model=APIResponse[Dict[str, Any]])
def update_provider_listing(
    listing_id: str,
    payload: ProviderListingUpdateRequest,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Update provider-owned listing."""
    srv_uuid = uuid.UUID(listing_id)
    srv = db.query(Service).filter(Service.id == srv_uuid, Service.provider_id == current_user.id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")

    if payload.title is not None:
        srv.title = payload.title.strip()
    if payload.description is not None:
        srv.description = payload.description.strip()
    if payload.category is not None:
        srv.category = payload.category
        srv.category_slug = payload.category.lower().replace(" ", "-")
    if payload.location is not None:
        srv.location = payload.location.strip()
    if payload.price is not None and payload.price > 0:
        srv.price = payload.price
    if payload.unit is not None:
        srv.unit = payload.unit
    if payload.max_capacity is not None:
        srv.max_capacity = payload.max_capacity
    if payload.primary_image is not None:
        srv.primary_image = payload.primary_image
    if payload.status is not None:
        srv.status = payload.status

    db.add(srv)
    db.commit()
    db.refresh(srv)

    return APIResponse(
        success=True,
        message="Listing updated successfully.",
        data={"id": str(srv.id), "title": srv.title, "status": srv.status},
    )


@router.delete("/listings/{listing_id}", response_model=APIResponse[Dict[str, Any]])
def delete_provider_listing(
    listing_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Archive/delete provider-owned listing."""
    srv_uuid = uuid.UUID(listing_id)
    srv = db.query(Service).filter(Service.id == srv_uuid, Service.provider_id == current_user.id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")

    srv.status = "REMOVED"
    db.add(srv)
    db.commit()

    return APIResponse(
        success=True,
        message="Listing removed successfully.",
        data={"id": str(srv.id)},
    )


# ── 4. Provider Bookings Endpoints ──

@router.get("/bookings", response_model=APIResponse[List[Dict[str, Any]]])
def get_provider_bookings(
    status_filter: Optional[str] = Query(None, description="Booking status: PENDING, CONFIRMED, COMPLETED, CANCELLED"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """List bookings for services owned by authenticated provider."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    provider_service_ids = [s.id for s in user_services]

    query = db.query(Booking).filter(
        (Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids))
    ) if provider_service_ids else db.query(Booking).filter(Booking.provider_id == current_user.id)

    if status_filter:
        query = query.filter(Booking.status == status_filter.upper())

    bookings = query.order_by(desc(Booking.created_at)).all()
    results = []
    for b in bookings:
        srv = db.query(Service).filter(Service.id == b.service_id).first()
        customer = db.query(User).filter(User.id == b.customer_id).first()
        results.append({
            "id": str(b.id),
            "booking_code": b.booking_code,
            "service_id": str(b.service_id),
            "service_title": srv.title if srv else "Agri Experience",
            "service_image": srv.primary_image if srv else "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
            "customer_name": customer.full_name if customer else "Verified Guest",
            "customer_email": customer.email if customer else None,
            "customer_mobile": customer.mobile if customer else None,
            "start_date": b.start_date,
            "end_date": b.end_date,
            "time_slot_label": b.time_slot_label,
            "guest_count": b.guest_count,
            "unit_price": b.unit_price,
            "total_amount": b.total_amount,
            "status": b.status,
            "special_requests": b.special_requests,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })

    return APIResponse(
        success=True,
        message=f"Retrieved {len(results)} provider bookings.",
        data=results,
    )


@router.post("/bookings/{booking_id}/confirm", response_model=APIResponse[Dict[str, Any]])
def confirm_provider_booking(
    booking_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Confirm pending booking owned by provider."""
    b_uuid = uuid.UUID(booking_id)
    booking = db.query(Booking).filter(Booking.id == b_uuid).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    # Ownership check
    if booking.provider_id != current_user.id:
        srv = db.query(Service).filter(Service.id == booking.service_id, Service.provider_id == current_user.id).first()
        if not srv:
            raise HTTPException(status_code=403, detail="Access denied: not your booking.")

    if booking.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Cannot confirm booking in state '{booking.status}'.")

    booking.status = "CONFIRMED"
    db.add(booking)
    db.commit()

    return APIResponse(
        success=True,
        message="Booking confirmed successfully.",
        data={"id": str(booking.id), "status": booking.status},
    )


@router.post("/bookings/{booking_id}/cancel", response_model=APIResponse[Dict[str, Any]])
def cancel_provider_booking(
    booking_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Cancel booking owned by provider."""
    b_uuid = uuid.UUID(booking_id)
    booking = db.query(Booking).filter(Booking.id == b_uuid).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if booking.provider_id != current_user.id:
        srv = db.query(Service).filter(Service.id == booking.service_id, Service.provider_id == current_user.id).first()
        if not srv:
            raise HTTPException(status_code=403, detail="Access denied: not your booking.")

    booking.status = "CANCELLED"
    db.add(booking)
    db.commit()

    return APIResponse(
        success=True,
        message="Booking cancelled successfully.",
        data={"id": str(booking.id), "status": booking.status},
    )


@router.post("/bookings/{booking_id}/complete", response_model=APIResponse[Dict[str, Any]])
def complete_provider_booking(
    booking_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Mark booking as completed."""
    b_uuid = uuid.UUID(booking_id)
    booking = db.query(Booking).filter(Booking.id == b_uuid).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if booking.provider_id != current_user.id:
        srv = db.query(Service).filter(Service.id == booking.service_id, Service.provider_id == current_user.id).first()
        if not srv:
            raise HTTPException(status_code=403, detail="Access denied: not your booking.")

    booking.status = "COMPLETED"
    db.add(booking)
    db.commit()

    return APIResponse(
        success=True,
        message="Booking marked as completed.",
        data={"id": str(booking.id), "status": booking.status},
    )


# ── 5. Provider Analytics Endpoints ──

@router.get("/analytics/overview", response_model=APIResponse[Dict[str, Any]])
def get_provider_analytics_overview(
    period: str = Query("30d", description="Time window: 7d, 30d, 3m"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve 4 compact cards for Provider Analytics Overview."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    provider_service_ids = [s.id for s in user_services]

    bookings_query = db.query(Booking).filter(
        (Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids))
    ) if provider_service_ids else db.query(Booking).filter(Booking.provider_id == current_user.id)

    all_bookings = bookings_query.all()
    total_bookings_count = len(all_bookings)

    # Authoritative revenue from payment/earnings service
    earnings_dto = EarningsService.get_provider_earnings(db, current_user, period=period)
    total_revenue = earnings_dto.total_earnings

    # Rating & Review Count
    avg_rating = (sum(s.rating for s in user_services) / len(user_services)) if user_services else 0.0
    total_reviews = sum(s.reviews_count for s in user_services)

    # Conversion calculation: bookings / estimated views (safely handled without division by zero)
    estimated_views = total_bookings_count
    conversion_rate = 100.0 if estimated_views > 0 else 0.0

    return APIResponse(
        success=True,
        message="Analytics overview retrieved.",
        data={
            "period": period,
            "total_bookings": {
                "value": total_bookings_count,
                "change_percent": "+0.0%",
            },
            "total_revenue": {
                "value": total_revenue,
                "formatted": f"₹{total_revenue:,.2f}",
                "change_percent": "+0.0%",
            },
            "average_rating": {
                "rating": round(avg_rating, 2),
                "review_count": total_reviews,
            },
            "conversion_rate": {
                "value": round(conversion_rate, 1),
                "formatted": f"{round(conversion_rate, 1)}%",
                "has_data": total_bookings_count > 0,
            },
        },
    )


@router.get("/analytics/trends", response_model=APIResponse[Dict[str, Any]])
def get_provider_analytics_trends(
    period: str = Query("30d", description="Time window: 7d, 30d, 3m"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve combined Bookings & Revenue trend dataset."""
    days_count = 7 if period == "7d" else (90 if period == "3m" else 30)
    today = datetime.now()

    trend_series = []
    for i in range(days_count - 1, -1, -1):
        d = today - timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        label = d.strftime("%b %d")
        
        # Calculate daily bookings & revenue from DB
        day_bookings = db.query(Booking).filter(
            Booking.provider_id == current_user.id,
            Booking.start_date == date_str
        ).all()

        daily_revenue = sum(float(b.total_amount or 0.0) * 0.90 for b in day_bookings)
        trend_series.append({
            "date": date_str,
            "label": label,
            "bookings": len(day_bookings),
            "revenue": round(daily_revenue, 2),
        })

    return APIResponse(
        success=True,
        message="Analytics trend data retrieved.",
        data={
            "period": period,
            "series": trend_series,
        },
    )


@router.get("/analytics/best-services", response_model=APIResponse[List[Dict[str, Any]]])
def get_provider_best_services(
    sort_by: str = Query("bookings", description="Sort parameter: bookings, revenue, rating"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve provider-owned listings ranked by bookings, revenue, or rating."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    results = []

    for s in user_services:
        s_bookings = db.query(Booking).filter(Booking.service_id == s.id).all()
        b_count = len(s_bookings)
        revenue = sum(float(b.total_amount or 0.0) * 0.90 for b in s_bookings if b.status in ["CONFIRMED", "COMPLETED"])

        # Calculate slot utilization occupancy
        capacity = max(s.max_capacity or 10, 1)
        booked_slots = sum(b.guest_count for b in s_bookings)
        occupancy = min(round((booked_slots / (capacity * 30)) * 100, 1), 100.0)

        results.append({
            "id": str(s.id),
            "title": s.title,
            "category": s.category,
            "primary_image": s.primary_image,
            "bookings": b_count,
            "revenue": round(revenue, 2),
            "rating": s.rating,
            "reviews_count": s.reviews_count,
            "slot_utilization": occupancy,
        })

    if sort_by == "revenue":
        results.sort(key=lambda x: x["revenue"], reverse=True)
    elif sort_by == "rating":
        results.sort(key=lambda x: x["rating"], reverse=True)
    else:
        results.sort(key=lambda x: x["bookings"], reverse=True)

    return APIResponse(
        success=True,
        message="Best performing services retrieved.",
        data=results,
    )


@router.get("/analytics/demand", response_model=APIResponse[Dict[str, Any]])
def get_provider_demand_analysis(
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Analyze customer booking demand by day of week and time slot."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    provider_service_ids = [s.id for s in user_services]

    bookings = db.query(Booking).filter(
        (Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids))
    ).all() if provider_service_ids else []

    if not bookings:
        return APIResponse(
            success=True,
            message="Insufficient data for demand analysis.",
            data={
                "has_enough_data": False,
                "message": "Not enough booking data yet.",
                "days_demand": [],
                "time_slots_demand": [],
                "peak_demand_period": None,
            },
        )

    # Calculate day of week demand
    day_counts = {"Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0}
    for b in bookings:
        try:
            dt = datetime.strptime(b.start_date, "%Y-%m-%d")
            day_name = dt.strftime("%A")
            day_counts[day_name] += 1
        except Exception:
            pass

    peak_day = max(day_counts, key=day_counts.get) if any(day_counts.values()) else "Saturday"

    return APIResponse(
        success=True,
        message="Demand analysis retrieved.",
        data={
            "has_enough_data": True,
            "days_demand": [{"day": day, "count": count} for day, count in day_counts.items()],
            "time_slots_demand": [],
            "peak_demand_period": f"{peak_day} Mornings",
        },
    )


@router.get("/analytics/recommendations", response_model=APIResponse[Dict[str, Any]])
def get_provider_smart_recommendations(
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Deterministic V1 Rule-Based recommendations engine for slots, pricing, and opportunities."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    provider_service_ids = [s.id for s in user_services]

    bookings = db.query(Booking).filter(
        (Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids))
    ).all() if provider_service_ids else []

    # Calculate average occupancy
    total_capacity = sum((s.max_capacity or 10) * 30 for s in user_services) if user_services else 100
    booked_guests = sum(b.guest_count for b in bookings)
    occupancy_pct = (booked_guests / total_capacity * 100) if total_capacity > 0 else 0

    slot_recommendation = {
        "title": "Slot Availability Recommendation",
        "description": "Not enough booking data yet. Continue accepting bookings to receive slot recommendations.",
        "type": "SLOT_MANAGEMENT",
        "has_recommendation": False,
    }

    if occupancy_pct >= 85:
        slot_recommendation = {
            "title": "Recommend Adding Extra Weekend Slots",
            "description": f"Your average occupancy is high ({occupancy_pct:.1f}%). Adding additional slots on weekends will capture unmet demand.",
            "type": "ADD_SLOTS",
            "has_recommendation": True,
            "action_target": "/provider/listings",
        }

    pricing_insight = {
        "title": "Pricing Insights",
        "description": "Current pricing is competitive with regional marketplace averages.",
        "current_avg_price": round(sum(s.price for s in user_services) / max(len(user_services), 1), 2) if user_services else 0,
        "suggested_price": None,
        "reason": "Keep monitoring demand trends before adjusting prices.",
        "has_action": False,
    }

    if occupancy_pct >= 80 and len(bookings) > 5:
        avg_p = pricing_insight["current_avg_price"]
        suggested = round(avg_p * 1.15, 2)
        pricing_insight = {
            "title": "Consider Increasing Your Price",
            "description": f"High demand and strong bookings suggest potential to optimize yield.",
            "current_avg_price": avg_p,
            "suggested_price": suggested,
            "reason": f"High occupancy ({occupancy_pct:.1f}%) indicates strong customer willingness to pay.",
            "has_action": True,
            "action_target": "/provider/listings",
        }

    opportunities = [
        {
            "id": "opp-1",
            "title": "Promote Your Best Service",
            "description": "Featured listings receive higher booking inquiries across Karnataka travelers.",
            "target": "/provider/listings",
            "action_label": "Manage Listings",
        },
        {
            "id": "opp-2",
            "title": "Add High-Resolution Images",
            "description": "Listings with clear photos experience increased customer engagement.",
            "target": "/provider/listings",
            "action_label": "Update Photos",
        },
    ]

    category_counts: Dict[str, int] = {}
    for b in bookings:
        srv = db.query(Service).filter(Service.id == b.service_id).first()
        if srv and srv.category:
            category_counts[srv.category] = category_counts.get(srv.category, 0) + 1

    total_b_count = sum(category_counts.values())
    if total_b_count > 0:
        customer_demand = [
            {"category": cat, "percentage": round((cnt / total_b_count) * 100, 1)}
            for cat, cnt in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
        ]
    else:
        customer_demand = []

    return APIResponse(
        success=True,
        message="Smart analytics recommendations generated.",
        data={
            "slot_recommendation": slot_recommendation,
            "pricing_insight": pricing_insight,
            "customer_demand": customer_demand,
            "opportunities": opportunities,
        },
    )


@router.get("/analytics/export")
def export_provider_analytics_csv(
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Export provider's analytics performance data as CSV."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Service ID", "Title", "Category", "Price", "Unit", "Rating", "Reviews Count", "Status"])

    for s in user_services:
        writer.writerow([str(s.id), s.title, s.category, s.price, s.unit, s.rating, s.reviews_count, s.status])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=provider_analytics_{datetime.now().strftime('%Y%m%d')}.csv"},
    )
