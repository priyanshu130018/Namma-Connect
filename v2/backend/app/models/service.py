"""Compatibility re-export for Service and Review models."""
from app.modules.marketplace.domain.models import Service, ServiceAvailability, SavedService, ContentTranslation
from app.modules.review.domain.models import Review

__all__ = ["Service", "Review", "ServiceAvailability", "SavedService", "ContentTranslation"]
