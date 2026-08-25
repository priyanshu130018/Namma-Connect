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
            reviewed_by=str(app.reviewed_by) if app.reviewed_by else None,
            reviewed_at=app.reviewed_at,
            created_at=app.created_at,
            updated_at=app.updated_at,
        )

    @classmethod
    def get_application_by_id(cls, db: Session, app_id: str) -> PartnerApplicationResponse:
        app = PartnerApplicationRepository.get_by_id(db, app_id)
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Partner application not found.",
            )
        return cls._to_response_dto(app)

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

        try:
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
                    existing.reviewed_by = None
                    existing.reviewed_at = None
                    existing.updated_at = datetime.utcnow()
                    updated_app = PartnerApplicationRepository.update(db, existing)

                    # Create user notification
                    notif = Notification(
                        user_id=user.id,
                        title="Partner Application Submitted",
                        message=f"Your {payload.role_type.title()} partner application (#{existing.application_code}) has been received and is under review.",
                        type="partner",
                        resource_type="partner_application",
                        resource_id=existing.application_code,
                        is_read=False,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    db.add(notif)
                    db.commit()
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

            # Notify admins if any exist
            admins = db.query(User).filter(User.role == "admin").all()
            for admin in admins:
                admin_notif = Notification(
                    user_id=admin.id,
                    title="New Partner Application",
                    message=f"New partner application #{code} received from {payload.full_name} for role {payload.role_type}.",
                    type="admin",
                    resource_type="partner_application",
                    resource_id=code,
                    is_read=False,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(admin_notif)

            db.commit()
            return cls._to_response_dto(saved_app)
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to submit partner application: {str(e)}",
            )

    @classmethod
    def approve_application(
        cls,
        db: Session,
        app_id: str,
        admin_user: User,
    ) -> PartnerApplicationResponse:
        app = PartnerApplicationRepository.get_by_id(db, app_id)
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Partner application not found.",
            )

        if app.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only PENDING applications can be approved. Current status: {app.status}.",
            )

        try:
            target_user = db.query(User).filter(User.id == app.user_id).first()

            app.status = "APPROVED"
            app.rejection_reason = None
            app.reviewed_by = admin_user.id
            app.reviewed_at = datetime.utcnow()
            app.updated_at = datetime.utcnow()

            # Upgrade role if customer
            if target_user and target_user.role == "customer":
                target_user.role = "partner"
                target_user.is_verified = True

            notif = Notification(
                user_id=app.user_id,
                title="Congratulations! Your NammaConnect Partner Application Is Approved",
                message="Congratulations! Your application has been verified and approved. Welcome to the NammaConnect partner family. You can now access your provider portal and start managing your services.",
                type="partner",
                resource_type="partner_application",
                resource_id=app.application_code,
                is_read=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(notif)
            PartnerApplicationRepository.update(db, app)
            db.commit()
            return cls._to_response_dto(app)
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to approve application: {str(e)}",
            )

    @classmethod
    def reject_application(
        cls,
        db: Session,
        app_id: str,
        admin_user: User,
        rejection_reason: str,
    ) -> PartnerApplicationResponse:
        app = PartnerApplicationRepository.get_by_id(db, app_id)
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Partner application not found.",
            )

        if not rejection_reason or not rejection_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A non-empty rejection reason is required.",
            )

        if app.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only PENDING applications can be rejected. Current status: {app.status}.",
            )

        try:
            clean_reason = rejection_reason.strip()
            app.status = "REJECTED"
            app.rejection_reason = clean_reason
            app.reviewed_by = admin_user.id
            app.reviewed_at = datetime.utcnow()
            app.updated_at = datetime.utcnow()

            notif = Notification(
                user_id=app.user_id,
                title="Partner Application Update",
                message=f"Sorry, but unfortunately your NammaConnect partner application was rejected: {clean_reason}. You may review the details and reapply.",
                type="partner",
                resource_type="partner_application",
                resource_id=app.application_code,
                is_read=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(notif)
            PartnerApplicationRepository.update(db, app)
            db.commit()
            return cls._to_response_dto(app)
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to reject application: {str(e)}",
            )

    @classmethod
    def review_application(
        cls,
        db: Session,
        app_id: str,
        admin_user: User,
        approved: bool,
        rejection_reason: Optional[str] = None,
    ) -> PartnerApplicationResponse:
        if approved:
            return cls.approve_application(db=db, app_id=app_id, admin_user=admin_user)
        else:
            if not rejection_reason or not rejection_reason.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A non-empty rejection reason is required when rejecting an application.",
                )
            return cls.reject_application(
                db=db,
                app_id=app_id,
                admin_user=admin_user,
                rejection_reason=rejection_reason,
            )
