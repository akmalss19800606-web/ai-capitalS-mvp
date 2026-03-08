"""
Модели БД для адаптеров внешних систем.
Фаза 4, Сессия 3 — EXCH-ADAPT-001.

Таблицы:
  - market_data_sources   — конфигурация источников рыночных данных
  - market_data_cache     — кэш полученных данных
  - crm_contacts          — контакты из CRM (dealflow)
  - crm_deals             — сделки CRM pipeline
  - documents             — управление документами (DMS)
  - document_versions     — версии документов
  - comparable_companies  — мультипликаторы comparable companies
"""
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    ForeignKey, JSON, Float, Enum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class MarketDataSource(Base):
    """Источник рыночных данных (EXCH-ADAPT-001.1)."""
    __tablename__ = "market_data_sources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)  # "Alpha Vantage", "Yahoo Finance", "World Bank"
    provider = Column(String(50), nullable=False)  # alpha_vantage, yahoo_finance, world_bank
    api_key = Column(String(500), nullable=True)  # зашифрованный ключ
    base_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    config = Column(JSON, nullable=True)  # доп. параметры: symbols, interval и т.д.
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_interval_minutes = Column(Integer, default=60)  # интервал автообновления
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationships
    user = relationship("User", foreign_keys=[user_id])
    cache_entries = relationship("MarketDataCache", back_populates="source", cascade="all, delete-orphan")


class MarketDataCache(Base):
    """Кэш рыночных данных (EXCH-ADAPT-001.1, 001.2)."""
    __tablename__ = "market_data_cache"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("market_data_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)  # AAPL, GDP, CPI
    data_type = Column(String(50), nullable=False)  # quote, timeseries, macro, benchmark
    data = Column(JSON, nullable=False)  # полный ответ API
    period = Column(String(20), nullable=True)  # daily, weekly, monthly, quarterly
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # relationships
    source = relationship("MarketDataSource", back_populates="cache_entries")


class CrmContact(Base):
    """Контакт CRM (EXCH-ADAPT-001.3)."""
    __tablename__ = "crm_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    external_id = Column(String(200), nullable=True)  # ID в HubSpot/Salesforce
    first_name = Column(String(200), nullable=False)
    last_name = Column(String(200), nullable=True)
    email = Column(String(300), nullable=True)
    phone = Column(String(50), nullable=True)
    company = Column(String(300), nullable=True)
    position = Column(String(200), nullable=True)
    contact_type = Column(String(50), nullable=False, default="investor")  # investor, founder, advisor, partner
    tags = Column(JSON, nullable=True)  # ["angel", "series-a", "fintech"]
    notes = Column(Text, nullable=True)
    crm_source = Column(String(50), nullable=True)  # hubspot, salesforce, manual
    last_interaction_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    user = relationship("User", foreign_keys=[user_id])
    deals = relationship("CrmDeal", back_populates="contact", cascade="all, delete-orphan")


class CrmDeal(Base):
    """Сделка CRM pipeline (EXCH-ADAPT-001.3)."""
    __tablename__ = "crm_deals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id = Column(Integer, ForeignKey("crm_contacts.id", ondelete="SET NULL"), nullable=True, index=True)
    external_id = Column(String(200), nullable=True)
    title = Column(String(300), nullable=False)
    stage = Column(String(50), nullable=False, default="lead")  # lead, qualified, proposal, negotiation, closed_won, closed_lost
    amount = Column(Float, nullable=True)  # сумма сделки
    currency = Column(String(10), default="USD")
    probability = Column(Float, nullable=True)  # 0..100
    expected_close_date = Column(DateTime(timezone=True), nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    crm_source = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    user = relationship("User", foreign_keys=[user_id])
    contact = relationship("CrmContact", back_populates="deals")


class Document(Base):
    """Документ DMS (EXCH-ADAPT-001.4)."""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # contract, report, memo, due_diligence, term_sheet
    tags = Column(JSON, nullable=True)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True)  # bytes
    current_version = Column(Integer, default=1)
    is_archived = Column(Boolean, default=False)
    # полнотекстовый поиск (для MVP — simple LIKE, позже tsvector)
    search_content = Column(Text, nullable=True)  # извлечённый текст для поиска
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    user = relationship("User", foreign_keys=[user_id])
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")


class DocumentVersion(Base):
    """Версия документа DMS (EXCH-ADAPT-001.4)."""
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    file_path = Column(String(1000), nullable=True)  # путь к файлу или S3 key
    file_name = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    change_notes = Column(Text, nullable=True)  # описание изменений
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationships
    document = relationship("Document", back_populates="versions")


class ComparableCompany(Base):
    """Comparable company multiples (EXCH-ADAPT-001.5)."""
    __tablename__ = "comparable_companies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_name = Column(String(300), nullable=False)
    ticker = Column(String(20), nullable=True)
    sector = Column(String(100), nullable=True)
    industry = Column(String(200), nullable=True)
    country = Column(String(100), nullable=True)
    market_cap = Column(Float, nullable=True)  # USD
    revenue = Column(Float, nullable=True)
    ebitda = Column(Float, nullable=True)
    net_income = Column(Float, nullable=True)
    # Мультипликаторы
    ev_revenue = Column(Float, nullable=True)  # EV/Revenue
    ev_ebitda = Column(Float, nullable=True)  # EV/EBITDA
    pe_ratio = Column(Float, nullable=True)  # P/E
    pb_ratio = Column(Float, nullable=True)  # P/B
    ps_ratio = Column(Float, nullable=True)  # P/S
    dividend_yield = Column(Float, nullable=True)
    # Метаданные
    data_date = Column(DateTime(timezone=True), nullable=True)
    source = Column(String(100), nullable=True)  # alpha_vantage, manual, yahoo_finance
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    user = relationship("User", foreign_keys=[user_id])
