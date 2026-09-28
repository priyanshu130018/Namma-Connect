"""Support repository handling grievance and support ticket entities."""

import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.modules.support.domain.models import SupportTicket


class SupportRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, ticket_id) -> Optional[SupportTicket]:
        if isinstance(ticket_id, str):
            try:
                ticket_id = uuid.UUID(ticket_id)
            except ValueError:
                return None
        return self.db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()

    def list_by_user(self, user_id, limit: int = 20, offset: int = 0) -> Tuple[List[SupportTicket], int]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        q = self.db.query(SupportTicket).filter(SupportTicket.user_id == user_id)
        total = q.count()
        items = q.order_by(desc(SupportTicket.created_at)).offset(offset).limit(limit).all()
        return items, total

    def list_all(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[SupportTicket], int]:
        q = self.db.query(SupportTicket)
        if status:
            q = q.filter(SupportTicket.status == status)
        if priority:
            q = q.filter(SupportTicket.priority == priority)
        total = q.count()
        items = q.order_by(desc(SupportTicket.created_at)).offset(offset).limit(limit).all()
        return items, total

    def save(self, ticket: SupportTicket) -> SupportTicket:
        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)
        return ticket
