"""
Pydantic-схемы: Генератор отчётов.
Фаза 2, Сессия 4.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# ═══════════════════════════════════════════════════════════════
# REQUEST
# ═══════════════════════════════════════════════════════════════

class ReportGenerateRequest(BaseModel):
    template_key: str = Field(description="Ключ шаблона: investment_memo | quarterly_report | portfolio_report | analytical_note")
    title: Optional[str] = None
    portfolio_id: Optional[int] = None
    decision_id: Optional[int] = None
    selected_sections: Optional[List[str]] = None    # какие разделы включить
    selected_metrics: Optional[List[str]] = None     # какие метрики включить
    period_label: Optional[str] = None               # "Q1 2026", "2025" и т.д.


# ═══════════════════════════════════════════════════════════════
# RESPONSE — NESTED
# ═══════════════════════════════════════════════════════════════

class TemplateSectionSchema(BaseModel):
    section_key: str
    title: str
    required: bool = False
    description: Optional[str] = None


class TemplateMetricSchema(BaseModel):
    metric_key: str
    label: str
    category: Optional[str] = None


class ReportTemplateResponse(BaseModel):
    id: int
    name: str
    template_key: str
    description: Optional[str] = None
    sections: List[TemplateSectionSchema]
    available_metrics: Optional[List[TemplateMetricSchema]] = None
    is_system: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ReportSectionContent(BaseModel):
    section_key: str
    title: str
    text: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    table: Optional[List[Dict[str, Any]]] = None
    chart_type: Optional[str] = None       # bar | pie | line | radar | none
    chart_data: Optional[List[Dict[str, Any]]] = None


class ReportInstanceResponse(BaseModel):
    id: int
    user_id: int
    template_key: str
    title: str
    portfolio_id: Optional[int] = None
    decision_id: Optional[int] = None
    selected_sections: Optional[List[str]] = None
    selected_metrics: Optional[List[str]] = None
    content: List[ReportSectionContent]
    executive_summary: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
