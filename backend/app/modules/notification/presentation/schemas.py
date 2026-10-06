"""Notification presentation schemas."""

from typing import Optional, Dict, Any
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    notification_type: str
    link_url: Optional[str] = None
    is_read: bool
    read_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: str


class UnreadCountResponse(BaseModel):
    unread_count: int
