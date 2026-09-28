"""Notification application service."""

import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from app.modules.notification.infrastructure.repository import NotificationRepository
from app.modules.notification.domain.models import Notification
from app.modules.user.domain.models import User


class NotificationService:
    def __init__(self, repo: NotificationRepository):
        self.repo = repo

    def get_user_notifications(
        self,
        user_id,
        unread_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        offset = (page - 1) * page_size
        items, total = self.repo.list_by_user(user_id=user_id, unread_only=unread_only, limit=page_size, offset=offset)
        return {
            "items": [self._serialize_notification(n) for n in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1,
        }

    def get_unread_count(self, user_id) -> int:
        return self.repo.count_unread(user_id)

    def mark_as_read(self, user_id, notification_id: str) -> Dict[str, Any]:
        notification = self.repo.get_by_id(notification_id)
        if not notification:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
        if str(notification.user_id) != str(user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

        notification.is_read = True
        saved = self.repo.save(notification)
        return self._serialize_notification(saved)

    def mark_all_read(self, user_id) -> Dict[str, Any]:
        count = self.repo.mark_all_as_read(user_id)
        return {"marked_count": count, "success": True}

    def create_notification(
        self,
        user_id,
        title: str,
        message: str,
        notification_type: str = "BOOKING",
        action_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        notification = Notification(
            user_id=uuid.UUID(str(user_id)),
            title=title,
            message=message,
            type=notification_type,
            action_url=action_url,
            is_read=False,
            metadata_json=json.dumps(metadata or {}),
        )
        saved = self.repo.save(notification)
        return self._serialize_notification(saved)

    def _serialize_notification(self, n: Notification) -> Dict[str, Any]:
        meta = {}
        if n.metadata_json:
            try:
                meta = json.loads(n.metadata_json)
            except Exception:
                meta = {}
        return {
            "id": str(n.id),
            "user_id": str(n.user_id),
            "title": n.title,
            "message": n.message,
            "notification_type": n.type,
            "link_url": n.action_url,
            "is_read": n.is_read,
            "read_at": None,
            "metadata": meta,
            "created_at": n.created_at.isoformat() if n.created_at else "",
        }
