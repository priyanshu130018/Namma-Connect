"""Provider API Endpoints for Dashboard, Profile, KYC, Listings, Bookings, Earnings, and Analytics."""

import csv
import io
import json
import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_partner, require_verified_provider
from app.models import (
    User,
    Service,
    Review,
    Booking,
    PartnerApplication,
    Payment,
    MarketplaceCategory,
    ServiceAvailability,
    UserInteraction,
    ProviderActionRecommendation,
)
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
    description: Optional[str] = ""
    category: str
    category_slug: Optional[str] = None
    location: Optional[str] = "Karnataka"
    district: Optional[str] = "Bengaluru"
    state: Optional[str] = "Karnataka"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    formatted_address: Optional[str] = None
    price: Optional[float] = 0.0
    unit: Optional[str] = "person"
    max_capacity: Optional[int] = 10
    duration_hours: Optional[float] = 2.0
    primary_image: Optional[str] = "https://images.unsplash.com/photo-1500382017468-9049fed747ef"
    images: Optional[List[str]] = []
    inclusions: Optional[List[str]] = []
    amenities: Optional[List[str]] = []
    specific_details: Optional[Dict[str, Any]] = None
    status: Optional[str] = None  # DRAFT, PENDING, PUBLISHED


class ProviderListingUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    category_slug: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    formatted_address: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    max_capacity: Optional[int] = None
    duration_hours: Optional[float] = None
    primary_image: Optional[str] = None
    images: Optional[List[str]] = None
    inclusions: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    specific_details: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class AvailabilitySlotItem(BaseModel):
    date: str
    start_time: Optional[str] = "09:00"
    end_time: Optional[str] = "12:00"
    slot_label: Optional[str] = None
    capacity: Optional[int] = None
    price_override: Optional[float] = None
    is_blocked: Optional[bool] = False
    notes: Optional[str] = None


class ProviderAvailabilityCreateRequest(BaseModel):
    date: Optional[str] = None
    dates: Optional[List[str]] = None
    slots: Optional[List[AvailabilitySlotItem]] = None
    start_time: Optional[str] = "09:00"
    end_time: Optional[str] = "12:00"
    slot_label: Optional[str] = None
    capacity: Optional[int] = None
    price_override: Optional[float] = None
    is_blocked: Optional[bool] = False
    notes: Optional[str] = None


class ProviderAvailabilityBlockRequest(BaseModel):
    slot_id: Optional[str] = None
    date: Optional[str] = None
    is_blocked: bool = True


# ── Official Marketplace Taxonomy & Category Helpers ──

OFFICIAL_CATEGORIES = {
    "farm": "Farm Tours & Experiences",
    "adventure": "Adventure & Trekking",
    "water-sports": "Water Sports & Activities",
    "wildlife": "Wildlife Tours",
    "food": "Food Tours & Cooking",
    "cultural-historical": "Cultural & Historical Tours",
    "photography": "Photography",
    "videography": "Videography",
    "drone-aerial": "Drone & Aerial",
    "travel-reels": "Travel Reels",
}


def resolve_marketplace_category(
    db: Session,
    cat_input: str,
    slug_input: Optional[str] = None,
) -> Tuple[str, str, Optional[uuid.UUID]]:
    """Resolve category name, slug, and category_id against the official 10 marketplace taxonomy."""
    cat_norm = (cat_input or "").strip()
    slug_norm = (slug_input or "").strip().lower()

    # Match by slug first
    if slug_norm in OFFICIAL_CATEGORIES:
        matched_slug = slug_norm
        matched_name = OFFICIAL_CATEGORIES[matched_slug]
    else:
        matched_slug = None
        matched_name = None
        for s, n in OFFICIAL_CATEGORIES.items():
            if cat_norm.lower() == n.lower() or cat_norm.lower() == s:
                matched_slug = s
                matched_name = n
                break
        if not matched_slug:
            matched_slug = slug_norm or cat_norm.lower().replace(" ", "-").replace("&", "").strip("-")
            matched_name = cat_norm or matched_slug.title()

    # Match against DB category
    db_cat = db.query(MarketplaceCategory).filter(
        (MarketplaceCategory.slug == matched_slug) | (MarketplaceCategory.name == matched_name)
    ).first()

    cat_id = db_cat.id if db_cat else None
    if db_cat:
        matched_name = db_cat.name
        matched_slug = db_cat.slug

    return matched_name, matched_slug, cat_id


def parse_amenities_and_details(amenities_raw: Optional[str]) -> Tuple[List[str], Dict[str, Any]]:
    """Unpack amenities and category-specific metadata from amenities_json column."""
    if not amenities_raw:
        return [], {}
    try:
        data = json.loads(amenities_raw)
        if isinstance(data, dict):
            return data.get("amenities", []), data.get("specific_details", {})
        elif isinstance(data, list):
            return data, {}
    except Exception:
        pass
    return [], {}


def parse_json_list(raw_val: Optional[str]) -> List[str]:
    """Parse JSON string list or return empty list safely."""
    if not raw_val:
        return []
    try:
        data = json.loads(raw_val)
        if isinstance(data, list):
            return data
    except Exception:
        pass
    return []


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


# ── 3. Provider Listings & Availability Endpoints ──

