"""Seed data module for Namma Connect V2."""
from .geo_data import KARNATAKA_DISTRICTS
from .user_data import (
    FIRST_NAMES,
    LAST_NAMES,
    PROVIDER_BUSINESS_SUFFIXES,
    ID_TYPES,
    generate_travel_preferences,
    generate_notification_preferences,
    generate_privacy_preferences,
)
from .service_templates import CATEGORY_CONFIGS, IMAGE_POOLS, CROPS, LANDSCAPES, CUISINES, CRAFTS, WILDLIFE_TARGETS
from .review_data import REVIEW_COMMENTS, generate_rating

__all__ = [
    "KARNATAKA_DISTRICTS",
    "FIRST_NAMES",
    "LAST_NAMES",
    "PROVIDER_BUSINESS_SUFFIXES",
    "ID_TYPES",
    "generate_travel_preferences",
    "generate_notification_preferences",
    "generate_privacy_preferences",
    "CATEGORY_CONFIGS",
    "IMAGE_POOLS",
    "CROPS",
    "LANDSCAPES",
    "CUISINES",
    "CRAFTS",
    "WILDLIFE_TARGETS",
    "REVIEW_COMMENTS",
    "generate_rating",
]
