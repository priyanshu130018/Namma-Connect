"""Notification presentation router."""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.user.domain.models import User
from app.modules.notification.infrastructure.repository import NotificationRepository
from app.modules.notification.application.service import NotificationService
from app.modules.notification.presentation.schemas import (
    NotificationResponse,
    UnreadCountResponse,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_notification_service(db: Session = Depends(get_db)) -> NotificationService:
    repo = NotificationRepository(db)
    return NotificationService(repo)


@router.get("", response_model=dict)
def list_notifications(
    unread_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Retrieve notifications for the authenticated user."""
    return service.get_user_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Get the unread notifications count."""
    return {"unread_count": service.get_unread_count(user_id=current_user.id)}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Mark a single notification as read."""
    return service.mark_as_read(user_id=current_user.id, notification_id=notification_id)


@router.post("/mark-all-read", response_model=dict)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Mark all notifications for the user as read."""
    return service.mark_all_read(user_id=current_user.id)
