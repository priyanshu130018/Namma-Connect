"""Service layer for Partner Application workflows."""

import json
import random
import re
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.partner_application import PartnerApplication
from app.models.service import Service
from app.models.notification import Notification
from app.repositories.partner_application import PartnerApplicationRepository
from app.schemas.partner_application import (
    PartnerApplicationCreateRequest,
    PartnerApplicationDraftRequest,
    PartnerApplicationUpdateRequest,
    PartnerApplicationResponse,
)


class PartnerApplicationService:
    """Handles submission, dynamic drafting, duplication prevention, and approval flows for partner applications."""

    @staticmethod
    def _to_response_dto(app: PartnerApplication) -> PartnerApplicationResponse:
        services = []
        activities = []
        provider_details = {}
        documents = []
        images = []

        try:
            services = json.loads(app.services_json) if app.services_json else []
        except Exception:
            services = []

        try:
            activities = json.loads(app.activities_json) if app.activities_json else []
        except Exception:
            activities = []

        try:
            provider_details = json.loads(app.provider_details_json) if app.provider_details_json else {}
        except Exception:
            provider_details = {}

        try:
            documents = json.loads(app.documents_json) if app.documents_json else []
        except Exception:
            documents = []

        try:
            images = json.loads(app.images_json) if app.images_json else []
        except Exception:
            images = []

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
            provider_details=provider_details,
            documents=documents,
            images=images,
            services=services,
            activities=activities,
            draft_step=app.draft_step or 1,
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
    def save_draft(
        cls,
        db: Session,
        user: User,
        payload: PartnerApplicationDraftRequest,
    ) -> PartnerApplicationResponse:
        """Save or update application draft without triggering final verification review."""
        existing = PartnerApplicationRepository.get_by_user_id(db, str(user.id))

        if existing and existing.status in ["PENDING", "APPROVED"]:
            # If already pending review or approved, return current application dto
            return cls._to_response_dto(existing)

        provider_details_json = json.dumps(payload.provider_details or {})
        documents_json = json.dumps(payload.documents or [])
        images_json = json.dumps(payload.images or [])
        services_json = json.dumps(payload.services or [])
        activities_json = json.dumps(payload.activities or [])

        if existing:
            existing.role_type = payload.role_type or existing.role_type
            existing.full_name = payload.full_name or existing.full_name
            existing.email = payload.email or existing.email
            existing.mobile = payload.mobile or existing.mobile
            existing.address = payload.address or existing.address
            existing.district = payload.district or existing.district
            existing.state = payload.state or existing.state
            existing.latitude = payload.latitude
            existing.longitude = payload.longitude
            existing.business_name = payload.business_name or existing.business_name
            existing.experience_years = payload.experience_years or 0
            existing.bio = payload.bio
            existing.languages = payload.languages
            existing.id_type = payload.id_type or existing.id_type
            existing.id_number = payload.id_number or existing.id_number
            existing.document_url = payload.document_url or existing.document_url
            existing.provider_details_json = provider_details_json
            existing.documents_json = documents_json
            existing.images_json = images_json
            existing.services_json = services_json
            existing.activities_json = activities_json
            existing.draft_step = payload.draft_step or 1
            existing.status = "DRAFT"
            existing.updated_at = datetime.utcnow()
            app = PartnerApplicationRepository.update(db, existing)
        else:
            code = f"PA-2026-{random.randint(1000, 9999)}"
            new_app = PartnerApplication(
                application_code=code,
                user_id=user.id,
                role_type=payload.role_type or "farmer",
                full_name=payload.full_name or user.full_name or "Applicant",
                email=payload.email or user.email or "applicant@example.com",
                mobile=payload.mobile or "0000000000",
                address=payload.address or "Address",
                district=payload.district or "District",
                state=payload.state or "Karnataka",
                latitude=payload.latitude,
                longitude=payload.longitude,
                business_name=payload.business_name or "Business",
                experience_years=payload.experience_years or 0,
                bio=payload.bio,
                languages=payload.languages,
                id_type=payload.id_type or "Aadhaar",
                id_number=payload.id_number or "0000",
                document_url=payload.document_url,
                provider_details_json=provider_details_json,
                documents_json=documents_json,
                images_json=images_json,
                services_json=services_json,
                activities_json=activities_json,
                draft_step=payload.draft_step or 1,
                status="DRAFT",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            app = PartnerApplicationRepository.create(db, new_app)

        db.commit()
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

            provider_details_json = json.dumps(payload.provider_details or {})
            documents_json = json.dumps(payload.documents or [])
            images_json = json.dumps(payload.images or [])
            services_json = json.dumps(payload.services or [])
            activities_json = json.dumps(payload.activities or [])

            if existing:
                code = existing.application_code
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
                existing.provider_details_json = provider_details_json
                existing.documents_json = documents_json
                existing.images_json = images_json
                existing.services_json = services_json
                existing.activities_json = activities_json
                existing.draft_step = 5
                existing.status = "PENDING"
                existing.rejection_reason = None
                existing.reviewed_by = None
                existing.reviewed_at = None
                existing.updated_at = datetime.utcnow()
                saved_app = PartnerApplicationRepository.update(db, existing)
            else:
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
                    provider_details_json=provider_details_json,
                    documents_json=documents_json,
                    images_json=images_json,
                    services_json=services_json,
                    activities_json=activities_json,
                    draft_step=5,
                    status="PENDING",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                saved_app = PartnerApplicationRepository.create(db, new_app)

            # Create real Service database records for any services in payload.services_payload
            if payload.services_payload:
                for s_item in payload.services_payload:
                    clean_slug = re.sub(r'[^a-z0-9]+', '-', s_item.title.lower()).strip('-')
                    unique_slug = f"{clean_slug}-{random.randint(100, 999)}"
                    primary_img = s_item.images[0] if s_item.images else "https://images.unsplash.com/photo-1500382017468-9049fed747ef"
                    category_slug = re.sub(r'[^a-z0-9]+', '-', s_item.category.lower()).strip('-')

                    new_service = Service(
                        title=s_item.title,
                        slug=unique_slug,
                        description=s_item.description or f"{s_item.title} offered by {payload.business_name}.",
                        category=s_item.category,
                        category_slug=category_slug or "experiences",
                        location=payload.address or payload.district,
                        district=payload.district,
                        state=payload.state,
                        latitude=payload.latitude,
                        longitude=payload.longitude,
                        price=s_item.price,
                        unit=s_item.unit or "person",
                        max_capacity=s_item.max_capacity or 10,
                        duration_hours=s_item.duration_hours or 2.0,
                        rating=5.0,
                        reviews_count=0,
                        is_verified=False,
                        status="PENDING",
                        provider_id=user.id,
                        provider_name=payload.business_name or payload.full_name,
                        provider_type=payload.role_type.title(),
                        primary_image=primary_img,
                        images_json=json.dumps(s_item.images or [primary_img]),
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    db.add(new_service)

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

            # Dispatch confirmation email to applicant
            try:
                from app.services.email import EmailService
                if user.email:
                    is_test = getattr(user, "is_test_data", False)
                    EmailService.send_provider_application_received(
                        to_email=user.email,
                        full_name=payload.full_name,
                        application_code=code,
                        role_type=payload.role_type,
                        is_test_data=is_test,
                        user_id=user.id,
                        db=db,
                    )
            except Exception:
                pass

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
        approve_services_together: bool = True,
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

            # Upgrade role if customer / user
            if target_user and target_user.role in ["customer", "user"]:
                target_user.role = "provider"
                target_user.is_verified = True

            # If approve_services_together is enabled, approve attached pending services for this provider
            approved_services_count = 0
            if approve_services_together:
                pending_services = db.query(Service).filter(
                    Service.provider_id == app.user_id,
                    Service.status == "PENDING"
                ).all()
                for srv in pending_services:
                    srv.status = "PUBLISHED"
                    srv.is_verified = True
                    srv.reviewed_by = admin_user.id
                    srv.reviewed_at = datetime.utcnow()
                    approved_services_count += 1

            service_msg = (
                f" Your {approved_services_count} submitted services have also been approved and published to the marketplace."
                if approved_services_count > 0
                else " Your partner account is approved. Services submitted separately will undergo individual review."
            )

            notif = Notification(
                user_id=app.user_id,
                title="Congratulations! Your Partner Application Is Approved",
                message=f"Your {app.role_type.title()} partner application (#{app.application_code}) has been verified and approved.{service_msg}",
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

            # Dispatch partner application approved email
            try:
                from app.services.email import EmailService
                if target_user and target_user.email:
                    is_test = getattr(target_user, "is_test_data", False)
                    EmailService.send_provider_application_approved(
                        to_email=target_user.email,
                        full_name=app.full_name,
                        application_code=app.application_code,
                        is_test_data=is_test,
                        user_id=target_user.id,
                        db=db,
                    )
            except Exception:
                pass

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
                message=f"Your NammaConnect partner application was not approved: {clean_reason}. You may review the remarks, update your details, and reapply.",
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

            # Dispatch partner application rejected email
            try:
                from app.services.email import EmailService
                target_user = db.query(User).filter(User.id == app.user_id).first()
                if target_user and target_user.email:
                    is_test = getattr(target_user, "is_test_data", False)
                    EmailService.send_provider_application_rejected(
                        to_email=target_user.email,
                        full_name=app.full_name,
                        application_code=app.application_code,
                        reason=clean_reason,
                        is_test_data=is_test,
                        user_id=target_user.id,
                        db=db,
                    )
            except Exception:
                pass

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
        approve_services_together: bool = True,
    ) -> PartnerApplicationResponse:
        if approved:
            return cls.approve_application(
                db=db,
                app_id=app_id,
                admin_user=admin_user,
                approve_services_together=approve_services_together,
            )
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
