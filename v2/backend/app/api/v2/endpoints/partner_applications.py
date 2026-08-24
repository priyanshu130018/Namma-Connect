"""API endpoints for Partner Application workflows and status."""

from typing import Optional, List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.partner_application import (
    PartnerApplicationCreateRequest,
    PartnerApplicationReviewRequest,
    PartnerApplicationResponse,
)
from app.services.partner_application import PartnerApplicationService

router = APIRouter(prefix="/partner/application", tags=["Partner Applications"])
admin_router = APIRouter(prefix="/admin/partner-applications", tags=["Admin Partner Applications"])


@router.get("", response_model=APIResponse[Optional[PartnerApplicationResponse]])
def get_my_partner_application(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve the current authenticated user's partner application status."""
    app = PartnerApplicationService.get_user_application(db, current_user)
    return APIResponse(
        success=True,
        message="Partner application retrieved successfully." if app else "No partner application found.",
        data=app,
    )


@router.post("", response_model=APIResponse[PartnerApplicationResponse], status_code=status.HTTP_201_CREATED)
def submit_partner_application(
    payload: PartnerApplicationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a new partner application or reapply after review."""
    result = PartnerApplicationService.submit_application(db, current_user, payload)
    return APIResponse(
        success=True,
        message="Partner application submitted successfully. Pending verification.",
        data=result,
    )


@admin_router.get("", response_model=APIResponse[List[PartnerApplicationResponse]])
def list_partner_applications(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: List all partner applications with optional status filter."""
    from app.repositories.partner_application import PartnerApplicationRepository
    apps, total = PartnerApplicationRepository.list_all(db, status=status, limit=limit, offset=offset)
    data = [PartnerApplicationService._to_response_dto(a) for a in apps]
    return APIResponse(
        success=True,
        message=f"Retrieved {len(data)} partner applications.",
        data=data,
    )


@admin_router.post("/{app_id}/review", response_model=APIResponse[PartnerApplicationResponse])
def review_partner_application(
    app_id: str,
    payload: PartnerApplicationReviewRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: Approve or reject a partner application."""
    result = PartnerApplicationService.review_application(
        db=db,
        app_id=app_id,
        admin_user=current_user,
        approved=payload.approved,
        rejection_reason=payload.rejection_reason,
    )
    return APIResponse(
        success=True,
        message="Partner application reviewed successfully.",
        data=result,
    )
