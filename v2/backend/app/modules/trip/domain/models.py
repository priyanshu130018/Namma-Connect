"""Trip Domain Models for Multi-Day Itinerary Planning, Schedule Days, and Items."""

import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin
from app.core.enums import TripStatus, TripItemType


class Trip(Base, TimestampMixin):
    """User Itinerary and Trip Planning Container (Distinct from Bookings)."""

    __tablename__ = "trips"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(String(32), nullable=True)
    end_date = Column(String(32), nullable=True)
    origin = Column(String(255), nullable=True)
    destination = Column(String(255), nullable=False)
    status = Column(String(32), nullable=False, default=TripStatus.DRAFT.value, index=True)
    created_by = Column(String(32), nullable=False, default="USER")
    ai_generated = Column(Boolean, nullable=False, default=False)

    # Relationships
    days = relationship(
        "TripDay",
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripDay.day_number",
    )
    user = relationship("User")
    ai_plan = relationship("AITripPlan", back_populates="trip", uselist=False)

    __table_args__ = (
        Index("idx_trips_user_start", "user_id", "start_date"),
    )


class TripDay(Base, TimestampMixin):
    """Day schedule container in a Multi-day Trip Itinerary."""

    __tablename__ = "trip_days"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trip_id = Column(GUID(), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    date = Column(String(32), nullable=True)
    title = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    trip = relationship("Trip", back_populates="days")
    items = relationship(
        "TripItem",
        back_populates="trip_day",
        cascade="all, delete-orphan",
        order_by="TripItem.sequence_order",
    )

    __table_args__ = (
        Index("idx_trip_days_trip_day", "trip_id", "day_number"),
    )


class TripItem(Base, TimestampMixin):
    """Individual activity, stay, or service milestone within a trip day."""

    __tablename__ = "trip_items"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trip_day_id = Column(GUID(), ForeignKey("trip_days.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(GUID(), ForeignKey("services.id", ondelete="SET NULL"), nullable=True, index=True)
    provider_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    booking_id = Column(GUID(), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    item_type = Column(String(50), nullable=False, default=TripItemType.SERVICE.value)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(String(32), nullable=True)
    end_time = Column(String(32), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    sequence_order = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    is_booked = Column(Boolean, nullable=False, default=False)

    # Relationships
    trip_day = relationship("TripDay", back_populates="items")
    service = relationship("Service")

    __table_args__ = (
        Index("idx_trip_items_day_seq", "trip_day_id", "sequence_order"),
    )


class AITripPlan(Base, TimestampMixin):
    """AI Generated Trip Plan Record Preserving Prompt and User Constraints."""

    __tablename__ = "ai_trip_plans"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trip_id = Column(GUID(), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    preferences_json = Column(Text, nullable=False, default="{}")
    constraints_json = Column(Text, nullable=False, default="{}")
    model = Column(String(128), nullable=False, default="gemini-3.5-flash-lite")
    model_version = Column(String(64), nullable=False, default="v2.0.0")
    status = Column(String(32), nullable=False, default="COMPLETED")
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    trip = relationship("Trip", back_populates="ai_plan")
    user = relationship("User")

    __table_args__ = (
        Index("idx_ai_trip_plans_user_created", "user_id", "created_at"),
    )
