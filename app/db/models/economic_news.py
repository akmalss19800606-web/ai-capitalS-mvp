"""Модель экономических новостей Узбекистана."""
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.sql import func
from app.db.session import Base


class EconomicNews(Base):
    __tablename__ = "economic_news"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    summary = Column(Text, nullable=True)
    url = Column(String(1000), nullable=False, unique=True)
    source = Column(String(100), nullable=False)  # cbu.uz, gazeta.uz, mf.uz
    category = Column(String(50), default="market")  # official, market, banks, investment
    published_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_economic_news_published", "published_at"),
        Index("ix_economic_news_source", "source"),
    )