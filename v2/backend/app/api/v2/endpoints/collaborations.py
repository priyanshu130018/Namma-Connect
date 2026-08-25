"""Endpoints for Collaboration Proposals between Hosts and Creators."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.creator import (
    CollaborationCreateRequest,
    CollaborationResponse,
    CollaborationStatusUpdateRequest,
)
from app.services.creator import CreatorService

router = APIRouter(prefix="/collaborations", tags=["Collaborations"])


@router.post("", response_model=APIResponse[CollaborationResponse], status_code=status.HTTP_201_CREATED)
def create_collaboration_proposal(
    payload: CollaborationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a collaboration proposal to a creator from a host/partner or brand."""
    collab = CreatorService.create_collaboration_proposal(db, current_user, payload)
    return APIResponse(
        success=True,
        message="Collaboration proposal submitted successfully",
        data=collab,
    )


@router.get("/me", response_model=APIResponse[List[CollaborationResponse]])
def list_my_collaborations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all collaborations involving the authenticated user (as creator or host)."""
    collabs = CreatorService.list_user_collaborations(db, current_user)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(collabs)} collaborations",
        data=collabs,
    )


@router.post("/{collab_id}/accept", response_model=APIResponse[CollaborationResponse])
def accept_collaboration_proposal(
    collab_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creator accepts a pending collaboration proposal."""
    collab = CreatorService.accept_collaboration(db, current_user, collab_id)
    return APIResponse(
        success=True,
        message="Collaboration proposal accepted successfully",
        data=collab,
    )


@router.post("/{collab_id}/reject", response_model=APIResponse[CollaborationResponse])
def reject_collaboration_proposal(
    collab_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creator declines a pending collaboration proposal."""
    collab = CreatorService.reject_collaboration(db, current_user, collab_id)
    return APIResponse(
        success=True,
        message="Collaboration proposal declined successfully",
        data=collab,
    )


@router.post("/{collab_id}/complete", response_model=APIResponse[CollaborationResponse])
def complete_collaboration(
    collab_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark an active accepted collaboration as completed."""
    collab = CreatorService.complete_collaboration(db, current_user, collab_id)
    return APIResponse(
        success=True,
        message="Collaboration marked as completed",
        data=collab,
    )
