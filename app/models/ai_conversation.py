import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(160), nullable=False, default="Cuộc trò chuyện mới")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class AIMessage(Base):
    __tablename__ = "ai_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(
        String,
        ForeignKey("ai_conversations.id"),
        nullable=False,
        index=True,
    )
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    context_month = Column(Integer, nullable=True)
    context_year = Column(Integer, nullable=True)
    evidence_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
