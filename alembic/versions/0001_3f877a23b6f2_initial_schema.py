"""Initial schema — all 56 tables.

Revision ID: 3f877a23b6f2
Revises:
Create Date: 2026-03-09

Этап 0, Сессия 0.3.
Начальная миграция: создаёт все таблицы из текущих моделей.
Для существующих БД: помечает как выполненную через `alembic stamp head`.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect

revision: str = "3f877a23b6f2"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Создание всех таблиц.
    Использует Base.metadata.create_all с checkfirst=True,
    чтобы безопасно работать как с пустой БД, так и с существующей.
    """
    from app.db.base import Base  # noqa
    bind = op.get_bind()

    # Проверяем: если таблица users уже существует — БД не пустая
    inspector = sa_inspect(bind)
    existing_tables = inspector.get_table_names()

    if "users" in existing_tables:
        # БД уже содержит таблицы — создаём только недостающие
        Base.metadata.create_all(bind=bind, checkfirst=True)
        op.execute("SELECT 1")  # no-op для Alembic
    else:
        # Пустая БД — создаём все таблицы
        Base.metadata.create_all(bind=bind)

    # ── Таблицы (для справки, 56 штук): ──
    # users, roles, portfolios, investment_decisions,
    # decision_versions, audit_events, decision_relationships,
    # workflow_definitions, workflow_instances, workflow_steps,
    # dim_time, dim_company, dim_geography, dim_category,
    # fact_investment_performance, fact_decision_events, fact_portfolio_snapshots,
    # monte_carlo_simulations, shap_analyses, portfolio_optimizations,
    # stress_tests, retrospectives, dd_scores,
    # report_templates, report_instances,
    # dashboard_configs, dashboard_widgets,
    # mfa_settings, sso_providers, user_sessions,
    # abac_policies, custom_roles, decision_access,
    # thread_comments, task_items, notifications, user_preferences,
    # import_jobs, import_field_mappings, export_jobs,
    # api_keys, webhook_subscriptions, webhook_delivery_log, api_usage_log,
    # market_data_sources, market_data_cache,
    # crm_contacts, crm_deals, documents, document_versions,
    # comparable_companies,
    # system_events, hitl_reviews, analytics_snapshots,
    # event_bus_messages, system_constraints,
    # currency_rates


def downgrade() -> None:
    """Удалить все таблицы (ОПАСНО — только для разработки)."""
    from app.db.base import Base  # noqa
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
