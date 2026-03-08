"""
Обновлённый db/base.py — импорт всех моделей для auto-create tables.
Фаза 1, Сессия 3 — добавлены модели Workflow.
"""
from app.db.session import Base
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.workflow import WorkflowDefinition, WorkflowInstance, WorkflowStep
