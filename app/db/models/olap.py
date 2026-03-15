"""
OLAP Star Schema — fact-таблицы и dimension-таблицы.

Архитектура:
  Dimensions:
    dim_time          — временное измерение (год, квартал, месяц, день)
    dim_company       — компания / актив
    dim_geography     — география инвестиции
    dim_category      — категория инвестиции

  Facts:
    fact_investment_performance — ключевая факт-таблица (amount, price, total_value, return)
    fact_decision_events       — события решений (создание, изменение статуса)
    fact_portfolio_snapshots    — снимки портфелей по дням

Фаза 1, Сессия 4 — STORE-OLAP-001
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


# ═══════════════════════════════════════════════════════════════════════════════
# ─── DIMENSIONS ───────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class DimTime(Base):
    """Временное измерение — денормализованные поля для быстрой группировки."""
    __tablename__ = "dim_time"

    id = Column(Integer, primary_key=True, index=True)
    full_date = Column(Date, unique=True, nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    quarter = Column(Integer, nullable=False)          # 1-4
    month = Column(Integer, nullable=False, index=True)
    month_name = Column(String, nullable=False)        # "Январь", "Февраль", ...
    week = Column(Integer, nullable=False)             # ISO week number
    day = Column(Integer, nullable=False)
    day_of_week = Column(Integer, nullable=False)      # 0=Mon, 6=Sun
    day_name = Column(String, nullable=False)          # "Понедельник", ...
    is_weekend = Column(Integer, default=0)            # 0 or 1


class DimCompany(Base):
    """Измерение компании / актива."""
    __tablename__ = "dim_company"

    id = Column(Integer, primary_key=True, index=True)
    asset_name = Column(String, nullable=False)
    asset_symbol = Column(String, nullable=False, index=True)
    sector = Column(String, nullable=True)             # Сектор (tech, finance, ...)
    source_decision_id = Column(Integer, nullable=True)  # Ссылка на OLTP
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DimGeography(Base):
    """Измерение географии."""
    __tablename__ = "dim_geography"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)  # "UZ", "KZ", "US"
    name = Column(String, nullable=False)              # "Узбекистан", "Казахстан"
    region = Column(String, nullable=True)             # "Центральная Азия", "Северная Америка"


class DimCategory(Base):
    """Измерение категории инвестиции."""
    __tablename__ = "dim_category"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)  # "equity", "debt", ...
    name = Column(String, nullable=False)              # "Акции", "Долговые"


# ═══════════════════════════════════════════════════════════════════════════════
# ─── FACT TABLES ──────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class FactInvestmentPerformance(Base):
    """
    Факт-таблица производительности инвестиций.
    Одна запись на решение на дату (daily grain).
    """
    __tablename__ = "fact_investment_performance"

    id = Column(Integer, primary_key=True, index=True)
    time_id = Column(Integer, ForeignKey("dim_time.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("dim_company.id"), nullable=False, index=True)
    geography_id = Column(Integer, ForeignKey("dim_geography.id"), nullable=True, index=True)
    category_id = Column(Integer, ForeignKey("dim_category.id"), nullable=True, index=True)

    # Measures
    decision_id = Column(Integer, nullable=False, index=True)   # OLTP source
    user_id = Column(Integer, nullable=False)
    decision_type = Column(String, nullable=False)     # BUY, SELL, HOLD
    status = Column(String, nullable=False)
    priority = Column(String, nullable=True)
    amount = Column(Float, nullable=False, default=0)
    price = Column(Float, nullable=False, default=0)
    total_value = Column(Float, nullable=False, default=0)
    target_return = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_fact_perf_time_company", "time_id", "company_id"),
        Index("ix_fact_perf_decision", "decision_id", "time_id"),
    )


class FactDecisionEvent(Base):
    """
    Факт-таблица событий решений (event sourcing grain).
    Каждое действие — создание, обновление статуса, workflow action.
    """
    __tablename__ = "fact_decision_events"

    id = Column(Integer, primary_key=True, index=True)
    time_id = Column(Integer, ForeignKey("dim_time.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("dim_company.id"), nullable=True)

    decision_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False)
    event_type = Column(String, nullable=False)        # "create", "status_change", "update", "workflow_action"
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    event_detail = Column(Text, nullable=True)         # JSON or text description

    event_timestamp = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_fact_events_time_type", "time_id", "event_type"),
    )


class FactPortfolioSnapshot(Base):
    """
    Факт-таблица снимков портфелей (daily grain).
    Агрегат — суммарные показатели портфеля на конкретную дату.
    """
    __tablename__ = "fact_portfolio_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    time_id = Column(Integer, ForeignKey("dim_time.id"), nullable=False, index=True)

    portfolio_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False)
    portfolio_name = Column(String, nullable=False)
    total_value = Column(Float, nullable=False, default=0)
    decision_count = Column(Integer, nullable=False, default=0)
    active_count = Column(Integer, nullable=False, default=0)
    completed_count = Column(Integer, nullable=False, default=0)
    avg_amount = Column(Float, nullable=True)
    max_amount = Column(Float, nullable=True)
    min_amount = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_fact_snap_time_portfolio", "time_id", "portfolio_id"),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ─── BALANCE OLAP DIMENSIONS (Аналитика v1.0, задачи 2-4) ──────────────────
# ═══════════════════════════════════════════════════════════════════════════════


class DimAccount(Base):
    """Измерение счёта / статьи баланса."""
    __tablename__ = "dim_account"

    id = Column(Integer, primary_key=True, index=True)
    account_code = Column(String(20), unique=True, nullable=False, index=True)
    account_name = Column(String(200), nullable=False)
    account_type = Column(String(50), nullable=True)  # asset, liability, equity, revenue, expense
    parent_code = Column(String(20), nullable=True)    # для иерархии
    level = Column(Integer, default=1)                 # глубина в иерархии
    is_leaf = Column(Integer, default=1)               # 1=конечный, 0=группирующий


class DimCurrency(Base):
    """Измерение валюты."""
    __tablename__ = "dim_currency"

    id = Column(Integer, primary_key=True, index=True)
    currency_code = Column(String(3), unique=True, nullable=False, index=True)  # UZS, USD, EUR, RUB
    currency_name = Column(String(100), nullable=False)
    exchange_rate_to_uzs = Column(Float, nullable=True)  # курс к UZS


class DimDataType(Base):
    """Измерение типа данных — balance, turnover, budget, forecast."""
    __tablename__ = "dim_data_type"

    id = Column(Integer, primary_key=True, index=True)
    data_type_code = Column(String(20), unique=True, nullable=False, index=True)
    data_type_name = Column(String(100), nullable=False)


# ═══════════════════════════════════════════════════════════════════════════════
# ─── BALANCE OLAP FACT TABLE (Аналитика v1.0, задачи 5-6) ──────────────────
# ═══════════════════════════════════════════════════════════════════════════════


class FactBalanceOLAP(Base):
    """
    Факт-таблица баланса OLAP.
    Данные из balance_entries, агрегированные через ETL.
    FK на все dimension-таблицы.
    """
    __tablename__ = "fact_balance_olap"

    id = Column(Integer, primary_key=True, index=True)
    dim_time_id = Column(Integer, ForeignKey("dim_time.id"), nullable=False, index=True)
    dim_company_id = Column(Integer, ForeignKey("dim_company.id"), nullable=False, index=True)
    dim_account_id = Column(Integer, ForeignKey("dim_account.id"), nullable=False, index=True)
    dim_currency_id = Column(Integer, ForeignKey("dim_currency.id"), nullable=True, index=True)
    dim_data_type_id = Column(Integer, ForeignKey("dim_data_type.id"), nullable=True, index=True)

    # Measures
    amount = Column(Float, nullable=False, default=0)
    debit = Column(Float, nullable=False, default=0)
    credit = Column(Float, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    dim_time = relationship("DimTime", backref="fact_balances")
    dim_company = relationship("DimCompany", backref="fact_balances")
    dim_account = relationship("DimAccount", backref="fact_balances")
    dim_currency = relationship("DimCurrency", backref="fact_balances")
    dim_data_type = relationship("DimDataType", backref="fact_balances")

    __table_args__ = (
        Index("ix_fact_balance_time_company", "dim_time_id", "dim_company_id"),
        Index("ix_fact_balance_account", "dim_account_id", "dim_time_id"),
        Index("ix_fact_balance_full", "dim_time_id", "dim_company_id", "dim_account_id"),
    )
