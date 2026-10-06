"""Provider application service."""

import json
import uuid
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
from app.modules.provider.infrastructure.repository import ProviderRepository
from app.modules.provider.presentation.schemas import PartnerApplicationCreate
from app.modules.provider.domain.models import PartnerApplication
from app.modules.user.domain.models import User
from app.core.enums import ApplicationStatus


class ProviderService:
    """Application service for host onboarding and provider operations."""

    def __init__(self, provider_repo: ProviderRepository):
        self.provider_repo = provider_repo

    def submit_application(self, user: User, payload: PartnerApplicationCreate) -> Dict[str, Any]:
        """Submit a host KYC onboarding application."""
        # Check if active application already exists
        existing = self.provider_repo.get_application_by_user(user.id)
        if existing and existing.status in [ApplicationStatus.PENDING.value, ApplicationStatus.APPROVED.value]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"You already have an application in {existing.status} status.",
            )

        app_code = f"APP-{uuid.uuid4().hex[:8].upper()}"
        app = PartnerApplication(
            application_code=app_code,
            user_id=user.id,
            role_type=payload.role_type,
            full_name=payload.full_name.strip(),
            email=payload.email.strip().lower(),
            mobile=payload.mobile.strip(),
            address=payload.address.strip(),
            district=payload.district.strip(),
            state=payload.state or "Karnataka",
            business_name=payload.business_name.strip(),
            experience_years=payload.experience_years or 0,
            bio=payload.bio,
            languages=payload.languages,
            id_type=payload.id_type,
            id_number=payload.id_number.strip(),
            document_url=payload.document_url,
            services_json=json.dumps(payload.services or []),
            activities_json=json.dumps(payload.activities or []),
            status=ApplicationStatus.PENDING.value,
        )
        saved = self.provider_repo.save_application(app)
        return self._serialize_application(saved)

    def get_my_application(self, user: User) -> Optional[Dict[str, Any]]:
        """Get the latest onboarding application for the user."""
        app = self.provider_repo.get_application_by_user(user.id)
        if not app:
            return None
        return self._serialize_application(app)

    def get_dashboard_stats(self, provider: User) -> Dict[str, Any]:
        """Retrieve aggregated host dashboard metrics."""
        services = self.provider_repo.get_provider_services(provider.id)
        bookings = self.provider_repo.get_provider_bookings(provider.id)

        active_services = [s for s in services if s.status == "PUBLISHED"]
        confirmed_bookings = [b for b in bookings if b.status == "CONFIRMED"]
        pending_bookings = [b for b in bookings if b.status == "PENDING"]
        total_earnings = sum(float(b.total_amount or 0) for b in confirmed_bookings)

        return {
            "total_services": len(services),
            "active_services": len(active_services),
            "total_bookings": len(bookings),
            "confirmed_bookings": len(confirmed_bookings),
            "pending_bookings": len(pending_bookings),
            "total_earnings": round(total_earnings, 2),
        }

    def _serialize_application(self, app: PartnerApplication) -> Dict[str, Any]:
        return {
            "id": str(app.id),
            "application_code": app.application_code,
            "user_id": str(app.user_id),
            "role_type": app.role_type,
            "full_name": app.full_name,
            "email": app.email,
            "mobile": app.mobile,
            "business_name": app.business_name,
            "district": app.district,
            "state": app.state,
            "status": app.status,
            "rejection_reason": app.rejection_reason,
            "created_at": app.created_at.isoformat() if app.created_at else "",
        }
