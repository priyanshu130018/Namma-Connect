"""Support application service."""

import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
from app.modules.support.infrastructure.repository import SupportRepository
from app.modules.support.presentation.schemas import (
    CreateTicketRequest,
    UpdateTicketStatusRequest,
    PublicContactRequest,
)
from app.modules.support.domain.models import SupportTicket
from app.modules.user.domain.models import User


class SupportService:
    def __init__(self, repo: SupportRepository):
        self.repo = repo

    def submit_public_contact(self, payload: PublicContactRequest) -> Dict[str, Any]:
        user = self.repo.db.query(User).filter(User.email == payload.email).first()
        if not user:
            user = self.repo.db.query(User).filter(User.role == "ADMIN").first()
            if not user:
                user = self.repo.db.query(User).first()
                if not user:
                    user = User(
                        email=payload.email,
                        full_name=payload.name,
                        role="CUSTOMER",
                        is_active=True,
                        hashed_password="NOPASSWORD_GUEST_CONTACT",
                    )
                    self.repo.db.add(user)
                    self.repo.db.flush()

        ticket_code = f"NC-INQ-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        ticket = SupportTicket(
            ticket_code=ticket_code,
            user_id=user.id,
            user_name=payload.name.strip(),
            user_email=payload.email.strip().lower(),
            subject=payload.subject.strip(),
            description=payload.message.strip(),
            category=payload.category or "General Inquiry",
            priority="MEDIUM",
            status="OPEN",
            responses_json="[]",
        )
        saved = self.repo.save(ticket)
        return {
            "success": True,
            "message": "Your inquiry has been received. Our team will get back to you shortly.",
            "data": {
                "ticket_code": saved.ticket_code,
                "name": saved.user_name,
                "email": saved.user_email,
                "category": saved.category,
                "subject": saved.subject,
                "received_at": saved.created_at.isoformat() if saved.created_at else datetime.utcnow().isoformat(),
            },
        }



    def create_ticket(self, user: User, payload: CreateTicketRequest) -> Dict[str, Any]:
        ticket_num = f"TKT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        ticket = SupportTicket(
            ticket_number=ticket_num,
            user_id=user.id,
            booking_id=uuid.UUID(payload.booking_id) if payload.booking_id else None,
            service_id=uuid.UUID(payload.service_id) if payload.service_id else None,
            category=payload.category or "General",
            priority=payload.priority or "MEDIUM",
            subject=payload.subject.strip(),
            description=payload.description.strip(),
            status="OPEN",
        )
        saved = self.repo.save(ticket)
        return self._serialize_ticket(saved)

    def list_user_tickets(self, user: User, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        offset = (page - 1) * page_size
        items, total = self.repo.list_by_user(user_id=user.id, limit=page_size, offset=offset)
        return {
            "items": [self._serialize_ticket(t) for t in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1,
        }

    def get_ticket(self, user: User, ticket_id: str) -> Dict[str, Any]:
        ticket = self.repo.get_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")
        if str(ticket.user_id) != str(user.id) and user.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")
        return self._serialize_ticket(ticket)

    def update_ticket_status(self, admin: User, ticket_id: str, payload: UpdateTicketStatusRequest) -> Dict[str, Any]:
        if admin.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required.")

        ticket = self.repo.get_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

        ticket.status = payload.status
        if payload.resolution_notes:
            ticket.resolution_notes = payload.resolution_notes
        if payload.status in ["RESOLVED", "CLOSED"]:
            ticket.resolved_at = datetime.utcnow()
            ticket.assigned_admin_id = admin.id

        saved = self.repo.save(ticket)
        return self._serialize_ticket(saved)

    def list_all_tickets_admin(
        self,
        admin: User,
        status_filter: Optional[str] = None,
        priority_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        if admin.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required.")

        offset = (page - 1) * page_size
        items, total = self.repo.list_all(status=status_filter, priority=priority_filter, limit=page_size, offset=offset)
        return {
            "items": [self._serialize_ticket(t) for t in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1,
        }

    def _serialize_ticket(self, t: SupportTicket) -> Dict[str, Any]:
        return {
            "id": str(t.id),
            "ticket_number": t.ticket_number,
            "user_id": str(t.user_id),
            "booking_id": str(t.booking_id) if t.booking_id else None,
            "service_id": str(t.service_id) if t.service_id else None,
            "category": t.category,
            "priority": t.priority,
            "subject": t.subject,
            "description": t.description,
            "status": t.status,
            "resolution_notes": t.resolution_notes,
            "resolved_at": t.resolved_at.isoformat() if t.resolved_at else None,
            "created_at": t.created_at.isoformat() if t.created_at else "",
            "updated_at": t.updated_at.isoformat() if t.updated_at else "",
        }
