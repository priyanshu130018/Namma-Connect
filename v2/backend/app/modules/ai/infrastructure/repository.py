"""AI conversation infrastructure repository."""

import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.modules.ai.domain.models import AIConversation, AIMessage


class AIRepository:
    """Encapsulates database operations for AI conversations and message histories."""

    def __init__(self, db: Session):
        self.db = db

    def create_conversation(
        self,
        user_id: Optional[uuid.UUID],
        title: str = "New Trip Planning",
        context_type: str = "TRAVEL",
    ) -> AIConversation:
        conv = AIConversation(
            id=uuid.uuid4(),
            user_id=user_id,
            title=title,
            context_type=context_type,
        )
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def get_conversation(self, conv_id) -> Optional[AIConversation]:
        if isinstance(conv_id, str):
            try:
                conv_id = uuid.UUID(conv_id)
            except ValueError:
                return None
        return self.db.query(AIConversation).filter(AIConversation.id == conv_id).first()

    def list_user_conversations(
        self,
        user_id,
        context_type: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[AIConversation], int]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        q = self.db.query(AIConversation).filter(AIConversation.user_id == user_id)
        if context_type:
            q = q.filter(AIConversation.context_type == context_type)
        total = q.count()
        items = q.order_by(desc(AIConversation.updated_at)).offset(offset).limit(limit).all()
        return items, total

    def save_conversation(self, conv: AIConversation) -> AIConversation:
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def delete_conversation(self, conv_id, user_id) -> bool:
        if isinstance(conv_id, str):
            conv_id = uuid.UUID(conv_id)
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        conv = (
            self.db.query(AIConversation)
            .filter(AIConversation.id == conv_id, AIConversation.user_id == user_id)
            .first()
        )
        if not conv:
            return False
        self.db.delete(conv)
        self.db.commit()
        return True

    def save_message(self, msg: AIMessage) -> AIMessage:
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def list_messages(self, conv_id, limit: int = 50) -> List[AIMessage]:
        if isinstance(conv_id, str):
            conv_id = uuid.UUID(conv_id)
        return (
            self.db.query(AIMessage)
            .filter(AIMessage.conversation_id == conv_id)
            .order_by(AIMessage.created_at.asc())
            .limit(limit)
            .all()
        )
