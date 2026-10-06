"""Messaging presentation router."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.user.domain.models import User
from app.modules.messaging.infrastructure.repository import MessagingRepository
from app.modules.messaging.application.service import MessagingService
from app.modules.messaging.presentation.schemas import (
    SendMessageRequest,
    MessageResponse,
    ConversationResponse,
)

router = APIRouter(prefix="/messages", tags=["Messages"])


def get_messaging_service(db: Session = Depends(get_db)) -> MessagingService:
    repo = MessagingRepository(db)
    return MessagingService(repo)


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_active_user),
    service: MessagingService = Depends(get_messaging_service),
):
    """Send a message to another user / provider."""
    return service.send_message(sender=current_user, payload=payload)


@router.get("/conversations", response_model=dict)
def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    service: MessagingService = Depends(get_messaging_service),
):
    """List all active conversations for the authenticated user."""
    return service.list_conversations(user=current_user, page=page, page_size=page_size)


@router.get("/conversations/{conversation_id}", response_model=dict)
def get_conversation_messages(
    conversation_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    service: MessagingService = Depends(get_messaging_service),
):
    """Retrieve message history for a specific conversation."""
    return service.get_conversation_messages(
        user=current_user,
        conversation_id=conversation_id,
        page=page,
        page_size=page_size,
    )
