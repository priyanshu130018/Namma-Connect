"""Messaging repository handling user-to-user conversation and message persistence."""

import uuid
from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from app.modules.messaging.domain.models import Conversation, Message


class MessagingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_conversation(
        self,
        user1_id,
        user1_name: str,
        user2_id,
        user2_name: str,
    ) -> Conversation:
        if isinstance(user1_id, str):
            user1_id = uuid.UUID(user1_id)
        if isinstance(user2_id, str):
            user2_id = uuid.UUID(user2_id)

        conv = (
            self.db.query(Conversation)
            .filter(
                or_(
                    and_(Conversation.participant1_id == user1_id, Conversation.participant2_id == user2_id),
                    and_(Conversation.participant1_id == user2_id, Conversation.participant2_id == user1_id),
                )
            )
            .first()
        )
        if not conv:
            conv = Conversation(
                participant1_id=user1_id,
                participant1_name=user1_name,
                participant2_id=user2_id,
                participant2_name=user2_name,
                last_message_at=datetime.utcnow(),
            )
            self.db.add(conv)
            self.db.commit()
            self.db.refresh(conv)
        return conv

    def get_conversation_by_id(self, conv_id) -> Optional[Conversation]:
        if isinstance(conv_id, str):
            try:
                conv_id = uuid.UUID(conv_id)
            except ValueError:
                return None
        return self.db.query(Conversation).filter(Conversation.id == conv_id).first()

    def list_user_conversations(self, user_id, limit: int = 20, offset: int = 0) -> Tuple[List[Conversation], int]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        q = self.db.query(Conversation).filter(or_(Conversation.participant1_id == user_id, Conversation.participant2_id == user_id))
        total = q.count()
        items = q.order_by(desc(Conversation.last_message_at)).offset(offset).limit(limit).all()
        return items, total

    def list_messages(self, conv_id, limit: int = 50, offset: int = 0) -> Tuple[List[Message], int]:
        if isinstance(conv_id, str):
            conv_id = uuid.UUID(conv_id)
        q = self.db.query(Message).filter(Message.conversation_id == conv_id)
        total = q.count()
        items = q.order_by(desc(Message.created_at)).offset(offset).limit(limit).all()
        return items, total

    def save_message(self, msg: Message) -> Message:
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def update_conversation_timestamp(self, conv_id, last_text: str = "") -> None:
        if isinstance(conv_id, str):
            conv_id = uuid.UUID(conv_id)
        self.db.query(Conversation).filter(Conversation.id == conv_id).update({
            "last_message_at": datetime.utcnow(),
            "last_message_text": last_text,
        })
        self.db.commit()
