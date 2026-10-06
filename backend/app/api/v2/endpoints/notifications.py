"""Endpoints for User Notifications and Unread Badges."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import APIResponse, MessageResponse
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
)
from app.services.communication import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=APIResponse[NotificationListResponse])
def list_my_notifications(
    sort_by: Optional[str] = Query("newest", description="newest | oldest | name_asc | name_desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve authenticated user's notification feed and unread count."""
    res = NotificationService.list_user_notifications(db, current_user, sort_by=sort_by)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(res.notifications)} notifications",
        data=res,
    )


@router.post("/{notification_id}/read", response_model=APIResponse[NotificationResponse])
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a specific notification as read."""
    res = NotificationService.mark_notification_read(db, current_user, notification_id)
    return APIResponse(
        success=True,
        message="Notification marked as read",
        data=res,
    )


@router.post("/read-all", response_model=APIResponse[dict])
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all unread notifications as read for authenticated user."""
    count = NotificationService.mark_all_read(db, current_user)
    return APIResponse(
        success=True,
        message=f"Marked {count} notifications as read",
        data={"marked_count": count},
    )


@router.delete("/{notification_id}", response_model=MessageResponse)
def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a normal notification. Non-deletable system notifications will return an error."""
    NotificationService.delete_notification(db, current_user, notification_id)
    return MessageResponse(
        success=True,
        message="Notification deleted successfully.",
    )

