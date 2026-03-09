from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base

class AIChatLog(Base):
    __tablename__ = "ai_chat_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    provider = Column(String, nullable=False)
    model = Column(String)
    prompt = Column(Text)
    response = Column(Text)
    tokens_used = Column(Integer)
    latency_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
