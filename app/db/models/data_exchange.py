"""
Модели БД для универсального импорта/экспорта.
Фаза 4, Сессия 1 — EXCH-IO-001.

Таблицы:
  - import_jobs          — задания на импорт (файл, статус, статистика)
  - import_field_mappings — маппинг внешних полей на внутреннюю модель
  - export_jobs          — задания на экспорт (формат, статус, результат)
"""
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    ForeignKey, JSON, Float,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class ImportJob(Base):
    """Задание на импорт данных (EXCH-IO-001.1–001.5)."""
    __tablename__ = "import_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    file_format = Column(String(20), nullable=False)  # csv | tsv | json | xml
    file_size_bytes = Column(Integer, nullable=True)
    target_entity = Column(String(50), nullable=False, default="decisions")  # decisions | portfolios | contacts
    status = Column(String(30), nullable=False, default="uploaded")
    # uploaded → mapping → validating → executing → completed | failed
    total_rows = Column(Integer, nullable=True)
    imported_rows = Column(Integer, default=0)
    skipped_rows = Column(Integer, default=0)
    error_rows = Column(Integer, default=0)
    errors_detail = Column(JSON, nullable=True)  # [{row: N, field: ..., error: ...}]
    preview_data = Column(JSON, nullable=True)  # первые 10 строк для предпросмотра
    raw_headers = Column(JSON, nullable=True)  # заголовки из файла
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # relationships
    user = relationship("User", foreign_keys=[user_id])
    field_mappings = relationship("ImportFieldMapping", back_populates="import_job", cascade="all, delete-orphan")


class ImportFieldMapping(Base):
    """Маппинг полей: внешнее поле → внутреннее поле (EXCH-IO-001.2)."""
    __tablename__ = "import_field_mappings"

    id = Column(Integer, primary_key=True, index=True)
    import_job_id = Column(Integer, ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    source_field = Column(String(200), nullable=False)  # название столбца из файла
    target_field = Column(String(200), nullable=False)  # поле внутренней модели
    transform_rule = Column(String(100), nullable=True)  # none | uppercase | lowercase | date_parse | number_parse
    default_value = Column(String(500), nullable=True)  # значение по умолчанию если пусто
    is_required = Column(Boolean, default=False)

    # relationships
    import_job = relationship("ImportJob", back_populates="field_mappings")


class ExportJob(Base):
    """Задание на экспорт данных (EXCH-IO-001.4)."""
    __tablename__ = "export_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    export_format = Column(String(20), nullable=False)  # csv | json | xlsx
    target_entity = Column(String(50), nullable=False, default="decisions")  # decisions | portfolios | tasks
    filters = Column(JSON, nullable=True)  # фильтры: {status: "approved", portfolio_id: 1}
    status = Column(String(30), nullable=False, default="pending")  # pending → generating → completed | failed
    total_rows = Column(Integer, nullable=True)
    result_data = Column(JSON, nullable=True)  # данные или ссылка на файл
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # relationships
    user = relationship("User", foreign_keys=[user_id])
