"""
dashboard_config.py — Фаза 3, Сессия 2.
Модели DashboardConfig и DashboardWidget.
VIS-DASH-001.3 / 001.5: настраиваемые дашборды + сохранение конфигураций.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class DashboardConfig(Base):
    __tablename__ = "dashboard_configs"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)
    is_shared = Column(Boolean, default=False)
    # Глобальные фильтры дашборда (JSON-строка)
    global_filters = Column(Text, nullable=True)  # {"portfolio_id": 1, "period": "quarter"}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    widgets = relationship("DashboardWidget", back_populates="dashboard", cascade="all, delete-orphan")


class DashboardWidget(Base):
    __tablename__ = "dashboard_widgets"

    id = Column(Integer, primary_key=True, index=True)
    dashboard_id = Column(Integer, ForeignKey("dashboard_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    widget_type = Column(String(50), nullable=False)  # kpi, bar_chart, pie_chart, line_chart, table, waterfall, tornado, bubble, heatmap
    title = Column(String(200), nullable=False)
    # Позиция и размер (для grid layout)
    pos_x = Column(Integer, default=0)
    pos_y = Column(Integer, default=0)
    width = Column(Integer, default=6)   # в grid-единицах (из 12)
    height = Column(Integer, default=4)  # в grid-единицах
    # Настройки виджета (JSON-строка)
    config = Column(Text, nullable=True)  # {"metric": "total_value", "portfolio_id": null, ...}
    # Порядок отображения
    sort_order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    dashboard = relationship("DashboardConfig", back_populates="widgets")
