"""Notification repository handling notification retrieval, dispatch, and logging."""

import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.modules.notification.domain.models import Notification, EmailLog


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, notification_id) -> Optional[Notification]:
        if isinstance(notification_id, str):
            try:
                notification_id = uuid.UUID(notification_id)
            except ValueError:
                return None
        return self.db.query(Notification).filter(Notification.id == notification_id).first()

    def list_by_user(
        self,
        user_id,
        unread_only: bool = False,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Notification], int]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        q = self.db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            q = q.filter(Notification.is_read.is_(False))
        total = q.count()
        items = q.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()
        return items, total

    def count_unread(self, user_id) -> int:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        return self.db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read.is_(False)).count()

    def save(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_all_as_read(self, user_id) -> int:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        count = self.db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read.is_(False)).update({"is_read": True})
        self.db.commit()
        return count

    def save_email_log(self, email_log: EmailLog) -> EmailLog:
        self.db.add(email_log)
        self.db.commit()
        self.db.refresh(email_log)
        return email_log
