"""Marketplace Domain Service for Services, Search, Catalog, and Availability Management."""

import json
import uuid
import math
from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple
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
)


class MarketplaceService:
    """Business logic for Marketplace Discovery, Search, and Availability."""

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

        try:
            amenities = json.loads(s.amenities_json) if s.amenities_json else []
        except Exception:
            amenities = []

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
            location=s.location,
            district=s.district,
            state=s.state,
            latitude=s.latitude,
            longitude=s.longitude,
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
    ) -> ServiceListResponse:
        """List services with database seeding fallback."""
        cls.ensure_seeded(db)

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
        cls.ensure_seeded(db)

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
        cls.ensure_seeded(db)
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
        cls.ensure_seeded(db)

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
        cls.ensure_seeded(db)
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
        cls.ensure_seeded(db)
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
        cls.ensure_seeded(db)

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
        elif category_slug in ["experiences", "guides-tours", "workshops"]:
            booking_model = "time_slot"
        else:
            booking_model = "single_date"

        today = date.today()
        num_days = 60
        days_list: List[DayAvailabilityItem] = []
        blackout_dates: List[str] = []

        max_cap = service.max_capacity or 10

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

            # Capacity and status simulation
            if i % 7 == 5 or i % 7 == 6:  # Weekends
                status_str = "LIMITED"
                rem_cap = max(1, max_cap // 3)
            elif i % 10 == 0:
                status_str = "UNAVAILABLE"
                rem_cap = 0
            else:
                status_str = "AVAILABLE"
                rem_cap = max_cap

            is_available = rem_cap > 0 and status_str != "UNAVAILABLE"

            # Slot generation for time_slot services
            time_slots: List[TimeSlotItem] = []
            if booking_model in ["time_slot", "single_date"] and is_available:
                slots_template = [
                    {"id": f"{date_str}-slot-1", "start_time": "09:00 AM", "end_time": "12:30 PM", "capacity": max_cap},
                    {"id": f"{date_str}-slot-2", "start_time": "02:00 PM", "end_time": "05:30 PM", "capacity": max_cap},
                ]
                if category_slug in ["stay", "food", "events"]:
                    slots_template.append(
                        {"id": f"{date_str}-slot-3", "start_time": "06:30 PM", "end_time": "09:00 PM", "capacity": max_cap}
                    )

                for slot_t in slots_template:
                    slot_rem = max(0, slot_t["capacity"] - (i % 3) * 2)
                    time_slots.append(
                        TimeSlotItem(
                            id=slot_t["id"],
                            start_time=slot_t["start_time"],
                            end_time=slot_t["end_time"],
                            is_available=slot_rem > 0,
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
        """Seed initial authoritative verified agricultural catalog if empty."""
        if ServiceRepository.count(db) > 0:
            return

        catalog_seeds = [
            {
                "title": "Heritage Coffee Estate Homestay & Cupping Trail",
                "slug": "coorg-heritage-coffee-estate",
                "description": "Stay in a century-old British colonial planter's bungalow surrounded by organic Arabica plantations. Includes guided botanical walks, bean roasting workshops, and authentic Coorg Kodava family dinners.",
                "category": "Stay",
                "category_slug": "stay",
                "location": "Madikeri, Coorg, Karnataka",
                "district": "Coorg",
                "state": "Karnataka",
                "price": 2800.0,
                "unit": "night",
                "duration_hours": 24.0,
                "max_capacity": 6,
                "rating": 4.92,
                "reviews_count": 34,
                "is_verified": True,
                "status": "PUBLISHED",
                "provider_name": "Bopaiah & Kaveri Muthappa",
                "provider_type": "Farmer / Plantation Host",
                "primary_image": "/images/services/coffee-estate.jpg",
                "images_json": json.dumps([
                    "/images/services/coffee-estate.jpg",
                    "/images/services/coffee-roasting.jpg",
                    "/images/services/coorg-bungalow.jpg"
                ]),
                "inclusions_json": json.dumps([
                    "Traditional Kodava Breakfast (Akki Rotti & Honey)",
                    "Guided 3-hour Plantation Trail with Estate Botanist",
                    "Coffee Cupping & Fresh Bean Roasting Session",
                    "Bonfire Evening with Estate Spices"
                ]),
                "amenities_json": json.dumps([
                    "High-Speed Wi-Fi", "Solar Heated Water", "Organic Home Dining", "Free On-Site Parking", "Child-Friendly Estate"
                ]),
            },
            {
                "title": "Cardamom & Black Pepper Canopy Trail",
                "slug": "wayanad-spice-canopy-trail",
                "description": "Join certified agricultural naturalists across an 80-acre biodynamic spice estate. Learn to hand-pick Malabar green cardamom, identify black pepper vines, and harvest raw wild forest honey.",
                "category": "Guides & Tours",
                "category_slug": "guides-tours",
                "location": "Meppadi, Wayanad, Kerala",
                "district": "Wayanad",
                "state": "Kerala",
                "price": 650.0,
                "unit": "person",
                "duration_hours": 3.5,
                "max_capacity": 12,
                "rating": 4.88,
                "reviews_count": 28,
                "is_verified": True,
                "status": "PUBLISHED",
                "provider_name": "Devasia Thomas",
                "provider_type": "Guide & Naturalist",
                "primary_image": "/images/services/spice-trail.jpg",
                "images_json": json.dumps([
                    "/images/services/spice-trail.jpg",
                    "/images/services/cardamom-harvest.jpg"
                ]),
                "inclusions_json": json.dumps([
                    "Guided Estate Walk with Naturalist",
                    "Fresh Spice Tasting & Sample Pouch",
                    "Herbal Tea Refreshment with Jaggery"
                ]),
                "amenities_json": json.dumps([
                    "Walking Sticks Provided", "Drinking Water Refills", "First Aid Onsite"
                ]),
            },
            {
                "title": "Traditional Paddy Transplanting & Clay Pottery",
                "slug": "chikmagalur-paddy-pottery-workshop",
                "description": "Immerse yourself in traditional soil arts. Experience barefoot paddy sapling transplanting in organic wetlands followed by hands-on wheel throwing with master village potters.",
                "category": "Experiences",
                "category_slug": "experiences",
                "location": "Mudigere, Chikmagalur, Karnataka",
                "district": "Chikmagalur",
                "state": "Karnataka",
                "price": 850.0,
                "unit": "person",
                "duration_hours": 4.0,
                "max_capacity": 15,
                "rating": 4.95,
                "reviews_count": 42,
                "is_verified": True,
                "status": "PUBLISHED",
                "provider_name": "Kencharayappa Village Cooperative",
                "provider_type": "Rural Artisan Guild",
                "primary_image": "/images/services/paddy-workshop.jpg",
                "images_json": json.dumps([
                    "/images/services/paddy-workshop.jpg",
                    "/images/services/clay-pottery.jpg"
                ]),
                "inclusions_json": json.dumps([
                    "Hands-on Paddy Sowing Activity",
                    "Take-home Terracotta Pot Crafted by You",
                    "Banana Leaf Malnad Lunch"
                ]),
                "amenities_json": json.dumps([
                    "Washrooms & Showers", "Protective Aprons", "Drinking Water"
                ]),
            },
            {
                "title": "4x4 Western Ghats Plantation Shuttle & Ridge Safari",
                "slug": "sakleshpur-4x4-estate-jeep-transit",
                "description": "Private 4x4 rugged Jeep transport traversing steep coffee ridges, stream crossings, and remote forest trails. Ideal for hill station transit and photography excursions.",
                "category": "Travel Services",
                "category_slug": "travel-services",
                "location": "Hanbal, Sakleshpur, Karnataka",
                "district": "Sakleshpur",
                "state": "Karnataka",
                "price": 2200.0,
                "unit": "tour",
                "duration_hours": 3.0,
                "max_capacity": 6,
                "rating": 4.79,
                "reviews_count": 19,
                "is_verified": True,
                "status": "PUBLISHED",
                "provider_name": "Manju Kumar 4x4 Adventures",
                "provider_type": "Travel / Driver Host",
                "primary_image": "/images/services/4x4-jeep.jpg",
                "images_json": json.dumps([
                    "/images/services/4x4-jeep.jpg",
                    "/images/services/ridge-view.jpg"
                ]),
                "inclusions_json": json.dumps([
                    "Private 4x4 Vehicle & Veteran Estate Driver",
                    "Sunset Ridge Point Halt",
                    "Luggage Transfer Assistance"
                ]),
                "amenities_json": json.dumps([
                    "Roof Rack", "All-Weather Tarpaulin", "Emergency Tool Kit"
                ]),
            },
            {
                "title": "Malnad Wood-Fired Feast & Organic Farm Dining",
                "slug": "thirthahalli-malnad-farm-dining",
                "description": "Authentic multi-course lunch served in an ancestral areca-nut farm kitchen. Prepared using heirloom rice varieties, freshly pressed coconut milk, wild greens, and wood-fired earthen pots.",
                "category": "Food & Dining",
                "category_slug": "food",
                "location": "Thirthahalli, Shimoga, Karnataka",
                "district": "Shimoga",
                "state": "Karnataka",
                "price": 550.0,
                "unit": "person",
                "duration_hours": 2.0,
                "max_capacity": 20,
                "rating": 4.96,
                "reviews_count": 51,
                "is_verified": True,
                "status": "PUBLISHED",
                "provider_name": "Subhadra Hegde Farm Kitchen",
                "provider_type": "Homestay Host",
                "primary_image": "/images/services/farm-food.jpg",
                "images_json": json.dumps([
                    "/images/services/farm-food.jpg",
                    "/images/services/woodfired-kitchen.jpg"
                ]),
                "inclusions_json": json.dumps([
                    "7-Course Seasonal Malnad Feast",
                    "Fresh Sugarcane & Ginger Juice",
                    "Arecanut Farm Tour"
                ]),
                "amenities_json": json.dumps([
                    "Traditional Floor Seating & Dining Tables", "Hand Wash Area", "Pure Well Water"
                ]),
            },
            {
                "title": "Baisakhi & Sugarcane Harvest Community Fair",
                "slug": "mandya-sugarcane-harvest-fair",
                "description": "Annual community festival celebrating seasonal jaggery crushing, bullock cart rides, local folk dance (Veeragase), and open-air agro-crafts exhibition.",
                "category": "Events",
                "category_slug": "events",
                "location": "Maddur, Mandya, Karnataka",
                "district": "Mandya",
                "state": "Karnataka",
                "price": 400.0,
                "unit": "session",
                "duration_hours": 6.0,
                "max_capacity": 50,
                "rating": 4.85,
                "reviews_count": 22,
                "is_verified": True,
                "status": "PUBLISHED",
                "provider_name": "Mandya Organic Farmers Guild",
                "provider_type": "Farmer Cooperative",
                "primary_image": "/images/services/harvest-festival.jpg",
                "images_json": json.dumps([
                    "/images/services/harvest-festival.jpg",
                    "/images/services/jaggery-making.jpg"
                ]),
                "inclusions_json": json.dumps([
                    "Festival Entry & Folk Performance Access",
                    "Fresh Warm Jaggery Tasting",
                    "Bullock Cart Village Tour"
                ]),
                "amenities_json": json.dumps([
                    "Rest Areas", "First Aid Center", "Local Souvenir Stalls"
                ]),
            },
        ]

        for s_data in catalog_seeds:
            service = ServiceRepository.create(db, **s_data)
            # Add sample reviews
            ServiceRepository.add_review(
                db,
                service_id=service.id,
                user_name="Ananya Sharma",
                rating=5.0,
                comment="Unforgettable experience! The hosts were exceedingly warm and the plantation knowledge was truly inspiring.",
            )
            ServiceRepository.add_review(
                db,
                service_id=service.id,
                user_name="Vikramaditya Rao",
                rating=4.8,
                comment="Outstanding authentic farm food and clean amenities. Will definitely book again with family.",
            )

    @classmethod
    def create_partner_service(
        cls,
        db: Session,
        provider: User,
        payload: ServiceCreatePayload,
    ) -> ServiceResponse:
        """Create a new service listing under the authenticated provider's account."""
        cls.ensure_seeded(db)

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

        service = Service(
            title=payload.title,
            slug=unique_slug,
            description=payload.description,
            category=payload.category,
            category_slug=cat_slug,
            location=payload.location,
            district=payload.district or payload.location.split(",")[0].strip(),
            state=payload.state or "Karnataka",
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
        db.add(service)
        db.commit()
        db.refresh(service)

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
        provider_id: uuid.UUID,
    ) -> List[ServiceResponse]:
        """List all services owned by the authenticated provider."""
        cls.ensure_seeded(db)
        services = db.query(Service).filter(Service.provider_id == provider_id).order_by(Service.created_at.desc()).all()
        return [cls._to_service_response(s, db=db) for s in services]

    @classmethod
    def get_partner_service_by_id(
        cls,
        db: Session,
        provider_id: uuid.UUID,
        service_id: str,
    ) -> ServiceResponse:
        """Fetch a specific service listing owned by the authenticated provider."""
        cls.ensure_seeded(db)
        service = db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service with ID '{service_id}' not found.")
        if service.provider_id != provider_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view or edit this service listing.",
            )
        return cls._to_service_response(service, db=db)

    @classmethod
    def update_partner_service(
        cls,
        db: Session,
        provider_id: uuid.UUID,
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
        if service.provider_id != provider_id:
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
        if payload.location is not None:
            service.location = payload.location
        if payload.district is not None:
            service.district = payload.district
        if payload.state is not None:
            service.state = payload.state
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
        if service.provider_id != provider_id:
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
        except Exception:
            pass

        return cls._to_service_response(service, db=db)

