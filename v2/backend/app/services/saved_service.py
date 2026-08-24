"""Domain Service for Customer Saved Services (Wishlist) Management."""

from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.service import Service
from app.repositories.service import ServiceRepository
from app.repositories.saved_service import SavedServiceRepository
from app.services.marketplace import MarketplaceService
from app.schemas.saved_service import (
    SavedServiceResponse,
    SavedServiceStatusResponse,
    SavedServiceListResponse,
)
from app.schemas.service import ServiceResponse


class SavedServiceDomainService:
    """Business logic for Customer Saved Services / Wishlist."""

    @classmethod
    def _validate_service(cls, db: Session, service_id: str) -> Service:
        """Validate that a service exists in the catalog."""
        MarketplaceService.ensure_seeded(db)
        service = ServiceRepository.get_by_id(db, service_id)
        if not service:
            service = ServiceRepository.get_by_slug(db, service_id)

        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service listing '{service_id}' was not found.",
            )
        return service

    @classmethod
    def save_service(
        cls,
        db: Session,
        current_user: User,
        service_id: str,
    ) -> SavedServiceStatusResponse:
        """Save a service to the customer's private wishlist (idempotent)."""
        service = cls._validate_service(db, service_id)

        SavedServiceRepository.save_service(
            db,
            user_id=str(current_user.id),
            service_id=str(service.id),
        )

        return SavedServiceStatusResponse(
            is_saved=True,
            service_id=str(service.id),
        )

    @classmethod
    def remove_saved_service(
        cls,
        db: Session,
        current_user: User,
        service_id: str,
    ) -> SavedServiceStatusResponse:
        """Remove a service from the customer's private wishlist."""
        service = cls._validate_service(db, service_id)

        SavedServiceRepository.remove_saved(
            db,
            user_id=str(current_user.id),
            service_id=str(service.id),
        )

        return SavedServiceStatusResponse(
            is_saved=False,
            service_id=str(service.id),
        )

    @classmethod
    def check_saved_status(
        cls,
        db: Session,
        current_user: User,
        service_id: str,
    ) -> SavedServiceStatusResponse:
        """Check if a specific service is saved by the authenticated customer."""
        service = cls._validate_service(db, service_id)

        is_saved = SavedServiceRepository.is_saved(
            db,
            user_id=str(current_user.id),
            service_id=str(service.id),
        )

        return SavedServiceStatusResponse(
            is_saved=is_saved,
            service_id=str(service.id),
        )

    @classmethod
    def list_saved_services(
        cls,
        db: Session,
        current_user: User,
    ) -> SavedServiceListResponse:
        """List all saved services for the authenticated customer."""
        MarketplaceService.ensure_seeded(db)
        saved_records = SavedServiceRepository.list_by_user(db, str(current_user.id))

        services: List[ServiceResponse] = []
        for record in saved_records:
            if record.service and record.service.status == "PUBLISHED":
                services.append(MarketplaceService._to_service_response(record.service))

        return SavedServiceListResponse(
            services=services,
            total=len(services),
        )