@router.get("/listings", response_model=APIResponse[List[Dict[str, Any]]])
def get_provider_listings(
    status_filter: Optional[str] = Query(None, description="Status filter: DRAFT, PENDING, PUBLISHED, REJECTED"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """List all listings owned by authenticated provider."""
    query = db.query(Service).filter(Service.provider_id == current_user.id)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(Service.status == status_filter.upper())

    listings = query.order_by(desc(Service.created_at)).all()
    results = []
    for s in listings:
        bookings_count = db.query(func.count(Booking.id)).filter(Booking.service_id == s.id).scalar() or 0
        amenities_list, specific_details = parse_amenities_and_details(s.amenities_json)
        images_list = parse_json_list(s.images_json)
        inclusions_list = parse_json_list(s.inclusions_json)

        results.append({
            "id": str(s.id),
            "title": s.title,
            "slug": s.slug,
            "description": s.description,
            "category": s.category,
            "category_slug": s.category_slug,
            "category_id": str(s.category_id) if s.category_id else None,
            "location": s.location,
            "district": s.district,
            "state": s.state,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "formatted_address": s.formatted_address,
            "price": float(s.price),
            "unit": s.unit,
            "max_capacity": s.max_capacity,
            "duration_hours": s.duration_hours,
            "rating": s.rating,
            "reviews_count": s.reviews_count,
            "bookings_count": bookings_count,
            "status": s.status,
            "rejection_reason": s.rejection_reason,
            "primary_image": s.primary_image,
            "images": images_list,
            "inclusions": inclusions_list,
            "amenities": amenities_list,
            "specific_details": specific_details,
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
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Create a new service/listing for authenticated provider with draft support and category validation."""
    if not payload.title or not payload.title.strip():
        raise HTTPException(status_code=400, detail="Title is required.")

    app_record = db.query(PartnerApplication).filter(PartnerApplication.user_id == current_user.id).order_by(desc(PartnerApplication.created_at)).first()
    is_verified = bool(current_user.is_verified or (app_record and app_record.status == "APPROVED") or current_user.role == "admin")

    if payload.status:
        target_status = payload.status.upper()
    else:
        # Default behavior: full listing attempts to publish
        target_status = "PUBLISHED"

    if target_status not in ["DRAFT", "PENDING", "PUBLISHED"]:
        target_status = "DRAFT"

    # Strict validation and KYC verification when publishing or submitting
    if target_status in ["PENDING", "PUBLISHED"]:
        if not is_verified:
            raise HTTPException(status_code=403, detail="Provider verification required to list services.")
        if len(payload.title.strip()) < 3:
            raise HTTPException(status_code=400, detail="Title must be at least 3 characters.")
        if not payload.description or len(payload.description.strip()) < 10:
            raise HTTPException(status_code=400, detail="Description must be at least 10 characters.")
        if not payload.location or not payload.location.strip():
            raise HTTPException(status_code=400, detail="Location is required.")
        if (payload.price or 0) <= 0:
            raise HTTPException(status_code=400, detail="Price must be greater than zero.")
        if (payload.max_capacity or 0) < 1:
            raise HTTPException(status_code=400, detail="Max capacity must be at least 1.")

    cat_name, cat_slug, cat_id = resolve_marketplace_category(db, payload.category, payload.category_slug)

    slug_base = re.sub(r"[^a-z0-9]+", "-", payload.title.lower()).strip("-")
    unique_slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    # Pack specific details & amenities
    details_dict = {
        "amenities": payload.amenities or [],
        "specific_details": payload.specific_details or {},
    }

    new_service = Service(
        id=uuid.uuid4(),
        title=payload.title.strip(),
        slug=unique_slug,
        description=(payload.description or "").strip(),
        category=cat_name,
        category_slug=cat_slug,
        category_id=cat_id,
        marketplace_type="Activity",
        location=(payload.location or "Karnataka").strip(),
        district=payload.district or "Bengaluru",
        state=payload.state or "Karnataka",
        latitude=payload.latitude,
        longitude=payload.longitude,
        formatted_address=payload.formatted_address,
        price=payload.price or 0.0,
        unit=payload.unit or "person",
        max_capacity=payload.max_capacity or 10,
        duration_hours=payload.duration_hours or 2.0,
        primary_image=payload.primary_image or "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
        images_json=json.dumps(payload.images or []),
        inclusions_json=json.dumps(payload.inclusions or []),
        amenities_json=json.dumps(details_dict),
        status=target_status,
        provider_id=current_user.id,
        provider_name=current_user.full_name,
        provider_type=current_user.role.title() if current_user.role else "Partner",
        provider_avatar=current_user.avatar_url,
        is_synthetic=bool(current_user.is_synthetic),
    )

    db.add(new_service)
    db.commit()
    db.refresh(new_service)

    return APIResponse(
        success=True,
        message=f"Listing created with status '{target_status}'.",
        data={
            "id": str(new_service.id),
            "title": new_service.title,
            "status": new_service.status,
            "category": new_service.category,
            "category_slug": new_service.category_slug,
            "price": float(new_service.price),
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

    amenities_list, specific_details = parse_amenities_and_details(srv.amenities_json)
    images_list = parse_json_list(srv.images_json)
    inclusions_list = parse_json_list(srv.inclusions_json)
    bookings_count = db.query(func.count(Booking.id)).filter(Booking.service_id == srv.id).scalar() or 0

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
            "category_id": str(srv.category_id) if srv.category_id else None,
            "location": srv.location,
            "district": srv.district,
            "state": srv.state,
            "latitude": srv.latitude,
            "longitude": srv.longitude,
            "formatted_address": srv.formatted_address,
            "price": float(srv.price),
            "unit": srv.unit,
            "max_capacity": srv.max_capacity,
            "duration_hours": srv.duration_hours,
            "status": srv.status,
            "rejection_reason": srv.rejection_reason,
            "primary_image": srv.primary_image,
            "images": images_list,
            "inclusions": inclusions_list,
            "amenities": amenities_list,
            "specific_details": specific_details,
            "rating": srv.rating,
            "reviews_count": srv.reviews_count,
            "bookings_count": bookings_count,
            "created_at": srv.created_at.isoformat() if srv.created_at else None,
        },
    )


@router.patch("/listings/{listing_id}", response_model=APIResponse[Dict[str, Any]])
def update_provider_listing(
    listing_id: str,
    payload: ProviderListingUpdateRequest,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Update provider-owned listing with draft & published validation."""
    srv_uuid = uuid.UUID(listing_id)
    srv = db.query(Service).filter(Service.id == srv_uuid, Service.provider_id == current_user.id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")

    if payload.title is not None:
        if len(payload.title.strip()) < 2:
            raise HTTPException(status_code=400, detail="Title must be at least 2 characters.")
        srv.title = payload.title.strip()
    if payload.description is not None:
        srv.description = payload.description.strip()
    if payload.category is not None:
        cat_name, cat_slug, cat_id = resolve_marketplace_category(db, payload.category, payload.category_slug)
        srv.category = cat_name
        srv.category_slug = cat_slug
        srv.category_id = cat_id
    if payload.location is not None:
        srv.location = payload.location.strip()
    if payload.district is not None:
        srv.district = payload.district.strip()
    if payload.state is not None:
        srv.state = payload.state.strip()
    if payload.latitude is not None:
        srv.latitude = payload.latitude
    if payload.longitude is not None:
        srv.longitude = payload.longitude
    if payload.formatted_address is not None:
        srv.formatted_address = payload.formatted_address
    if payload.price is not None:
        srv.price = payload.price
    if payload.unit is not None:
        srv.unit = payload.unit
    if payload.max_capacity is not None:
        srv.max_capacity = payload.max_capacity
    if payload.duration_hours is not None:
        srv.duration_hours = payload.duration_hours
    if payload.primary_image is not None:
        srv.primary_image = payload.primary_image
    if payload.images is not None:
        srv.images_json = json.dumps(payload.images)
    if payload.inclusions is not None:
        srv.inclusions_json = json.dumps(payload.inclusions)

    # Specific details and amenities update
    if payload.amenities is not None or payload.specific_details is not None:
        curr_amenities, curr_details = parse_amenities_and_details(srv.amenities_json)
        new_amenities = payload.amenities if payload.amenities is not None else curr_amenities
        new_details = payload.specific_details if payload.specific_details is not None else curr_details
        srv.amenities_json = json.dumps({
            "amenities": new_amenities,
            "specific_details": new_details,
        })

    if payload.status is not None:
        target_status = payload.status.upper()
        if target_status == "PUBLISHED":
            app = db.query(PartnerApplication).filter(PartnerApplication.user_id == current_user.id).order_by(desc(PartnerApplication.created_at)).first()
            is_verified = current_user.is_verified or (app and app.status == "APPROVED") or current_user.role == "admin"
            if not is_verified:
                target_status = "PENDING"
        srv.status = target_status

    db.add(srv)
    db.commit()
    db.refresh(srv)

    return APIResponse(
        success=True,
        message="Listing updated successfully.",
        data={"id": str(srv.id), "title": srv.title, "status": srv.status},
    )


@router.post("/listings/{listing_id}/publish", response_model=APIResponse[Dict[str, Any]])
def publish_provider_listing(
    listing_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Validate and transition listing from DRAFT to PUBLISHED (or PENDING if awaiting KYC)."""
    srv_uuid = uuid.UUID(listing_id)
    srv = db.query(Service).filter(Service.id == srv_uuid, Service.provider_id == current_user.id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")

    # Validation
    if not srv.title or len(srv.title.strip()) < 3:
        raise HTTPException(status_code=400, detail="Listing title must be at least 3 characters.")
    if not srv.description or len(srv.description.strip()) < 10:
        raise HTTPException(status_code=400, detail="Listing description must be at least 10 characters.")
    if not srv.location or not srv.location.strip():
        raise HTTPException(status_code=400, detail="Listing location is required.")
    if float(srv.price or 0) <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than zero.")

    app = db.query(PartnerApplication).filter(PartnerApplication.user_id == current_user.id).order_by(desc(PartnerApplication.created_at)).first()
    is_verified = current_user.is_verified or (app and app.status == "APPROVED") or current_user.role == "admin"

    if is_verified:
        srv.status = "PUBLISHED"
        msg = "Listing successfully published to Namma Connect marketplace."
    else:
        srv.status = "PENDING"
        msg = "Listing submitted for administrative compliance review. Complete KYC for instant publishing."

    db.add(srv)
    db.commit()
    db.refresh(srv)

    return APIResponse(
        success=True,
        message=msg,
        data={"id": str(srv.id), "status": srv.status, "is_verified": is_verified},
    )


@router.post("/listings/{listing_id}/duplicate", response_model=APIResponse[Dict[str, Any]])
def duplicate_provider_listing(
    listing_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Clone an existing service into a new DRAFT listing for easy multi-service creation."""
    srv_uuid = uuid.UUID(listing_id)
    srv = db.query(Service).filter(Service.id == srv_uuid, Service.provider_id == current_user.id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")

    slug_base = re.sub(r"[^a-z0-9]+", "-", f"copy-{srv.title}".lower()).strip("-")
    unique_slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    cloned = Service(
        id=uuid.uuid4(),
        title=f"Copy of {srv.title}",
        slug=unique_slug,
        description=srv.description,
        category=srv.category,
        category_slug=srv.category_slug,
        category_id=srv.category_id,
        marketplace_type=srv.marketplace_type,
        location=srv.location,
        district=srv.district,
        state=srv.state,
        latitude=srv.latitude,
        longitude=srv.longitude,
        formatted_address=srv.formatted_address,
        price=srv.price,
        unit=srv.unit,
        max_capacity=srv.max_capacity,
        duration_hours=srv.duration_hours,
        primary_image=srv.primary_image,
        images_json=srv.images_json,
        inclusions_json=srv.inclusions_json,
        amenities_json=srv.amenities_json,
        status="DRAFT",
        provider_id=current_user.id,
        provider_name=current_user.full_name,
        provider_type=srv.provider_type,
        provider_avatar=current_user.avatar_url,
        is_synthetic=bool(current_user.is_synthetic),
    )

    db.add(cloned)
    db.commit()
    db.refresh(cloned)

    return APIResponse(
        success=True,
        message="Listing duplicated successfully as draft.",
        data={
            "id": str(cloned.id),
            "title": cloned.title,
            "status": cloned.status,
            "price": cloned.price,
            "category": cloned.category,
            "category_slug": cloned.category_slug,
        },
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


# ── Availability Management Endpoints ──

@router.get("/listings/{listing_id}/availability", response_model=APIResponse[List[Dict[str, Any]]])
def get_provider_listing_availability(
    listing_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve full authoritative availability calendar and slot matrix for provider listing."""
    srv_uuid = uuid.UUID(listing_id)
    srv = db.query(Service).filter(Service.id == srv_uuid, Service.provider_id == current_user.id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")

    slots = db.query(ServiceAvailability).filter(
        ServiceAvailability.service_id == srv.id
    ).order_by(ServiceAvailability.date.asc(), ServiceAvailability.start_time.asc()).all()

    results = []
    for s in slots:
        results.append({
            "id": str(s.id),
            "service_id": str(s.service_id),
            "date": s.date,
            "start_time": s.start_time or "09:00",
            "end_time": s.end_time or "12:00",
            "slot_label": s.slot_label or f"{s.start_time or '09:00'} - {s.end_time or '12:00'}",
            "capacity": s.capacity,
            "booked_count": s.booked_count,
            "remaining_capacity": max(0, s.capacity - s.booked_count),
            "is_blocked": s.is_blocked,
            "price_override": float(s.price_override) if s.price_override is not None else None,
            "notes": s.notes,
        })

    return APIResponse(
        success=True,
        message=f"Retrieved {len(results)} availability slots.",
        data=results,
    )


@router.post("/listings/{listing_id}/availability", response_model=APIResponse[Dict[str, Any]])
def set_provider_listing_availability(
    listing_id: str,
    payload: ProviderAvailabilityCreateRequest,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Batch create or update authoritative availability slots for provider listing."""
    srv_uuid = uuid.UUID(listing_id)
    srv = db.query(Service).filter(Service.id == srv_uuid, Service.provider_id == current_user.id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")

    created_or_updated = 0
    cap = payload.capacity or srv.max_capacity or 10

    # Case 1: Structured slots provided
    if payload.slots:
        for slot_item in payload.slots:
            slot_cap = slot_item.capacity or cap
            existing = db.query(ServiceAvailability).filter(
                ServiceAvailability.service_id == srv.id,
                ServiceAvailability.date == slot_item.date,
                ServiceAvailability.start_time == slot_item.start_time,
            ).first()

            if existing:
                existing.capacity = slot_cap
                existing.end_time = slot_item.end_time
                existing.slot_label = slot_item.slot_label or f"{slot_item.start_time} - {slot_item.end_time}"
                existing.is_blocked = bool(slot_item.is_blocked)
                existing.price_override = slot_item.price_override
                existing.notes = slot_item.notes
                db.add(existing)
            else:
                new_slot = ServiceAvailability(
                    id=uuid.uuid4(),
                    service_id=srv.id,
                    date=slot_item.date,
                    start_time=slot_item.start_time,
                    end_time=slot_item.end_time,
                    slot_label=slot_item.slot_label or f"{slot_item.start_time} - {slot_item.end_time}",
                    capacity=slot_cap,
                    booked_count=0,
                    is_blocked=bool(slot_item.is_blocked),
                    price_override=slot_item.price_override,
                    notes=slot_item.notes,
                    is_synthetic=bool(current_user.is_synthetic),
                )
                db.add(new_slot)
            created_or_updated += 1
    else:
        # Case 2: List of dates or single date
        target_dates = payload.dates if payload.dates else ([payload.date] if payload.date else [])
        if not target_dates:
            raise HTTPException(status_code=400, detail="At least one date is required.")

        for d_str in target_dates:
            existing = db.query(ServiceAvailability).filter(
                ServiceAvailability.service_id == srv.id,
                ServiceAvailability.date == d_str,
                ServiceAvailability.start_time == payload.start_time,
            ).first()

            if existing:
                existing.capacity = cap
                existing.end_time = payload.end_time
                existing.slot_label = payload.slot_label or f"{payload.start_time} - {payload.end_time}"
                existing.is_blocked = bool(payload.is_blocked)
                existing.price_override = payload.price_override
                existing.notes = payload.notes
                db.add(existing)
            else:
                new_slot = ServiceAvailability(
                    id=uuid.uuid4(),
                    service_id=srv.id,
                    date=d_str,
                    start_time=payload.start_time,
                    end_time=payload.end_time,
                    slot_label=payload.slot_label or f"{payload.start_time} - {payload.end_time}",
                    capacity=cap,
                    booked_count=0,
                    is_blocked=bool(payload.is_blocked),
                    price_override=payload.price_override,
                    notes=payload.notes,
                    is_synthetic=bool(current_user.is_synthetic),
                )
                db.add(new_slot)
            created_or_updated += 1

    db.commit()

    return APIResponse(
        success=True,
        message=f"Successfully processed {created_or_updated} availability slot(s).",
        data={"service_id": str(srv.id), "slots_processed": created_or_updated},
    )


@router.delete("/listings/{listing_id}/availability/{slot_id}", response_model=APIResponse[Dict[str, Any]])
def delete_provider_listing_availability(
    listing_id: str,
    slot_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Delete an unbooked availability slot."""
    srv_uuid = uuid.UUID(listing_id)
    slot_uuid = uuid.UUID(slot_id)

    srv = db.query(Service).filter(Service.id == srv_uuid, Service.provider_id == current_user.id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")

    slot = db.query(ServiceAvailability).filter(
        ServiceAvailability.id == slot_uuid,
        ServiceAvailability.service_id == srv.id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Availability slot not found.")

    if slot.booked_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete slot with {slot.booked_count} active booking(s). Please block the slot instead.",
        )

    db.delete(slot)
    db.commit()

    return APIResponse(
        success=True,
        message="Availability slot deleted successfully.",
        data={"slot_id": str(slot.id)},
    )


@router.post("/listings/{listing_id}/availability/block", response_model=APIResponse[Dict[str, Any]])
def block_provider_listing_availability(
    listing_id: str,
    payload: ProviderAvailabilityBlockRequest,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Block or unblock availability slots for a date or specific slot."""
    srv_uuid = uuid.UUID(listing_id)
    srv = db.query(Service).filter(Service.id == srv_uuid, Service.provider_id == current_user.id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")

    affected = 0
    if payload.slot_id:
        slot = db.query(ServiceAvailability).filter(
            ServiceAvailability.id == uuid.UUID(payload.slot_id),
            ServiceAvailability.service_id == srv.id,
        ).first()
        if not slot:
            raise HTTPException(status_code=404, detail="Slot not found.")
        slot.is_blocked = payload.is_blocked
        db.add(slot)
        affected = 1
    elif payload.date:
        slots = db.query(ServiceAvailability).filter(
            ServiceAvailability.service_id == srv.id,
            ServiceAvailability.date == payload.date,
        ).all()
        for s in slots:
            s.is_blocked = payload.is_blocked
            db.add(s)
            affected += 1
    else:
        raise HTTPException(status_code=400, detail="Either slot_id or date must be provided.")

    db.commit()

    return APIResponse(
        success=True,
        message=f"{'Blocked' if payload.is_blocked else 'Unblocked'} {affected} slot(s).",
        data={"affected_count": affected, "is_blocked": payload.is_blocked},
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


# ── 5. Provider Analytics & Performance Reports Endpoints ──

def parse_period_delta(period: str) -> Optional[timedelta]:
    p = (period or "30d").lower()
    if p == "7d":
        return timedelta(days=7)
    elif p in ["90d", "3m"]:
        return timedelta(days=90)
    elif p == "all":
        return None
    return timedelta(days=30)


def calculate_lead_time_days(booking: Booking) -> Optional[float]:
    if not booking.start_date or not booking.created_at:
        return None
    try:
        start_dt = datetime.strptime(booking.start_date, "%Y-%m-%d")
        created_dt = booking.created_at
        diff = (start_dt.date() - created_dt.date()).days
        return max(0.0, float(diff))
    except Exception:
        return None


@router.get("/analytics/overview", response_model=APIResponse[Dict[str, Any]])
def get_provider_analytics_overview(
    period: str = Query("30d", description="Time window: 7d, 30d, 90d, all"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve authoritative performance overview distinguishing Gross Booking Value from Provider Earnings."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    provider_service_ids = [s.id for s in user_services]

    delta = parse_period_delta(period)
    cutoff = datetime.utcnow() - delta if delta else None

    bookings_query = db.query(Booking).filter(
        (Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids))
    ) if provider_service_ids else db.query(Booking).filter(Booking.provider_id == current_user.id)

    if cutoff:
        bookings_query = bookings_query.filter(Booking.created_at >= cutoff)

    all_bookings = bookings_query.all()
    confirmed = [b for b in all_bookings if b.status == "CONFIRMED"]
    completed = [b for b in all_bookings if b.status == "COMPLETED"]
    pending = [b for b in all_bookings if b.status == "PENDING"]
    cancelled = [b for b in all_bookings if b.status == "CANCELLED"]

    # Gross Booking Value (GMV) vs Net Provider Realized Earnings
    gmv = sum(float(b.total_amount or 0.0) for b in all_bookings if b.status != "CANCELLED")
    realized_earnings = sum(float(b.total_amount or 0.0) * 0.90 for b in confirmed + completed)
    platform_commission = sum(float(b.total_amount or 0.0) * 0.10 for b in confirmed + completed)
    cancelled_amount = sum(float(b.total_amount or 0.0) for b in cancelled)

    # Lead time calculation
    lead_times = [calculate_lead_time_days(b) for b in all_bookings]
    valid_leads = [lt for lt in lead_times if lt is not None]
    avg_lead_time = round(sum(valid_leads) / len(valid_leads), 1) if valid_leads else 0.0

    # Capacity Occupancy
    avails = db.query(ServiceAvailability).filter(
        ServiceAvailability.service_id.in_(provider_service_ids)
    ).all() if provider_service_ids else []
    total_cap = sum(a.capacity for a in avails) if avails else (len(user_services) * 10 * 30)
    total_booked_slots = sum(b.guest_count for b in confirmed + completed)
    occupancy_rate = min(round((total_booked_slots / max(total_cap, 1)) * 100, 1), 100.0)

    # Ratings & Reviews
    avg_rating = (sum(s.rating for s in user_services) / len(user_services)) if user_services else 0.0
    total_reviews = sum(s.reviews_count for s in user_services)

    # Conversion Rate from UserInteractions
    interactions_count = db.query(func.count(UserInteraction.id)).filter(
        (UserInteraction.provider_id == current_user.id) | (UserInteraction.service_id.in_(provider_service_ids))
    ).scalar() or 0 if provider_service_ids else 0

    total_engagement = max(interactions_count, len(all_bookings))
    conversion_rate = min(round((len(all_bookings) / max(total_engagement, 1)) * 100, 1), 100.0) if total_engagement > 0 else 0.0

    return APIResponse(
        success=True,
        message="Analytics overview retrieved successfully.",
        data={
            "period": period,
            "total_bookings": len(all_bookings),
            "bookings_breakdown": {
                "total": len(all_bookings),
                "confirmed": len(confirmed),
                "completed": len(completed),
                "pending": len(pending),
                "cancelled": len(cancelled),
            },
            "financials": {
                "gross_booking_value": round(gmv, 2),
                "formatted_gmv": f"₹{gmv:,.2f}",
                "net_realized_earnings": round(realized_earnings, 2),
                "formatted_earnings": f"₹{realized_earnings:,.2f}",
                "platform_commission": round(platform_commission, 2),
                "cancelled_amount": round(cancelled_amount, 2),
                "commission_rate": "10%",
                "payout_rate": "90%",
            },
            # Legacy compatibility keys for existing dashboard cards
            "total_revenue": round(gmv, 2),
            "net_earnings": round(realized_earnings, 2),
            "occupancy_rate": occupancy_rate,
            "conversion_rate": conversion_rate,
            "avg_lead_time_days": avg_lead_time,
            "average_rating": round(avg_rating, 2),
            "total_reviews": total_reviews,
            "active_services_count": len([s for s in user_services if s.status == "PUBLISHED"]),
            "total_services_count": len(user_services),
        },
    )


@router.get("/analytics/service/{service_id}", response_model=APIResponse[Dict[str, Any]])
def get_service_analytics_report(
    service_id: str,
    period: str = Query("30d", description="Time window: 7d, 30d, 90d, all"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve deep-dive performance report for a specific provider-owned service."""
    srv_uuid = uuid.UUID(service_id)
    srv = db.query(Service).filter(Service.id == srv_uuid, Service.provider_id == current_user.id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service not found or access denied.")

    delta = parse_period_delta(period)
    cutoff = datetime.utcnow() - delta if delta else None

    bookings_query = db.query(Booking).filter(Booking.service_id == srv.id)
    if cutoff:
        bookings_query = bookings_query.filter(Booking.created_at >= cutoff)

    bookings = bookings_query.all()
    confirmed = [b for b in bookings if b.status == "CONFIRMED"]
    completed = [b for b in bookings if b.status == "COMPLETED"]
    pending = [b for b in bookings if b.status == "PENDING"]
    cancelled = [b for b in bookings if b.status == "CANCELLED"]

    gmv = sum(float(b.total_amount or 0.0) for b in bookings if b.status != "CANCELLED")
    realized_earnings = sum(float(b.total_amount or 0.0) * 0.90 for b in confirmed + completed)
    platform_fee = sum(float(b.total_amount or 0.0) * 0.10 for b in confirmed + completed)
    cancelled_amt = sum(float(b.total_amount or 0.0) for b in cancelled)

    # Lead times
    leads = [calculate_lead_time_days(b) for b in bookings]
    valid_leads = [l for l in leads if l is not None]
    avg_lead_time = round(sum(valid_leads) / len(valid_leads), 1) if valid_leads else 0.0

    # Availability and occupancy
    avails = db.query(ServiceAvailability).filter(ServiceAvailability.service_id == srv.id).all()
    total_cap = sum(a.capacity for a in avails) if avails else (srv.max_capacity or 10) * 30
    booked_slots = sum(b.guest_count for b in confirmed + completed)
    occupancy = min(round((booked_slots / max(total_cap, 1)) * 100, 1), 100.0)

    # Funnel interactions
    interactions_q = db.query(UserInteraction).filter(UserInteraction.service_id == srv.id)
    if cutoff:
        interactions_q = interactions_q.filter(UserInteraction.created_at >= cutoff)
    interactions = interactions_q.all()

    views_cnt = sum(1 for i in interactions if i.event_type in ["VIEW", "SEARCH"])
    clicks_cnt = sum(1 for i in interactions if i.event_type in ["CLICK", "DETAIL_OPEN"])
    saves_cnt = sum(1 for i in interactions if i.event_type == "SAVE")
    bookings_cnt = len(bookings)

    conversion_rate = round((bookings_cnt / max(views_cnt, bookings_cnt, 1)) * 100, 1)

    return APIResponse(
        success=True,
        message=f"Analytics report for '{srv.title}' retrieved.",
        data={
            "service_id": str(srv.id),
            "title": srv.title,
            "category": srv.category,
            "category_slug": srv.category_slug,
            "price": float(srv.price),
            "unit": srv.unit,
            "status": srv.status,
            "rating": srv.rating,
            "reviews_count": srv.reviews_count,
            "period": period,
            "bookings": {
                "total": bookings_cnt,
                "confirmed": len(confirmed),
                "completed": len(completed),
                "pending": len(pending),
                "cancelled": len(cancelled),
            },
            "financials": {
                "gross_booking_value": round(gmv, 2),
                "net_realized_earnings": round(realized_earnings, 2),
                "platform_fee": round(platform_fee, 2),
                "cancelled_amount": round(cancelled_amt, 2),
            },
            "funnel": {
                "impressions_views": views_cnt,
                "detail_clicks": clicks_cnt,
                "saves": saves_cnt,
                "bookings": bookings_cnt,
                "conversion_rate_percent": conversion_rate,
            },
            "operations": {
                "total_slots_scheduled": len(avails),
                "total_capacity": total_cap,
                "booked_guests": booked_slots,
                "occupancy_rate": occupancy,
                "avg_lead_time_days": avg_lead_time,
            },
        },
    )


@router.get("/analytics/earnings", response_model=APIResponse[Dict[str, Any]])
def get_provider_earnings_report(
    period: str = Query("30d", description="Time window: 7d, 30d, 90d, all"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve comprehensive financial earnings report separating GMV from realized provider income."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    provider_service_ids = [s.id for s in user_services]

    delta = parse_period_delta(period)
    cutoff = datetime.utcnow() - delta if delta else None

    bookings_query = db.query(Booking).filter(
        (Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids))
    ) if provider_service_ids else db.query(Booking).filter(Booking.provider_id == current_user.id)

    if cutoff:
        bookings_query = bookings_query.filter(Booking.created_at >= cutoff)

    bookings = bookings_query.all()
    confirmed = [b for b in bookings if b.status == "CONFIRMED"]
    completed = [b for b in bookings if b.status == "COMPLETED"]
    cancelled = [b for b in bookings if b.status == "CANCELLED"]

    gmv = sum(float(b.total_amount or 0.0) for b in bookings if b.status != "CANCELLED")
    realized_earnings = sum(float(b.total_amount or 0.0) * 0.90 for b in confirmed + completed)
    platform_commission = sum(float(b.total_amount or 0.0) * 0.10 for b in confirmed + completed)
    cancelled_amt = sum(float(b.total_amount or 0.0) for b in cancelled)
    pending_payout = sum(float(b.total_amount or 0.0) * 0.90 for b in completed)

    # Daily time-series breakdown
    days_count = 7 if period == "7d" else (90 if period in ["90d", "3m"] else (365 if period == "all" else 30))
    today = datetime.now()
    daily_breakdown = []
    for i in range(days_count - 1, -1, -1):
        d = today - timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        d_bookings = [b for b in bookings if b.start_date == date_str]
        d_gmv = sum(float(b.total_amount or 0.0) for b in d_bookings if b.status != "CANCELLED")
        d_net = sum(float(b.total_amount or 0.0) * 0.90 for b in d_bookings if b.status in ["CONFIRMED", "COMPLETED"])
        daily_breakdown.append({
            "date": date_str,
            "label": d.strftime("%b %d"),
            "gmv": round(d_gmv, 2),
            "net_earnings": round(d_net, 2),
            "bookings_count": len(d_bookings),
        })

    return APIResponse(
        success=True,
        message="Authoritative earnings report retrieved.",
        data={
            "period": period,
            "gross_booking_value": round(gmv, 2),
            "formatted_gmv": f"₹{gmv:,.2f}",
            "net_realized_earnings": round(realized_earnings, 2),
            "formatted_net_earnings": f"₹{realized_earnings:,.2f}",
            "platform_commission": round(platform_commission, 2),
            "cancelled_refunded_amount": round(cancelled_amt, 2),
            "pending_settlement_payout": round(pending_payout, 2),
            "commission_rate_percent": 10.0,
            "provider_share_percent": 90.0,
            "total_settled_transactions": len(confirmed + completed),
            "daily_series": daily_breakdown,
        },
    )


@router.get("/analytics/interactions", response_model=APIResponse[Dict[str, Any]])
def get_provider_interactions_funnel(
    period: str = Query("30d", description="Time window: 7d, 30d, 90d, all"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve full traveler conversion funnel from UserInteraction events."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    provider_service_ids = [s.id for s in user_services]

    delta = parse_period_delta(period)
    cutoff = datetime.utcnow() - delta if delta else None

    interactions_q = db.query(UserInteraction).filter(
        (UserInteraction.provider_id == current_user.id) | (UserInteraction.service_id.in_(provider_service_ids))
    ) if provider_service_ids else db.query(UserInteraction).filter(UserInteraction.provider_id == current_user.id)

    if cutoff:
        interactions_q = interactions_q.filter(UserInteraction.created_at >= cutoff)

    interactions = interactions_q.all()

    views = sum(1 for i in interactions if i.event_type in ["VIEW", "SEARCH"])
    clicks = sum(1 for i in interactions if i.event_type in ["CLICK", "DETAIL_OPEN"])
    saves = sum(1 for i in interactions if i.event_type == "SAVE")

    bookings_q = db.query(Booking).filter(
        (Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids))
    ) if provider_service_ids else db.query(Booking).filter(Booking.provider_id == current_user.id)
    if cutoff:
        bookings_q = bookings_q.filter(Booking.created_at >= cutoff)
    bookings = bookings_q.all()
    conversions = len(bookings)
    completed_conversions = sum(1 for b in bookings if b.status == "COMPLETED")

    base_impressions = max(views, clicks + conversions, 1)

    funnel_steps = [
        {"step": "Explore Views & Impressions", "count": base_impressions, "conversion_from_prev": 100.0},
        {"step": "Detail Page Opens & Clicks", "count": clicks, "conversion_from_prev": round((clicks / base_impressions) * 100, 1)},
        {"step": "Wishlist & Saves", "count": saves, "conversion_from_prev": round((saves / max(clicks, 1)) * 100, 1)},
        {"step": "Booking Inquiries / Initiated", "count": conversions, "conversion_from_prev": round((conversions / max(clicks, 1)) * 100, 1)},
        {"step": "Completed Experiences", "count": completed_conversions, "conversion_from_prev": round((completed_conversions / max(conversions, 1)) * 100, 1)},
    ]

    return APIResponse(
        success=True,
        message="Interactions funnel report retrieved.",
        data={
            "period": period,
            "funnel_steps": funnel_steps,
            "total_interactions": len(interactions),
            "impressions": base_impressions,
            "clicks": clicks,
            "saves": saves,
            "bookings": conversions,
            "overall_conversion_rate": round((conversions / base_impressions) * 100, 1),
        },
    )


@router.get("/analytics/bookings-report", response_model=APIResponse[Dict[str, Any]])
def get_provider_bookings_report(
    period: str = Query("30d", description="Time window: 7d, 30d, 90d, all"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve detailed bookings performance report including lead time distribution and group sizes."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    provider_service_ids = [s.id for s in user_services]

    delta = parse_period_delta(period)
    cutoff = datetime.utcnow() - delta if delta else None

    bookings_query = db.query(Booking).filter(
        (Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids))
    ) if provider_service_ids else db.query(Booking).filter(Booking.provider_id == current_user.id)

    if cutoff:
        bookings_query = bookings_query.filter(Booking.created_at >= cutoff)

    bookings = bookings_query.all()
    total_count = len(bookings)

    status_counts = {"PENDING": 0, "CONFIRMED": 0, "COMPLETED": 0, "CANCELLED": 0}
    for b in bookings:
        status_counts[b.status] = status_counts.get(b.status, 0) + 1

    cancellation_rate = round((status_counts.get("CANCELLED", 0) / max(total_count, 1)) * 100, 1)

    # Lead time distribution buckets
    lead_buckets = {
        "Same-day (0 days)": 0,
        "1 - 3 days in advance": 0,
        "4 - 7 days in advance": 0,
        "8+ days in advance": 0,
    }

    all_leads = []
    for b in bookings:
        lt = calculate_lead_time_days(b)
        if lt is not None:
            all_leads.append(lt)
            if lt < 1:
                lead_buckets["Same-day (0 days)"] += 1
            elif lt <= 3:
                lead_buckets["1 - 3 days in advance"] += 1
            elif lt <= 7:
                lead_buckets["4 - 7 days in advance"] += 1
            else:
                lead_buckets["8+ days in advance"] += 1

    avg_lead = round(sum(all_leads) / len(all_leads), 1) if all_leads else 0.0
    avg_group_size = round(sum(b.guest_count for b in bookings) / max(total_count, 1), 1) if total_count else 1.0

    return APIResponse(
        success=True,
        message="Bookings performance report retrieved.",
        data={
            "period": period,
            "total_bookings": total_count,
            "status_distribution": status_counts,
            "cancellation_rate_percent": cancellation_rate,
            "average_group_size": avg_group_size,
            "average_lead_time_days": avg_lead,
            "lead_time_distribution": [
                {
                    "bucket": k,
                    "count": v,
                    "percentage": round((v / max(total_count, 1)) * 100, 1),
                }
                for k, v in lead_buckets.items()
            ],
        },
    )


@router.get("/analytics/trends", response_model=APIResponse[Dict[str, Any]])
def get_provider_analytics_trends(
    period: str = Query("30d", description="Time window: 7d, 30d, 3m"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve combined Bookings & Revenue trend dataset with labels and series."""
    days_count = 7 if period == "7d" else (90 if period == "3m" else 30)
    today = datetime.now()

    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    provider_service_ids = [s.id for s in user_services]

    labels = []
    bookings_data = []
    revenue_data = []

    for i in range(days_count - 1, -1, -1):
        d = today - timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        label = d.strftime("%b %d")
        labels.append(label)

        day_bookings = db.query(Booking).filter(
            ((Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids)))
            if provider_service_ids else (Booking.provider_id == current_user.id),
            Booking.start_date == date_str,
        ).all()

        daily_revenue = sum(float(b.total_amount or 0.0) * 0.90 for b in day_bookings if b.status in ["CONFIRMED", "COMPLETED"])
        bookings_data.append(len(day_bookings))
        revenue_data.append(round(daily_revenue, 2))

    return APIResponse(
        success=True,
        message="Analytics trend data retrieved.",
        data={
            "period": period,
            "labels": labels,
            "series": [
                {"name": "Bookings Count", "type": "bar", "data": bookings_data},
                {"name": "Net Provider Revenue (INR)", "type": "line", "data": revenue_data},
            ],
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
        booked_slots = sum(b.guest_count for b in s_bookings if b.status in ["CONFIRMED", "COMPLETED"])
        occupancy = min(round((booked_slots / (capacity * 30)) * 100, 1), 100.0)

        results.append({
            "id": str(s.id),
            "title": s.title,
            "category": s.category,
            "primary_image": s.primary_image,
            "bookings": b_count,
            "bookings_count": b_count,
            "revenue": round(revenue, 2),
            "rating": s.rating,
            "reviews_count": s.reviews_count,
            "slot_utilization": occupancy,
            "occupancy_percentage": occupancy,
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
    """Analyze customer booking demand by day of week, peak hours, and capacity availability."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    provider_service_ids = [s.id for s in user_services]

    bookings = db.query(Booking).filter(
        (Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids))
    ).all() if provider_service_ids else []

    day_counts = {"Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0}
    time_slots = {"Morning (06:00 - 12:00)": 0, "Afternoon (12:00 - 16:00)": 0, "Evening (16:00 - 20:00)": 0}

    for b in bookings:
        try:
            dt = datetime.strptime(b.start_date, "%Y-%m-%d")
            day_name = dt.strftime("%A")
            day_counts[day_name] = day_counts.get(day_name, 0) + 1
        except Exception:
            pass

        slot_lbl = (b.time_slot_label or "").lower()
        if "morning" in slot_lbl or "06" in slot_lbl or "07" in slot_lbl or "08" in slot_lbl or "09" in slot_lbl:
            time_slots["Morning (06:00 - 12:00)"] += 1
        elif "afternoon" in slot_lbl or "12" in slot_lbl or "13" in slot_lbl or "14" in slot_lbl or "15" in slot_lbl:
            time_slots["Afternoon (12:00 - 16:00)"] += 1
        else:
            time_slots["Evening (16:00 - 20:00)"] += 1

    peak_day = max(day_counts, key=day_counts.get) if any(day_counts.values()) else "Saturday"
    peak_slot = max(time_slots, key=time_slots.get) if any(time_slots.values()) else "Morning (06:00 - 12:00)"

    # Sold out slots count
    avails = db.query(ServiceAvailability).filter(
        ServiceAvailability.service_id.in_(provider_service_ids)
    ).all() if provider_service_ids else []
    sold_out_count = sum(1 for a in avails if a.booked_count >= a.capacity and a.capacity > 0)

    return APIResponse(
        success=True,
        message="Demand analysis retrieved.",
        data={
            "has_enough_data": len(bookings) >= 3,
            "peak_days": [peak_day, "Sunday" if peak_day != "Sunday" else "Saturday"],
            "peak_hours": f"{peak_day} {peak_slot.split(' ')[0]}s",
            "days_demand": [{"day": day, "count": count} for day, count in day_counts.items()],
            "time_slots_demand": [{"slot": slot, "count": count} for slot, count in time_slots.items()],
            "sold_out_slots_count": sold_out_count,
            "total_slots_scheduled": len(avails),
            "seasonality_insight": f"Peak reservations occur during {peak_day}s with high preference for morning plantation walks.",
        },
    )


@router.get("/analytics/recommendations", response_model=APIResponse[Dict[str, Any]])
def get_provider_smart_recommendations(
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Deterministic Rule-Based Recommendations Engine covering Types A through J with explainability and confidence thresholds."""
    user_services = db.query(Service).filter(Service.provider_id == current_user.id).all()
    provider_service_ids = [s.id for s in user_services]

    bookings = db.query(Booking).filter(
        (Booking.provider_id == current_user.id) | (Booking.service_id.in_(provider_service_ids))
    ).all() if provider_service_ids else []

    avails = db.query(ServiceAvailability).filter(
        ServiceAvailability.service_id.in_(provider_service_ids)
    ).all() if provider_service_ids else []

    interactions = db.query(UserInteraction).filter(
        (UserInteraction.provider_id == current_user.id) | (UserInteraction.service_id.in_(provider_service_ids))
    ).all() if provider_service_ids else []

    # 1. Data Sufficiency Confidence Level
    b_count = len(bookings)
    i_count = len(interactions)
    if b_count < 5 and i_count < 15:
        confidence = "LOW_DATA"
    elif b_count <= 20 or i_count <= 50:
        confidence = "SUFFICIENT_DATA"
    else:
        confidence = "HIGH_CONFIDENCE"

    recommendations_list: List[Dict[str, Any]] = []

    # Calculate overall occupancy
    total_capacity = sum((s.max_capacity or 10) * 30 for s in user_services) if user_services else 100
    booked_guests = sum(b.guest_count for b in bookings)
    overall_occupancy_pct = (booked_guests / total_capacity * 100) if total_capacity > 0 else 0

    # Rule A: Expand Service / Capacity (High occupancy across slots)
    high_occ_services = []
    for s in user_services:
        s_b = [b for b in bookings if b.service_id == s.id]
        s_cap = max((s.max_capacity or 10) * 30, 1)
        s_occ = (sum(b.guest_count for b in s_b) / s_cap) * 100
        if s_occ >= 70.0 or len(s_b) >= 8:
            high_occ_services.append((s, s_occ, len(s_b)))

    if high_occ_services:
        best_srv, s_occ, s_cnt = high_occ_services[0]
        recommendations_list.append({
            "id": f"rec-a-{best_srv.id}",
            "type_code": "A",
            "recommendation_type": "EXPAND_CAPACITY",
            "action_type": "EXPAND_CAPACITY",
            "confidence": confidence,
            "priority": "HIGH",
            "priority_score": 9.2,
            "title": f"Expand Capacity for '{best_srv.title}'",
            "description": f"Demand is strong ({s_cnt} bookings). Increasing max capacity or adding batch slots will capture unmet demand.",
            "evidence": f"Listing has {s_occ:.1f}% estimated occupancy with {s_cnt} reservations in current cycle.",
            "expected_impact": "Estimated +18% incremental revenue by unlocking additional traveler group capacity.",
            "action_text": "Update Service Capacity",
            "action_target": f"/provider/services/{best_srv.id}",
            "service_id": str(best_srv.id),
        })

    # Rule B: Add Availability / Weekend Slots
    if len(avails) < 10 or overall_occupancy_pct >= 50:
        recommendations_list.append({
            "id": "rec-b-add-slots",
            "type_code": "B",
            "recommendation_type": "ADD_AVAILABILITY",
            "action_type": "ADD_SLOT",
            "confidence": confidence,
            "priority": "HIGH",
            "priority_score": 8.8,
            "title": "Add Upcoming Weekend Availability Slots",
            "description": "Weekend dates experience 3x higher booking velocity across Western Ghats & Karnataka travelers.",
            "evidence": f"Catalog currently has {len(avails)} active scheduled availability slots across all services.",
            "expected_impact": "Publishing 4 new weekend slots projected to capture 8 to 15 additional guest reservations.",
            "action_text": "Schedule Availability",
            "action_target": "/provider/listings",
            "service_id": str(user_services[0].id) if user_services else None,
        })

    # Rule C: Pricing Opportunity (Price Too Low / High Demand -> Raise Price)
    if overall_occupancy_pct >= 60 and len(bookings) >= 5 and user_services:
        target_s = user_services[0]
        suggested_p = round(float(target_s.price) * 1.15, 2)
        recommendations_list.append({
            "id": f"rec-c-{target_s.id}",
            "type_code": "C",
            "recommendation_type": "INCREASE_PRICE",
            "action_type": "REVIEW_PRICE",
            "confidence": confidence,
            "priority": "MEDIUM",
            "priority_score": 7.5,
            "title": f"Yield Optimization: Increase Price for '{target_s.title}'",
            "description": "Consistently strong demand indicates travelers have high willingness to pay for your offering.",
            "evidence": f"Service is priced at ₹{target_s.price:,.2f} with {target_s.rating:.1f}★ rating across {target_s.reviews_count} reviews.",
            "expected_impact": f"Adjusting tariff to ₹{suggested_p:,.2f} increases net earnings by +15% per booking.",
            "action_text": "Adjust Price Tariff",
            "action_target": f"/provider/services/{target_s.id}",
            "service_id": str(target_s.id),
        })

    # Rule D: Price Too High / Low Conversion -> Reduce Price / Promotion
    zero_b_services = [s for s in user_services if s.status == "PUBLISHED" and not any(b.service_id == s.id for b in bookings)]
    if zero_b_services:
        promo_srv = zero_b_services[0]
        recommendations_list.append({
            "id": f"rec-d-{promo_srv.id}",
            "type_code": "D",
            "recommendation_type": "REDUCE_PRICE",
            "action_type": "REVIEW_PRICE",
            "confidence": confidence,
            "priority": "MEDIUM",
            "priority_score": 7.0,
            "title": f"Launch Introductory Promotion for '{promo_srv.title}'",
            "description": "Offering a 10% promotional introductory rate can ignite initial booking traction and traveler reviews.",
            "evidence": f"Listing has 0 confirmed reservations since publication at tariff ₹{promo_srv.price:,.2f}.",
            "expected_impact": "Introductory pricing typically accelerates first booking conversion by 40%.",
            "action_text": "Apply Promotional Discount",
            "action_target": f"/provider/services/{promo_srv.id}",
            "service_id": str(promo_srv.id),
        })

    # Rule G: Listing Quality (Missing photos, short description, missing inclusions)
    underdetailed_services = [
        s for s in user_services
        if len(s.description or "") < 120 or len(parse_json_list(s.images_json)) < 2
    ]
    if underdetailed_services:
        qual_srv = underdetailed_services[0]
        recommendations_list.append({
            "id": f"rec-g-{qual_srv.id}",
            "type_code": "G",
            "recommendation_type": "IMPROVE_LISTING_QUALITY",
            "action_type": "IMPROVE_LISTING",
            "confidence": "HIGH_CONFIDENCE",
            "priority": "HIGH",
            "priority_score": 8.5,
            "title": f"Enhance Listing Media & Inclusions for '{qual_srv.title}'",
            "description": "High-definition photography and clear itemized inclusions dramatically increase traveler trust.",
            "evidence": f"Listing has {len(parse_json_list(qual_srv.images_json))} gallery image(s) and {len(qual_srv.description or '')} characters description.",
            "expected_impact": "Listings with 3+ images and rich inclusions experience 2.4x higher booking conversion.",
            "action_text": "Update Listing Media",
            "action_target": f"/provider/services/{qual_srv.id}",
            "service_id": str(qual_srv.id),
        })

    # Rule H: Review Quality (Prompt guests for reviews)
    low_review_services = [s for s in user_services if s.reviews_count < 3 and s.status == "PUBLISHED"]
    if low_review_services:
        rev_srv = low_review_services[0]
        recommendations_list.append({
            "id": f"rec-h-{rev_srv.id}",
            "type_code": "H",
            "recommendation_type": "REVIEW_QUALITY",
            "action_type": "IMPROVE_LISTING",
            "confidence": confidence,
            "priority": "MEDIUM",
            "priority_score": 6.8,
            "title": f"Collect Verified Guest Reviews for '{rev_srv.title}'",
            "description": "Invite recent guests to share their experience. Reviews boost search ranking on Namma AI Explore.",
            "evidence": f"Currently has {rev_srv.reviews_count} review(s). Listings need 3+ reviews to qualify for Superhost badges.",
            "expected_impact": "Reaching 5 verified reviews improves ranking placement in Namma AI recommendations by 65%.",
            "action_text": "View Completed Bookings",
            "action_target": "/provider/bookings",
            "service_id": str(rev_srv.id),
        })

    # Rule I: Adjust Booking Window / Lead Time
    leads = [calculate_lead_time_days(b) for b in bookings]
    valid_leads = [l for l in leads if l is not None]
    if valid_leads:
        avg_lead = sum(valid_leads) / len(valid_leads)
        if avg_lead <= 2.0:
            recommendations_list.append({
                "id": "rec-i-lead-time",
                "type_code": "I",
                "recommendation_type": "ADJUST_BOOKING_WINDOW",
                "action_type": "ADD_SLOT",
                "confidence": confidence,
                "priority": "MEDIUM",
                "priority_score": 7.2,
                "title": "Enable Same-Day & Short-Notice Booking Window",
                "description": f"Your guests book on short notice (avg {avg_lead:.1f} days lead time). Ensure same-day slots remain unblocked.",
                "evidence": f"Average lead time is {avg_lead:.1f} days across {len(valid_leads)} analyzed bookings.",
                "expected_impact": "Captures spontaneous weekend getaways and road travelers across Karnataka.",
                "action_text": "Review Availability Window",
                "action_target": "/provider/listings",
            })

    # Rule J: New Service Opportunity (Missing popular marketplace categories)
    existing_categories = set(s.category for s in user_services)
    missing_popular = [cat for cat in ["Photography", "Food Tours & Cooking", "Drone & Aerial", "Adventure & Trekking"] if cat not in existing_categories]
    if missing_popular:
        target_opp = missing_popular[0]
        recommendations_list.append({
            "id": "rec-j-new-service",
            "type_code": "J",
            "recommendation_type": "NEW_SERVICE_OPPORTUNITY",
            "action_type": "EXPAND_CAPACITY",
            "confidence": "HIGH_CONFIDENCE",
            "priority": "MEDIUM",
            "priority_score": 7.8,
            "title": f"New Offering Opportunity: Add a '{target_opp}' Listing",
            "description": f"Travelers frequently search for '{target_opp}' in your regional destination. Expand your catalog to capture this demand.",
            "evidence": f"You currently have active listings in {len(existing_categories)} category(s). Category '{target_opp}' is unrepresented.",
            "expected_impact": "Adding multi-category services increases cross-booking chances by 32%.",
            "action_text": "Add New Service",
            "action_target": "/provider/services/new",
        })

    # Persist authoritative recommendations to ProviderActionRecommendation table
    for rec in recommendations_list:
        try:
            existing_rec = db.query(ProviderActionRecommendation).filter(
                ProviderActionRecommendation.provider_id == current_user.id,
                ProviderActionRecommendation.recommendation_type == rec["recommendation_type"],
            ).first()
            if not existing_rec:
                new_rec = ProviderActionRecommendation(
                    id=uuid.uuid4(),
                    provider_id=current_user.id,
                    service_id=uuid.UUID(rec["service_id"]) if rec.get("service_id") else None,
                    action_type=rec["action_type"],
                    recommendation_type=rec["recommendation_type"],
                    priority=rec["priority"],
                    title=rec["title"],
                    message=rec["description"],
                    reason=rec["evidence"],
                    evidence=rec["evidence"],
                    expected_impact=rec["expected_impact"],
                    action_text=rec["action_text"],
                    priority_score=rec["priority_score"],
                    status="PENDING",
                    is_synthetic=bool(current_user.is_synthetic),
                )
                db.add(new_rec)
        except Exception:
            pass
    try:
        db.commit()
    except Exception:
        db.rollback()

    # Backwards-compatible legacy structure
    slot_rec = {
        "title": recommendations_list[0]["title"] if recommendations_list else "Slot Availability Recommendation",
        "description": recommendations_list[0]["description"] if recommendations_list else "Keep adding slots.",
        "type": "ADD_SLOTS",
        "has_recommendation": len(recommendations_list) > 0,
        "action_target": "/provider/listings",
    }

    avg_p = float(round(sum(float(s.price or 0.0) for s in user_services) / max(len(user_services), 1), 2)) if user_services else 750.0
    pricing_insight = {
        "title": "Pricing Insights",
        "description": "Tariffs are aligned with regional Western Ghats averages.",
        "current_avg_price": avg_p,
        "recommended_price_range": f"₹{avg_p * 0.95:,.0f} - ₹{avg_p * 1.2:,.0f}",
        "advisory_note": "Prices are never automatically altered. You maintain complete control over your service tariffs.",
        "has_action": True,
    }

    legacy_opportunities = [
        {
            "id": r["id"],
            "title": r["title"],
            "description": r["description"],
            "impact": f"{r['priority']} Impact",
            "target": r["action_target"],
            "action_label": r["action_text"],
        }
        for r in recommendations_list[:4]
    ]

    smart_slots = [
        {
            "day": "Saturday",
            "recommended_time": "09:00 AM - 12:00 PM",
            "demand_reason": "Highest weekend tour demand among regional travelers.",
            "expected_boost": "+25% Demand",
        },
        {
            "day": "Sunday",
            "recommended_time": "08:30 AM - 11:30 AM",
            "demand_reason": "Popular morning plantation and harvest photography time.",
            "expected_boost": "+20% Demand",
        },
    ]

    return APIResponse(
        success=True,
        message="Smart analytics recommendations generated successfully.",
        data={
            "confidence_level": confidence,
            "data_sufficiency": {
                "bookings_count": b_count,
                "interactions_count": i_count,
                "confidence": confidence,
            },
            "recommendations": recommendations_list,
            # Legacy frontend compatibility keys
            "slot_recommendation": slot_rec,
            "pricing_insight": pricing_insight,
            "opportunities": legacy_opportunities,
            "smart_slots": smart_slots,
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
    writer.writerow(["Service ID", "Title", "Category", "Price", "Unit", "Rating", "Reviews Count", "Status", "Max Capacity", "Location"])

    for s in user_services:
        writer.writerow([str(s.id), s.title, s.category, s.price, s.unit, s.rating, s.reviews_count, s.status, s.max_capacity, s.location])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=provider_analytics_{datetime.now().strftime('%Y%m%d')}.csv"},
    )
