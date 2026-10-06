"""Support presentation router."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.user.domain.models import User
from app.modules.support.infrastructure.repository import SupportRepository
from app.modules.support.application.service import SupportService
from app.modules.support.presentation.schemas import (
    CreateTicketRequest,
    UpdateTicketStatusRequest,
    SupportTicketResponse,
    PublicContactRequest,
    PublicContactResponse,
)

router = APIRouter(prefix="/support", tags=["Support"])


def get_support_service(db: Session = Depends(get_db)) -> SupportService:
    repo = SupportRepository(db)
    return SupportService(repo)


@router.post("/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: CreateTicketRequest,
    current_user: User = Depends(get_current_active_user),
    service: SupportService = Depends(get_support_service),
):
    """File a support grievance ticket."""
    return service.create_ticket(user=current_user, payload=payload)


@router.get("/tickets", response_model=dict)
def list_user_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    service: SupportService = Depends(get_support_service),
):
    """List tickets filed by the user."""
    return service.list_user_tickets(user=current_user, page=page, page_size=page_size)


@router.get("/tickets/{ticket_id}", response_model=SupportTicketResponse)
def get_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_active_user),
    service: SupportService = Depends(get_support_service),
):
    """Get single ticket details."""
    return service.get_ticket(user=current_user, ticket_id=ticket_id)


@router.patch("/tickets/{ticket_id}/status", response_model=SupportTicketResponse)
def update_ticket_status(
    ticket_id: str,
    payload: UpdateTicketStatusRequest,
    current_user: User = Depends(get_current_active_user),
    service: SupportService = Depends(get_support_service),
):
    """Update ticket resolution status (Admin)."""
    return service.update_ticket_status(admin=current_user, ticket_id=ticket_id, payload=payload)


@router.get("/admin/tickets", response_model=dict)
def list_admin_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    service: SupportService = Depends(get_support_service),
):
    """List all platform tickets for admin oversight."""
    return service.list_all_tickets_admin(
        admin=current_user,
        status_filter=status,
        priority_filter=priority,
        page=page,
        page_size=page_size,
    )
