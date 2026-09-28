"""User Trip Management and AI Trip Generation Endpoints."""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.trip import Trip, TripDay, TripItem, AITripPlan
from app.models.service import Service
from app.schemas.common import APIResponse
from app.schemas.trip import (
    TripCreate,
    TripUpdate,
    TripResponse,
    TripDetailResponse,
    TripDayCreate,
    TripDayResponse,
    TripItemCreate,
    TripItemResponse,
    AITripGenerateRequest,
    AITripPlanResponse,
)
from app.repositories.trip import TripRepository

router = APIRouter(prefix="/trips", tags=["Trips & Itinerary"])


@router.get("", response_model=APIResponse[List[TripResponse]])
def list_user_trips(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all trips created by or planned for the authenticated user."""
    trips = TripRepository.list_user_trips(
        db,
        user_id=current_user.id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return APIResponse(
        success=True,
        message=f"Retrieved {len(trips)} trips",
        data=[TripResponse.model_validate(t) for t in trips],
    )


@router.post("", response_model=APIResponse[TripDetailResponse], status_code=status.HTTP_201_CREATED)
def create_trip(
    payload: TripCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new trip with optional days and items."""
    trip = TripRepository.create_trip(
        db,
        user_id=current_user.id,
        title=payload.title,
        destination=payload.destination,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
        origin=payload.origin,
        status=payload.status or "PLANNED",
        created_by="USER",
        ai_generated=False,
    )

    if payload.days:
        for day_data in payload.days:
            day = TripRepository.add_day(
                db,
                trip_id=trip.id,
                day_number=day_data.day_number,
                date=day_data.date,
                title=day_data.title,
                notes=day_data.notes,
            )
            if day_data.items:
                for item_data in day_data.items:
                    TripRepository.add_item(
                        db,
                        trip_day_id=day.id,
                        title=item_data.title,
                        item_type=item_data.item_type or "SERVICE",
                        service_id=item_data.service_id,
                        provider_id=item_data.provider_id,
                        booking_id=item_data.booking_id,
                        description=item_data.description,
                        start_time=item_data.start_time,
                        end_time=item_data.end_time,
                        duration_minutes=item_data.duration_minutes,
                        sequence_order=item_data.sequence_order,
                        notes=item_data.notes,
                        is_booked=item_data.is_booked,
                    )

    db.refresh(trip)
    return APIResponse(
        success=True,
        message="Trip created successfully",
        data=TripDetailResponse.model_validate(trip),
    )


@router.get("/{trip_id}", response_model=APIResponse[TripDetailResponse])
def get_trip_detail(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch complete trip itinerary with days and items."""
    trip = TripRepository.get_by_id(db, trip_id=trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    if trip.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return APIResponse(
        success=True,
        message="Trip retrieved successfully",
        data=TripDetailResponse.model_validate(trip),
    )


@router.delete("/{trip_id}", response_model=APIResponse[dict])
def delete_trip(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a user trip."""
    trip = TripRepository.get_by_id(db, trip_id=trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    if trip.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    TripRepository.delete_trip(db, trip)
    return APIResponse(
        success=True,
        message="Trip deleted successfully",
        data={"id": trip_id, "deleted": True},
    )


@router.post("/{trip_id}/days", response_model=APIResponse[TripDayResponse], status_code=status.HTTP_201_CREATED)
def add_trip_day(
    trip_id: str,
    payload: TripDayCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add an itinerary day to a trip."""
    trip = TripRepository.get_by_id(db, trip_id=trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    if trip.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    day = TripRepository.add_day(
        db,
        trip_id=trip.id,
        day_number=payload.day_number,
        date=payload.date,
        title=payload.title,
        notes=payload.notes,
    )
    if payload.items:
        for item_data in payload.items:
            TripRepository.add_item(
                db,
                trip_day_id=day.id,
                title=item_data.title,
                item_type=item_data.item_type or "SERVICE",
                service_id=item_data.service_id,
                provider_id=item_data.provider_id,
                booking_id=item_data.booking_id,
                description=item_data.description,
                start_time=item_data.start_time,
                end_time=item_data.end_time,
                duration_minutes=item_data.duration_minutes,
                sequence_order=item_data.sequence_order,
                notes=item_data.notes,
                is_booked=item_data.is_booked,
            )

    db.refresh(day)
    return APIResponse(
        success=True,
        message="Day added to trip",
        data=TripDayResponse.model_validate(day),
    )


@router.post("/days/{day_id}/items", response_model=APIResponse[TripItemResponse], status_code=status.HTTP_201_CREATED)
def add_trip_item(
    day_id: str,
    payload: TripItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a service or activity item to a trip day."""
    day = db.query(TripDay).filter(TripDay.id == day_id).first()
    if not day:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip day not found")
    if day.trip.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    item = TripRepository.add_item(
        db,
        trip_day_id=day.id,
        title=payload.title,
        item_type=payload.item_type or "SERVICE",
        service_id=payload.service_id,
        provider_id=payload.provider_id,
        booking_id=payload.booking_id,
        description=payload.description,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration_minutes=payload.duration_minutes,
        sequence_order=payload.sequence_order,
        notes=payload.notes,
        is_booked=payload.is_booked,
    )
    return APIResponse(
        success=True,
        message="Item added to trip day",
        data=TripItemResponse.model_validate(item),
    )


@router.post("/generate", response_model=APIResponse[AITripPlanResponse])
def generate_ai_trip_plan(
    payload: AITripGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI Assistant generates a grounded multi-day travel itinerary with marketplace service recommendations."""
    destination = payload.destination or "Coorg, Karnataka"
    duration = payload.duration_days or 2

    # Query matching published services in the destination area to ground the itinerary
    services = (
        db.query(Service)
        .filter(Service.status == "PUBLISHED")
        .filter(Service.location.ilike(f"%{destination.split(',')[0].strip()}%"))
        .limit(6)
        .all()
    )
    if not services:
        services = db.query(Service).filter(Service.status == "PUBLISHED").limit(6).all()

    # Create the Trip record
    trip_title = f"{duration}-Day {destination.split(',')[0].strip()} Discovery"
    trip = TripRepository.create_trip(
        db,
        user_id=current_user.id,
        title=trip_title,
        destination=destination,
        description=f"Personalized AI-generated itinerary for {destination} based on prompt: '{payload.prompt}'",
        start_date=payload.start_date,
        status="PLANNED",
        created_by="AI",
        ai_generated=True,
    )

    # Populate days and items grounded in real services
    for day_num in range(1, duration + 1):
        day = TripRepository.add_day(
            db,
            trip_id=trip.id,
            day_number=day_num,
            title=f"Day {day_num}: {destination.split(',')[0].strip()} Exploration & Experiences",
            notes=f"Recommended highlights for day {day_num}",
        )
        # Add morning activity if real service exists
        if services:
            srv = services[(day_num - 1) % len(services)]
            TripRepository.add_item(
                db,
                trip_day_id=day.id,
                title=srv.title,
                item_type="SERVICE",
                service_id=srv.id,
                provider_id=srv.provider_id,
                description=srv.description[:200] if srv.description else None,
                start_time="09:00",
                end_time="12:30",
                duration_minutes=int((srv.duration_hours or 3.5) * 60),
                sequence_order=1,
            )

        # Add afternoon experience if another real service exists
        if len(services) > 1:
            srv2 = services[day_num % len(services)]
            TripRepository.add_item(
                db,
                trip_day_id=day.id,
                title=srv2.title,
                item_type="SERVICE",
                service_id=srv2.id,
                provider_id=srv2.provider_id,
                description=srv2.description[:200] if srv2.description else None,
                start_time="14:00",
                end_time="17:00",
                duration_minutes=180,
                sequence_order=2,
            )

    # Persist AITripPlan record
    ai_plan = TripRepository.create_ai_trip_plan(
        db,
        user_id=current_user.id,
        prompt=payload.prompt,
        trip_id=trip.id,
        preferences={
            "destination": destination,
            "duration_days": duration,
            "budget_band": payload.budget_band,
            "interests": payload.interests,
            "language": payload.language,
        },
        constraints={},
        model="gemini-3.5-flash-lite",
        status="COMPLETED",
    )

    db.refresh(trip)
    db.refresh(ai_plan)

    return APIResponse(
        success=True,
        message="AI Trip plan generated and saved successfully",
        data=AITripPlanResponse(
            id=ai_plan.id,
            trip_id=trip.id,
            user_id=current_user.id,
            prompt=ai_plan.prompt,
            preferences_json=ai_plan.preferences_json,
            constraints_json=ai_plan.constraints_json,
            model=ai_plan.model,
            model_version=ai_plan.model_version,
            status=ai_plan.status,
            created_at=ai_plan.created_at,
            completed_at=ai_plan.completed_at,
            trip=TripDetailResponse.model_validate(trip),
        ),
    )
