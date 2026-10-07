"""Marketplace Domain Service for Services, Search, Catalog, and Availability Management."""

import json
import uuid
import math
from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple, Any, Dict
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.service import Service, Review
from app.repositories.service import ServiceRepository
from app.services.communication import NotificationService
from app.schemas.service import (
    ServiceResponse,
    ServiceListResponse,
    ServiceDetailResponse,
    ReviewCreateRequest,
    ReviewResponse,
    SearchSuggestionItem,
    SearchSuggestionsResponse,
    SearchResponse,
    TimeSlotItem,
    DayAvailabilityItem,
    ServiceAvailabilityResponse,
    ServiceCreatePayload,
    ServiceUpdatePayload,
    normalize_amenities,
)


class MarketplaceService:
    """Business logic for Marketplace Discovery, Search, and Availability."""

    @classmethod
    def normalize_amenities(cls, raw: Any) -> Tuple[List[str], Dict[str, Any]]:
        """Normalize raw amenities data into a list of strings and category-specific details dict."""
        return normalize_amenities(raw)

    @classmethod
    def _to_service_response(cls, s: Service, db: Optional[Session] = None) -> ServiceResponse:
        """Serialize SQLAlchemy Service model to Pydantic ServiceResponse."""
        try:
            images = json.loads(s.images_json) if s.images_json else []
        except Exception:
            images = [s.primary_image] if s.primary_image else []

        try:
            inclusions = json.loads(s.inclusions_json) if s.inclusions_json else []
        except Exception:
            inclusions = []

        raw_amenities = getattr(s, "amenities_json", None)
        if raw_amenities is None:
            raw_amenities = getattr(s, "amenities", None)
        amenities, specific_details = cls.normalize_amenities(raw_amenities)

        provider_verified = getattr(s, "is_verified", True)
        provider_email = None
        provider_mobile = None
        if s.provider_id and db:
            provider = db.query(User).filter(User.id == s.provider_id).first()
            if provider:
                provider_verified = provider.is_verified
                provider_email = provider.email
                provider_mobile = getattr(provider, "mobile", None)

        return ServiceResponse(
            id=str(s.id),
            title=s.title,
            slug=s.slug,
            description=s.description,
            category=s.category,
            category_slug=s.category_slug,
            category_id=str(s.category_id) if getattr(s, "category_id", None) else None,
            marketplace_type=getattr(s, "marketplace_type", "ACTIVITY") or "ACTIVITY",
            location=s.location,
            district=s.district,
            state=s.state,
            latitude=s.latitude,
            longitude=s.longitude,
            formatted_address=getattr(s, "formatted_address", None),
            price=s.price,
            unit=s.unit,
            duration_hours=s.duration_hours,
            max_capacity=s.max_capacity,
            rating=s.rating,
            reviews_count=s.reviews_count,
            is_verified=s.is_verified,
            status=s.status,
            provider_id=str(s.provider_id) if s.provider_id else None,
            provider_name=s.provider_name,
            provider_type=s.provider_type,
            provider_avatar=s.provider_avatar,
            provider_verified=provider_verified,
            provider_email=provider_email,
            provider_mobile=provider_mobile,
            primary_image=s.primary_image,
            images=images,
            inclusions=inclusions,
            amenities=amenities,
            specific_details=specific_details,
            rejection_reason=s.rejection_reason,
            reviewed_by=str(s.reviewed_by) if s.reviewed_by else None,
            reviewed_at=s.reviewed_at,
            created_at=s.created_at,
        )

    @classmethod
    def _to_review_response(cls, r: Review) -> ReviewResponse:
        """Serialize SQLAlchemy Review model to Pydantic ReviewResponse."""
        return ReviewResponse(
            id=str(r.id),
            service_id=str(r.service_id),
            booking_id=str(r.booking_id) if r.booking_id else None,
            user_name=r.user_name,
            rating=r.rating,
            comment=r.comment,
            is_verified=getattr(r, "is_verified", True),
            status=getattr(r, "status", "PUBLISHED"),
            created_at=r.created_at,
        )

    @classmethod
    def list_services(
        cls,
        db: Session,
        category: Optional[str] = None,
        location: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        sort_by: Optional[str] = "rating",
        page: int = 1,
        limit: int = 12,
        q: Optional[str] = None,
    ) -> ServiceListResponse:
        """List services from catalog."""
        items, total = ServiceRepository.list_services(
            db,
            category=category,
            location=location,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
            sort_by=sort_by,
            page=page,
            limit=limit,
            status="PUBLISHED",
            q=q,
        )

        total_pages = max(1, math.ceil(total / limit)) if limit > 0 else 1
        serialized = [cls._to_service_response(s) for s in items]

        return ServiceListResponse(
            services=serialized,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    @classmethod
    def get_service_detail(cls, db: Session, service_id: str) -> ServiceDetailResponse:
        """Fetch detailed service listing and associated reviews."""
        service = ServiceRepository.get_by_id(db, service_id)
        if not service:
            # Fallback lookup by slug
            service = ServiceRepository.get_by_slug(db, service_id)

        if not service or service.status != "PUBLISHED":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Marketplace service with ID '{service_id}' was not found or is unpublished.",
            )

        reviews = ServiceRepository.get_reviews_for_service(db, str(service.id))

        return ServiceDetailResponse(
            service=cls._to_service_response(service),
            reviews=[cls._to_review_response(r) for r in reviews],
        )

    @classmethod
    def get_service_reviews(cls, db: Session, service_id: str) -> List[ReviewResponse]:
        """Fetch reviews list for a service."""
        reviews = ServiceRepository.get_reviews_for_service(db, service_id)
        return [cls._to_review_response(r) for r in reviews]

    @classmethod
    def submit_service_review(
        cls,
        db: Session,
        current_user: User,
        service_id: str,
        req: ReviewCreateRequest,
    ) -> ReviewResponse:
        """Submit a verified customer review for an eligible completed booking reservation."""

        # 1. Fetch & validate service
        service = ServiceRepository.get_by_id(db, service_id)
        if not service:
            service = ServiceRepository.get_by_slug(db, service_id)

        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service listing '{service_id}' was not found.",
            )

        # 2. Fetch & validate booking
        from app.repositories.booking import BookingRepository
        booking = BookingRepository.get_by_id(db, req.booking_id)
        if not booking:
            booking = BookingRepository.get_by_code(db, req.booking_id)

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking reservation '{req.booking_id}' was not found.",
            )

        # 3. Verify customer ownership
        if str(booking.customer_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to submit a review for another customer's booking.",
            )

        # 4. Verify service relationship
        if str(booking.service_id) != str(service.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The specified booking reservation does not correspond to this experience listing.",
            )

        # 5. Verify booking completion eligibility
        if booking.status != "COMPLETED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only completed bookings can be reviewed. Current booking status is '{booking.status}'.",
            )

        # 6. Idempotency: Enforce one review per booking
        existing_review = ServiceRepository.get_review_by_booking_id(db, str(booking.id))
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A review has already been submitted for this booking reservation.",
            )

        # 7. Validate rating
        if req.rating < 1.0 or req.rating > 5.0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Rating score must be between 1.0 and 5.0 stars.",
            )

        # 8. Create Review Record
        user_display_name = current_user.full_name or "Verified Traveler"
        review = ServiceRepository.add_review(
            db,
            service_id=service.id,
            booking_id=booking.id,
            user_id=current_user.id,
            user_name=user_display_name,
            rating=float(req.rating),
            comment=req.comment.strip(),
            is_verified=True,
            status="PUBLISHED",
        )

        # 9. Recalculate authoritative aggregate rating and count
        ServiceRepository.recalculate_service_rating(db, str(service.id))

        return cls._to_review_response(review)

    @classmethod
    def search_services(
        cls,
        db: Session,
        query: str = "",
        category: Optional[str] = None,
        location: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        page: int = 1,
        limit: int = 12,
    ) -> SearchResponse:
        """Search published services catalog using the unified pgvector Semantic Search Pipeline."""
        from app.services.search import SemanticSearchService

        items, total = SemanticSearchService.semantic_search(
            db,
            query=query,
            category=category,
            location=location,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
            page=page,
            limit=limit,
            status="PUBLISHED",
        )

        return SearchResponse(
            query=query,
            results=[cls._to_service_response(s, db=db) for s in items],
            total=total,
            page=page,
            limit=limit,
        )

    @classmethod
    def get_search_suggestions(cls, db: Session, query: str = "") -> SearchSuggestionsResponse:
        """Fetch debounced autocomplete suggestions."""
        items = ServiceRepository.get_suggestions(db, query)
        suggestions = [SearchSuggestionItem(**item) for item in items]
        return SearchSuggestionsResponse(query=query, suggestions=suggestions)

    @classmethod
    def get_service_availability(
        cls,
        db: Session,
        service_id: str,
        month: Optional[int] = None,
        year: Optional[int] = None,
    ) -> ServiceAvailabilityResponse:
        """Fetch authoritative availability calendar and slot matrix for a service."""
        service = ServiceRepository.get_by_id(db, service_id)
        if not service:
            service = ServiceRepository.get_by_slug(db, service_id)

        if not service or service.status != "PUBLISHED":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service with ID '{service_id}' was not found or is unavailable.",
            )

        # Booking model determination
        category_slug = (service.category_slug or "").lower()
        if category_slug == "stay":
            booking_model = "date_range"
        elif category_slug in ["experiences", "guides-tours", "workshops", "farm", "adventure", "tour", "food", "wildlife", "water-sports"] or (service.category and ("experience" in service.category.lower() or "tour" in service.category.lower())):
            booking_model = "time_slot"
        else:
            booking_model = "single_date"

        today = date.today()
        num_days = 60
        days_list: List[DayAvailabilityItem] = []
        blackout_dates: List[str] = []

        max_cap = service.max_capacity or 10

        # Query existing CONFIRMED and PENDING bookings within this horizon
        from app.models.booking import Booking
        active_bookings = db.query(Booking).filter(
            Booking.service_id == service.id,
            Booking.status.in_(["PENDING", "CONFIRMED"]),
        ).all()

        # Map booked quantities per date and per slot
        booked_by_date: dict = {}
        booked_by_slot: dict = {}
        for b in active_bookings:
            if b.start_date:
                # b.start_date can be datetime or string
                d_str = b.start_date.strftime("%Y-%m-%d") if hasattr(b.start_date, "strftime") else str(b.start_date)[:10]
                booked_by_date[d_str] = booked_by_date.get(d_str, 0) + (b.guest_count or 1)
            if b.time_slot_id:
                booked_by_slot[b.time_slot_id] = booked_by_slot.get(b.time_slot_id, 0) + (b.guest_count or 1)

        for i in range(num_days):
            current_date = today + timedelta(days=i)
            date_str = current_date.strftime("%Y-%m-%d")
            weekday = current_date.weekday()  # 0=Monday, 6=Sunday

            # Rule: Periodic maintenance blackout days for certain farms
            is_blackout = (weekday == 1 and i >= 14 and i % 14 == 1)
            if is_blackout:
                blackout_dates.append(date_str)
                days_list.append(
                    DayAvailabilityItem(
                        date=date_str,
                        is_available=False,
                        status="BLACKOUT",
                        remaining_capacity=0,
                        time_slots=[],
                    )
                )
                continue

            # Base capacity and status calculation
            if i % 7 == 5 or i % 7 == 6:  # Weekends
                base_cap = max(1, max_cap // 3)
            elif i % 10 == 0:
                base_cap = 0
            else:
                base_cap = max_cap

            # Deduct actual active bookings for this date
            booked_count = booked_by_date.get(date_str, 0)
            rem_cap = max(0, base_cap - booked_count)

            if rem_cap == 0:
                status_str = "UNAVAILABLE"
            elif rem_cap <= max(1, max_cap // 4):
                status_str = "LIMITED"
            else:
                status_str = "AVAILABLE"

            is_available = rem_cap > 0 and status_str != "UNAVAILABLE"

            # Slot generation for time_slot services
            time_slots: List[TimeSlotItem] = []
            if booking_model in ["time_slot", "single_date"]:
                slots_template = [
                    {"id": f"{date_str}-slot-1", "start_time": "09:00 AM", "end_time": "12:30 PM", "capacity": max_cap},
                    {"id": f"{date_str}-slot-2", "start_time": "02:00 PM", "end_time": "05:30 PM", "capacity": max_cap},
                ]
                if category_slug in ["stay", "food", "events"]:
                    slots_template.append(
                        {"id": f"{date_str}-slot-3", "start_time": "06:30 PM", "end_time": "09:00 PM", "capacity": max_cap}
                    )

                for slot_t in slots_template:
                    slot_booked = booked_by_slot.get(slot_t["id"], 0)
                    slot_base_rem = max(0, slot_t["capacity"] - (i % 3) * 2) if is_available else 0
                    slot_rem = max(0, min(slot_base_rem - slot_booked, rem_cap))
                    time_slots.append(
                        TimeSlotItem(
                            id=slot_t["id"],
                            start_time=slot_t["start_time"],
                            end_time=slot_t["end_time"],
                            is_available=slot_rem > 0 and is_available,
                            capacity=slot_t["capacity"],
                            remaining_capacity=slot_rem,
                        )
                    )

            days_list.append(
                DayAvailabilityItem(
                    date=date_str,
                    is_available=is_available,
                    status=status_str,
                    remaining_capacity=rem_cap,
                    time_slots=time_slots,
                )
            )

        return ServiceAvailabilityResponse(
            service_id=str(service.id),
            service_title=service.title,
            booking_model=booking_model,
            min_guests=1,
            max_guests=service.max_capacity or 10,
            min_days_notice=1,
            max_days_advance=60,
            start_date=today.strftime("%Y-%m-%d"),
            end_date=(today + timedelta(days=num_days - 1)).strftime("%Y-%m-%d"),
            days=days_list,
            blackout_dates=blackout_dates,
        )

    @classmethod
    def ensure_seeded(cls, db: Session) -> None:
        """Seed permanent reference taxonomy categories if empty."""
        try:
            from app.models.category import MarketplaceCategory
            # Ensure the 10 permanent reference categories exist
            cat_count = db.query(MarketplaceCategory).count()
            if cat_count < 10:
                SEED_CATEGORIES = [
                    {"id": uuid.UUID("c0000001-0000-0000-0000-000000000001"), "slug": "farm", "name": "Farm Tours & Experiences", "marketplace_type": "ACTIVITY", "icon": "sprout", "description": "Hands-on agro-tours, harvest experiences, plantation walks, and rural life workshops.", "sort_order": 1},
                    {"id": uuid.UUID("c0000001-0000-0000-0000-000000000002"), "slug": "adventure", "name": "Adventure & Trekking", "marketplace_type": "ACTIVITY", "icon": "mountain", "description": "Western Ghats peak trekking, coffee estate night camping, forest trails, and off-road expeditions.", "sort_order": 2},
                    {"id": uuid.UUID("c0000001-0000-0000-0000-000000000003"), "slug": "water-sports", "name": "Water Sports & Activities", "marketplace_type": "ACTIVITY", "icon": "waves", "description": "Kayaking, river rafting, coracle rides, and coastal aquatic adventures.", "sort_order": 3},
                    {"id": uuid.UUID("c0000001-0000-0000-0000-000000000004"), "slug": "wildlife", "name": "Wildlife Tours", "marketplace_type": "ACTIVITY", "icon": "paw-print", "description": "Guided jungle safaris, bird-watching trails, reptile walks, and sanctuary explorations.", "sort_order": 4},
                    {"id": uuid.UUID("c0000001-0000-0000-0000-000000000005"), "slug": "food", "name": "Food Tours & Cooking", "marketplace_type": "ACTIVITY", "icon": "utensils", "description": "Authentic regional culinary walks, farm-to-table dining, and traditional cooking workshops.", "sort_order": 5},
                    {"id": uuid.UUID("c0000001-0000-0000-0000-000000000006"), "slug": "cultural-historical", "name": "Cultural & Historical Tours", "marketplace_type": "ACTIVITY", "icon": "landmark", "description": "Ancient temple trails, traditional crafts, folklore performances, and heritage explorations.", "sort_order": 6},
                    {"id": uuid.UUID("c0000001-0000-0000-0000-000000000007"), "slug": "photography", "name": "Photography", "marketplace_type": "CONTENT_CREATOR", "icon": "camera", "description": "High-res estate, resort & farm photo shoots and portrait storytelling.", "sort_order": 7},
                    {"id": uuid.UUID("c0000001-0000-0000-0000-000000000008"), "slug": "videography", "name": "Videography", "marketplace_type": "CONTENT_CREATOR", "icon": "video", "description": "Cinematic promotional films, brand documentaries, and storytelling productions.", "sort_order": 8},
                    {"id": uuid.UUID("c0000001-0000-0000-0000-000000000009"), "slug": "drone-aerial", "name": "Drone & Aerial", "marketplace_type": "CONTENT_CREATOR", "icon": "navigation", "description": "4K aerial estate mapping, land elevation footage, and drone cinematography.", "sort_order": 9},
                    {"id": uuid.UUID("c0000001-0000-0000-0000-000000000010"), "slug": "travel-reels", "name": "Travel Reels", "marketplace_type": "CONTENT_CREATOR", "icon": "sparkles", "description": "Dynamic short-form reels for Instagram, YouTube Shorts, and travel campaigns.", "sort_order": 10},
                ]
                for cat_dict in SEED_CATEGORIES:
                    existing_c = db.query(MarketplaceCategory).filter(MarketplaceCategory.slug == cat_dict["slug"]).first()
                    if not existing_c:
                        db.add(MarketplaceCategory(**cat_dict))
                db.commit()
        except Exception:
            db.rollback()

    @classmethod
    def create_partner_service(
        cls,
        db: Session,
        provider: User,
        payload: ServiceCreatePayload,
    ) -> ServiceResponse:
        """Create a new service listing under the authenticated provider's account."""

        # Enforce that blocked/inactive providers cannot create services
        if not provider.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Blocked or suspended provider accounts cannot create service listings.",
            )

        slug_base = payload.title.lower().replace(" ", "-").replace("/", "-")
        # Remove any non-alphanumeric chars except dashes
        slug_clean = "".join(c for c in slug_base if c.isalnum() or c == "-")
        unique_slug = f"{slug_clean}-{uuid.uuid4().hex[:6]}"

        cat_slug = payload.category_slug or payload.category.lower().replace(" ", "-")
        primary_img = payload.primary_image or (
            payload.images[0] if payload.images else "/images/services/default-experience.jpg"
        )

        # Resolve category_id and marketplace_type
        from app.models.category import MarketplaceCategory
        category_id = None
        marketplace_type = payload.marketplace_type or "ACTIVITY"
        if payload.category_id:
            category_id = payload.category_id
            cat_obj = db.query(MarketplaceCategory).filter(MarketplaceCategory.id == payload.category_id).first()
            if cat_obj:
                marketplace_type = cat_obj.marketplace_type
        else:
            cat_obj = db.query(MarketplaceCategory).filter(
                (MarketplaceCategory.slug == cat_slug) | (MarketplaceCategory.name.ilike(f"%{payload.category}%"))
            ).first()
            if cat_obj:
                category_id = cat_obj.id
                marketplace_type = cat_obj.marketplace_type

        service = Service(
            title=payload.title,
            slug=unique_slug,
            description=payload.description,
            category=payload.category,
            category_slug=cat_slug,
            category_id=category_id,
            marketplace_type=marketplace_type,
            location=payload.location,
            district=payload.district or payload.location.split(",")[0].strip(),
            state=payload.state or "Karnataka",
            latitude=payload.latitude,
            longitude=payload.longitude,
            formatted_address=payload.formatted_address,
            price=payload.price,
            unit=payload.unit or "night",
            duration_hours=payload.duration_hours,
            max_capacity=payload.max_capacity or 10,
            rating=5.0,
            reviews_count=0,
            is_verified=provider.is_verified,
            status="PENDING",  # Always start as PENDING for moderation
            provider_id=provider.id,
            provider_name=provider.full_name,
            provider_type=provider.role.capitalize(),
            provider_avatar=provider.avatar_url,
            primary_image=primary_img,
            images_json=json.dumps(payload.images),
            inclusions_json=json.dumps(payload.inclusions),
            amenities_json=json.dumps(payload.amenities),
        )
        # Generate initial embedding
        try:
            from app.services.embedding import EmbeddingService
            from app.services.redis_service import RedisService
            search_text = EmbeddingService.build_searchable_text(service)
            emb = EmbeddingService.generate_embedding(search_text)
            service.embedding = emb
        except Exception:
            pass

        db.add(service)
        db.commit()
        db.refresh(service)

        try:
            if service.embedding is not None:
                from app.services.redis_service import RedisService
                RedisService.set(f"service_embedding:{service.id}", list(service.embedding))
        except Exception:
            pass

        # Notify provider
        try:
            NotificationService.create_notification(
                db,
                user_id=provider.id,
                title="Service Submitted for Review",
                message=f"Your service listing '{service.title}' has been submitted and is pending administrative review.",
                type="service",
                resource_type="service",
                resource_id=str(service.id),
            )
        except Exception:
            pass

        # Notify admins
        try:
            admins = db.query(User).filter(User.role == "admin").all()
            for adm in admins:
                NotificationService.create_notification(
                    db,
                    user_id=adm.id,
                    title="New Service Listing",
                    message=f"{provider.full_name} submitted '{service.title}' for moderation.",
                    type="admin",
                    resource_type="service",
                    resource_id=str(service.id),
                )
        except Exception:
            pass

        return cls._to_service_response(service, db=db)

    @classmethod
    def list_partner_services(
        cls,
        db: Session,
        provider_id: Any,
    ) -> List[ServiceResponse]:
        """List all services owned by the authenticated provider."""
        cls.ensure_seeded(db)
        # Match both UUID and string provider_id
        services = (
            db.query(Service)
            .filter((Service.provider_id == provider_id) | (Service.provider_id == str(provider_id)))
            .order_by(Service.created_at.desc())
            .all()
        )
        return [cls._to_service_response(s, db=db) for s in services]

    @classmethod
    def get_partner_service_by_id(
        cls,
        db: Session,
        provider_id: Any,
        service_id: str,
    ) -> ServiceResponse:
        """Fetch a specific service listing owned by the authenticated provider."""
        cls.ensure_seeded(db)
        service = db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service with ID '{service_id}' not found.")
        if str(service.provider_id) != str(provider_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view or edit this service listing.",
            )
        return cls._to_service_response(service, db=db)

    @classmethod
    def update_partner_service(
        cls,
        db: Session,
        provider_id: Any,
        service_id: str,
        payload: ServiceUpdatePayload,
    ) -> ServiceResponse:
        """Update an existing service listing owned by the authenticated provider."""
        cls.ensure_seeded(db)
        provider = db.query(User).filter(User.id == provider_id).first()
        if not provider or not provider.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Provider account is inactive or blocked.")

        service = db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service with ID '{service_id}' not found.")
        if str(service.provider_id) != str(provider_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to modify this service listing.",
            )

        if payload.title is not None:
            service.title = payload.title
        if payload.description is not None:
            service.description = payload.description
        if payload.category is not None:
            service.category = payload.category
            service.category_slug = payload.category_slug or payload.category.lower().replace(" ", "-")
        if payload.category_id is not None:
            service.category_id = payload.category_id
        if payload.marketplace_type is not None:
            service.marketplace_type = payload.marketplace_type
        if payload.location is not None:
            service.location = payload.location
        if payload.district is not None:
            service.district = payload.district
        if payload.state is not None:
            service.state = payload.state
        if payload.latitude is not None:
            service.latitude = payload.latitude
        if payload.longitude is not None:
            service.longitude = payload.longitude
        if payload.formatted_address is not None:
            service.formatted_address = payload.formatted_address
        if payload.price is not None:
            service.price = payload.price
        if payload.unit is not None:
            service.unit = payload.unit
        if payload.duration_hours is not None:
            service.duration_hours = payload.duration_hours
        if payload.max_capacity is not None:
            service.max_capacity = payload.max_capacity
        if payload.primary_image is not None:
            service.primary_image = payload.primary_image
        if payload.images is not None:
            service.images_json = json.dumps(payload.images)
        if payload.inclusions is not None:
            service.inclusions_json = json.dumps(payload.inclusions)
        if payload.amenities is not None:
            service.amenities_json = json.dumps(payload.amenities)

        # If rejected, resubmission or editing resets status to PENDING
        if service.status in ["REJECTED", "DRAFT"]:
            service.status = "PENDING"
            service.rejection_reason = None
            service.reviewed_by = None
            service.reviewed_at = None

        # Trigger translation staleness and async regeneration if title or description updated
        if payload.title is not None or payload.description is not None:
            try:
                from app.services.translation import TranslationService
                stale_fields = {}
                if payload.title is not None:
                    stale_fields["title"] = payload.title
                if payload.description is not None:
                    stale_fields["description"] = payload.description
                TranslationService.mark_stale_and_translate_async(
                    db=db,
                    resource_type="service",
                    resource_id=str(service.id),
                    fields=stale_fields,
                )
            except Exception as t_err:
                logger.warning(f"Failed to trigger service translation update: {t_err}")

        # Refresh embedding upon content update
        try:
            from app.services.embedding import EmbeddingService
            from app.services.redis_service import RedisService
            search_text = EmbeddingService.build_searchable_text(service)
            emb = EmbeddingService.generate_embedding(search_text)
            service.embedding = emb
            RedisService.set(f"service_embedding:{service.id}", list(emb))
        except Exception:
            pass

        db.commit()
        db.refresh(service)
        return cls._to_service_response(service, db=db)

    @classmethod
    def submit_partner_service_for_review(
        cls,
        db: Session,
        provider_id: uuid.UUID,
        service_id: str,
    ) -> ServiceResponse:
        """Transition service listing status to PENDING for admin moderation."""
        cls.ensure_seeded(db)
        provider = db.query(User).filter(User.id == provider_id).first()
        if not provider or not provider.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Provider account is inactive or blocked.")

        service = db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service with ID '{service_id}' not found.")
        if str(service.provider_id) != str(provider_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to submit this service listing.",
            )

        service.status = "PENDING"
        service.rejection_reason = None
        service.reviewed_by = None
        service.reviewed_at = None
        db.commit()
        db.refresh(service)

        try:
            NotificationService.create_notification(
                db,
                user_id=provider.id,
                title="Service Submitted for Review",
                message=f"Your service listing '{service.title}' has been submitted and is pending administrative review.",
                type="service",
                resource_type="service",
                resource_id=str(service.id),
            )
            # Notify admins of pending service listing
            admins = db.query(User).filter(User.role == "admin").all()
            for admin in admins:
                NotificationService.create_notification(
                    db,
                    user_id=admin.id,
                    title="New Service Awaiting Review",
                    message=f"Provider '{provider.full_name}' submitted '{service.title}' for review.",
                    type="admin",
                    resource_type="service",
                    resource_id=str(service.id),
                )
        except Exception:
            pass

        return cls._to_service_response(service, db=db)

