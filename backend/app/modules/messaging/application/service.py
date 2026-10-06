"""Messaging application service."""

import uuid
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
from app.modules.messaging.infrastructure.repository import MessagingRepository
from app.modules.user.infrastructure.repository import UserRepository
from app.modules.messaging.presentation.schemas import SendMessageRequest
from app.modules.messaging.domain.models import Message, Conversation
from app.modules.user.domain.models import User


class MessagingService:
    def __init__(self, repo: MessagingRepository, user_repo: Optional[UserRepository] = None):
        self.repo = repo
        self.user_repo = user_repo

    def send_message(self, sender: User, payload: SendMessageRequest) -> Dict[str, Any]:
        receiver_uuid = uuid.UUID(payload.receiver_id) if isinstance(payload.receiver_id, str) else payload.receiver_id
        if str(receiver_uuid) == str(sender.id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot send message to yourself.")

        conv = self.repo.get_or_create_conversation(
            user1_id=sender.id,
            user1_name=sender.full_name or "Guest",
            user2_id=receiver_uuid,
            user2_name="Host",
        )

        msg = Message(
            conversation_id=conv.id,
            sender_id=sender.id,
            sender_name=sender.full_name or "Guest",
            text=payload.content.strip(),
            is_read=False,
        )
        saved = self.repo.save_message(msg)
        self.repo.update_conversation_timestamp(conv.id, last_text=payload.content.strip())

        return self._serialize_message(saved)

    def list_conversations(self, user: User, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        offset = (page - 1) * page_size
        items, total = self.repo.list_user_conversations(user_id=user.id, limit=page_size, offset=offset)
        return {
            "items": [self._serialize_conversation(c) for c in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1,
        }

    def get_conversation_messages(self, user: User, conversation_id: str, page: int = 1, page_size: int = 50) -> Dict[str, Any]:
        conv = self.repo.get_conversation_by_id(conversation_id)
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
        if str(conv.participant1_id) != str(user.id) and str(conv.participant2_id) != str(user.id) and user.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this conversation.")

        offset = (page - 1) * page_size
        items, total = self.repo.list_messages(conv_id=conv.id, limit=page_size, offset=offset)
        return {
            "conversation_id": str(conv.id),
            "items": [self._serialize_message(m) for m in items],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    def _serialize_message(self, m: Message) -> Dict[str, Any]:
        return {
            "id": str(m.id),
            "conversation_id": str(m.conversation_id),
            "sender_id": str(m.sender_id),
            "receiver_id": "",
            "content": m.text,
            "message_type": "TEXT",
            "media_url": None,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }

    def _serialize_conversation(self, c: Conversation) -> Dict[str, Any]:
        return {
            "id": str(c.id),
            "user1_id": str(c.participant1_id),
            "user2_id": str(c.participant2_id),
            "service_id": None,
            "booking_id": None,
            "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else "",
        }
