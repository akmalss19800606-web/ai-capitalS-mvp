"""
DB Model for news articles aggregated from official RSS sources.
E1-02: NewsArticle — новости из cbu.uz, stat.uz, mf.uz, worldbank, imf, gazeta.uz
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.session import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    summary = Column(Text)
    source = Column(String(100))        # "cbu.uz" | "stat.uz" | "mf.uz" | "worldbank" | "imf" | "gazeta.uz"
    source_url = Column(String(1000))
    image_url = Column(String(1000), nullable=True)
    published_at = Column(DateTime, nullable=False)
    category = Column(String(50))       # "monetary_policy" | "statistics" | "fiscal" | "development" | "global" | "local"
    language = Column(String(10), default="ru")
    fetched_at = Column(DateTime, server_default=func.now())
    is_active = Column(Boolean, default=True)
