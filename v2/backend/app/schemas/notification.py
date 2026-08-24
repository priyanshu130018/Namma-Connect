"""Pydantic schemas for Notifications."""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str  # booking, payment, collaboration, payout, system
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    is_read: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int


class NotificationMarkReadRequest(BaseModel):
    notification_ids: Optional[List[str]] = None
    mark_all: bool = False
