"""Compatibility re-export for Trip models."""
from app.modules.trip.domain.models import Trip, TripDay, TripItem, AITripPlan

__all__ = ["Trip", "TripDay", "TripItem", "AITripPlan"]
