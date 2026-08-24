"""Service layer for Partner Application workflows."""

import json
import random
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.partner_application import PartnerApplication
from app.models.notification import Notification
from app.repositories.partner_application import PartnerApplicationRepository
from app.schemas.partner_application import (
    PartnerApplicationCreateRequest,
    PartnerApplicationUpdateRequest,
    PartnerApplicationResponse,
)


class PartnerApplicationService:
    """Handles submission, duplication prevention, and approval flows for partner applications."""

    @staticmethod
    def _to_response_dto(app: PartnerApplication) -> PartnerApplicationResponse:
        services = []
        activities = []
        try:
            services = json.loads(app.services_json) if app.services_json else []
        except Exception:
            services = []

        try:
            activities = json.loads(app.activities_json) if app.activities_json else []
        except Exception:
            activities = []

        return PartnerApplicationResponse(
            id=str(app.id),
            application_code=app.application_code,
            user_id=str(app.user_id),
            role_type=app.role_type,
            full_name=app.full_name,
            email=app.email,
            mobile=app.mobile,
            address=app.address,
            district=app.district,
            state=app.state,
            latitude=app.latitude,
            longitude=app.longitude,
            business_name=app.business_name,
            experience_years=app.experience_years or 0,
            bio=app.bio,
            languages=app.languages,
            id_type=app.id_type,
            id_number=app.id_number,
            document_url=app.document_url,
            services=services,
            activities=activities,
            status=app.status,
            rejection_reason=app.rejection_reason,
            created_at=app.created_at,
            updated_at=app.updated_at,
        )

    @classmethod
    def get_user_application(cls, db: Session, user: User) -> Optional[PartnerApplicationResponse]:
        app = PartnerApplicationRepository.get_by_user_id(db, str(user.id))
        if not app:
            return None
        return cls._to_response_dto(app)

    @classmethod
    def submit_application(
        cls,
        db: Session,
        user: User,
        payload: PartnerApplicationCreateRequest,
    ) -> PartnerApplicationResponse:
        existing = PartnerApplicationRepository.get_by_user_id(db, str(user.id))

        if existing:
            if existing.status == "PENDING":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="You already have a partner application under review. Please wait for verification.",
                )
            if existing.status == "APPROVED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Your partner application has already been approved. You have full partner access.",
                )
            if existing.status == "REJECTED":
                # Reapplication / Update existing record
                existing.role_type = payload.role_type
                existing.full_name = payload.full_name
                existing.email = payload.email
                existing.mobile = payload.mobile
                existing.address = payload.address
                existing.district = payload.district
                existing.state = payload.state
                existing.latitude = payload.latitude
                existing.longitude = payload.longitude
                existing.business_name = payload.business_name
                existing.experience_years = payload.experience_years or 0
                existing.bio = payload.bio
                existing.languages = payload.languages
                existing.id_type = payload.id_type
                existing.id_number = payload.id_number
                existing.document_url = payload.document_url
                existing.services_json = json.dumps(payload.services)
                existing.activities_json = json.dumps(payload.activities)
                existing.status = "PENDING"
                existing.rejection_reason = None
                existing.updated_at = datetime.utcnow()
                updated_app = PartnerApplicationRepository.update(db, existing)
                return cls._to_response_dto(updated_app)

        # Create new application
        code = f"PA-2026-{random.randint(1000, 9999)}"
        new_app = PartnerApplication(
            application_code=code,
            user_id=user.id,
            role_type=payload.role_type,
            full_name=payload.full_name,
            email=payload.email,
            mobile=payload.mobile,
            address=payload.address,
            district=payload.district,
            state=payload.state,
            latitude=payload.latitude,
            longitude=payload.longitude,
            business_name=payload.business_name,
            experience_years=payload.experience_years or 0,
            bio=payload.bio,
            languages=payload.languages,
            id_type=payload.id_type,
            id_number=payload.id_number,
            document_url=payload.document_url,
            services_json=json.dumps(payload.services),
            activities_json=json.dumps(payload.activities),
            status="PENDING",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        saved_app = PartnerApplicationRepository.create(db, new_app)

        # Create user notification
        notif = Notification(
            user_id=user.id,
            title="Partner Application Submitted",
            message=f"Your {payload.role_type.title()} partner application (#{code}) has been received and is under review.",
            type="partner",
            resource_type="partner_application",
            resource_id=code,
            is_read=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(notif)
        db.commit()

        return cls._to_response_dto(saved_app)

    @classmethod
    def review_application(
        cls,
        db: Session,
        app_id: str,
        admin_user: User,
        approved: bool,
        rejection_reason: Optional[str] = None,
    ) -> PartnerApplicationResponse:
        app = PartnerApplicationRepository.get_by_id(db, app_id)
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Partner application not found.",
            )

        target_user = db.query(User).filter(User.id == app.user_id).first()

        if approved:
            app.status = "APPROVED"
            app.rejection_reason = None
            app.reviewed_by = admin_user.id
            app.reviewed_at = datetime.utcnow()

            # Upgrade role if customer
            if target_user and target_user.role == "customer":
                target_user.role = "partner"
                target_user.is_verified = True

            notif = Notification(
                user_id=app.user_id,
                title="Partner Application Approved! 🎉",
                message=f"Congratulations! Your partner account for {app.business_name} is now approved and active.",
                type="partner",
                resource_type="partner_application",
                resource_id=app.application_code,
                is_read=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(notif)
        else:
            app.status = "REJECTED"
            app.rejection_reason = rejection_reason or "Document verification incomplete or requirements not met."
            app.reviewed_by = admin_user.id
            app.reviewed_at = datetime.utcnow()

            notif = Notification(
                user_id=app.user_id,
                title="Partner Application Updates Required",
                message=f"Your partner application (#{app.application_code}) requires changes: {app.rejection_reason}",
                type="partner",
                resource_type="partner_application",
                resource_id=app.application_code,
                is_read=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(notif)

        app.updated_at = datetime.utcnow()
        updated = PartnerApplicationRepository.update(db, app)
        db.commit()

        return cls._to_response_dto(updated)
