"""QuickAskRecord — история быстрых вопросов UZ Market (E5-03)."""
import uuid
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base


class QuickAskRecord(Base):
    __tablename__ = "quick_ask_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    provider = Column(String(50), nullable=False, default="groq")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
