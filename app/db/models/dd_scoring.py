"""
Модели: Due Diligence Scoring.
Фаза 2, Сессия 3.

DD-SCORE-001.1 — Автоматический скоринг по 6 категориям
DD-CL-001.1    — Интерактивный чеклист проверки
DD-BENCH-001.1 — Бенчмарки по отрасли/географии
"""
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, JSON, Text, Boolean
from sqlalchemy.sql import func
from app.db.session import Base


class DueDiligenceScore(Base):
    """Результат DD-скоринга решения/компании."""
    __tablename__ = "dd_scores"

    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("investment_decisions.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Входные параметры
    company_name = Column(String(200), nullable=False)
    industry = Column(String(100), nullable=True)
    geography = Column(String(100), nullable=True, default="Узбекистан")

    # Общий скоринг 0-100
    total_score = Column(Float, nullable=False)
    risk_level = Column(String(30), nullable=False)  # low / medium / high / critical

    # Скоры по 6 категориям (каждый 0-100)
    financial_score = Column(Float, nullable=False)
    legal_score = Column(Float, nullable=False)
    operational_score = Column(Float, nullable=False)
    market_score = Column(Float, nullable=False)
    management_score = Column(Float, nullable=False)
    esg_score = Column(Float, nullable=False)

    # Детализация: [{category, subcategory, score, weight, findings, recommendation}]
    category_details = Column(JSON, nullable=True)

    # Чеклист: [{id, category, item, status, priority, note}]
    checklist = Column(JSON, nullable=True)
    checklist_completion_pct = Column(Float, nullable=True)

    # Бенчмарки: [{benchmark_name, benchmark_score, delta, percentile}]
    benchmarks = Column(JSON, nullable=True)

    # Красные флаги: [{flag, severity, description}]
    red_flags = Column(JSON, nullable=True)

    # Рекомендация (текст)
    recommendation = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
