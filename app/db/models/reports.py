"""
Модели: Генератор отчётов.
Фаза 2, Сессия 4.

VIS-RPT-001.1 — Шаблонизированные отчёты (Investment Memo, Quarterly, Portfolio, Аналитическая записка)
VIS-RPT-001.2 — Конструктор отчётов (выбор разделов, метрик, визуализаций)
VIS-RPT-001.3 — NLG — генерация текстовых executive summary
VIS-RPT-001.4 — Экспорт (JSON-представление отчёта для рендеринга на клиенте)
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text, Boolean, Float
from sqlalchemy.sql import func
from app.db.session import Base


class ReportTemplate(Base):
    """Шаблоны отчётов."""
    __tablename__ = "report_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    template_key = Column(String(50), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    # Разделы шаблона: [{section_key, title, required, description}]
    sections = Column(JSON, nullable=False)

    # Метрики доступные в шаблоне: [{metric_key, label, category}]
    available_metrics = Column(JSON, nullable=True)

    is_system = Column(Boolean, default=True)  # системный или пользовательский
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ReportInstance(Base):
    """Сгенерированный экземпляр отчёта."""
    __tablename__ = "report_instances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_key = Column(String(50), nullable=False)
    title = Column(String(300), nullable=False)

    # Привязка
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=True)
    decision_id = Column(Integer, ForeignKey("investment_decisions.id"), nullable=True)

    # Конфигурация: какие разделы и метрики выбрал пользователь
    selected_sections = Column(JSON, nullable=True)
    selected_metrics = Column(JSON, nullable=True)

    # Сгенерированный контент
    content = Column(JSON, nullable=False)      # [{section_key, title, data, charts, tables}]
    executive_summary = Column(Text, nullable=True)   # NLG-сгенерированное резюме
    meta = Column(JSON, nullable=True)                 # доп. мета (даты, автор, и т.д.)

    # Статус
    status = Column(String(30), default="completed")   # generating | completed | failed

    created_at = Column(DateTime(timezone=True), server_default=func.now())
