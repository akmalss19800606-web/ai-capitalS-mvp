"""
Модель Portfolio — обновлённая для Этапа 0, Сессия 0.2.
Добавлено поле currency (валюта по умолчанию, default 'UZS').
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    total_value = Column(Float, default=0.0)
    currency = Column(String(10), default="UZS", nullable=False)  # Сессия 0.2: валюта
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="portfolios")
    decisions = relationship("InvestmentDecision", back_populates="portfolio")
