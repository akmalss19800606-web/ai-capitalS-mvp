"""
dashboard.py — Консолидированный модуль дашбордов.
Объединяет: dashboard summary + dashboard builder (конструктор).
Phase 1 REF-001: merged from dashboard.py + dashboards.py + dashboard_realdata.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import Optional

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.db.models.investment_decision import (
    DecisionCategory,
    DecisionPriority,
    DecisionStatus,
    DecisionType,
    InvestmentDecision,
)
from app.services.dashboard_builder_service import (
    list_dashboards, get_dashboard, create_dashboard,
    update_dashboard, delete_dashboard,
    add_widget, update_widget, delete_widget, batch_update_layout,
    widget_data, WIDGET_TYPES,
)

# ══════════════════════════════════════════════════════════════════
#  Router 1: /dashboard  — Main dashboard summary
# ══════════════════════════════════════════════════════════════════
router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated dashboard data for the main panel."""

    # --- Portfolio stats ---
    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.owner_id == current_user.id)
        .all()
    )
    total_portfolio_value = sum(p.total_value or 0 for p in portfolios)
    portfolio_count = len(portfolios)

    # --- Decisions ---
    decisions = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.created_by == current_user.id)
        .all()
    )
    total_decisions = len(decisions)

    active_statuses = {
        DecisionStatus.DRAFT,
        DecisionStatus.REVIEW,
        DecisionStatus.APPROVED,
        DecisionStatus.IN_PROGRESS,
    }
    active_decisions = sum(1 for d in decisions if d.status in active_statuses)
    total_investment_value = sum(d.total_value or 0.0 for d in decisions)

    # --- Breakdowns ---
    status_counts: dict = {s.value: 0 for s in DecisionStatus}
    for d in decisions:
        key = d.status.value if hasattr(d.status, "value") else d.status
        status_counts[key] = status_counts.get(key, 0) + 1

    type_counts: dict = {t.value: 0 for t in DecisionType}
    for d in decisions:
        key = d.decision_type.value if hasattr(d.decision_type, "value") else d.decision_type
        type_counts[key] = type_counts.get(key, 0) + 1

    priority_counts: dict = {p.value: 0 for p in DecisionPriority}
    for d in decisions:
        if d.priority is not None:
            key = d.priority.value if hasattr(d.priority, "value") else d.priority
            priority_counts[key] = priority_counts.get(key, 0) + 1

    category_counts: dict = {c.value: 0 for c in DecisionCategory}
    for d in decisions:
        if d.category is not None:
            key = d.category.value if hasattr(d.category, "value") else d.category
            category_counts[key] = category_counts.get(key, 0) + 1

    geography_counts: dict = {}
    for d in decisions:
        if d.geography:
            geography_counts[d.geography] = geography_counts.get(d.geography, 0) + 1

    # --- Recent decisions ---
    recent = sorted(
        decisions,
        key=lambda x: x.created_at or "",
        reverse=True,
    )[:5]

    recent_list = [
        {
            "id": d.id,
            "asset_name": d.asset_name,
            "asset_symbol": d.asset_symbol,
            "decision_type": d.decision_type.value if hasattr(d.decision_type, "value") else d.decision_type,
            "amount": d.amount,
            "price": d.price,
            "total_value": d.total_value,
            "status": d.status.value if hasattr(d.status, "value") else d.status,
            "priority": d.priority.value if hasattr(d.priority, "value") else d.priority,
            "category": d.category.value if hasattr(d.category, "value") else d.category,
            "geography": d.geography,
            "portfolio_id": d.portfolio_id,
            "created_at": str(d.created_at) if d.created_at else None,
        }
        for d in recent
    ]

    high_priority_decisions = [
        d for d in decisions
        if d.priority in (DecisionPriority.HIGH, DecisionPriority.CRITICAL)
        and d.status in active_statuses
    ]

    return {
        "total_portfolio_value": round(total_portfolio_value, 2),
        "portfolio_count": portfolio_count,
        "portfolios": [
            {"id": p.id, "name": p.name, "total_value": round(p.total_value or 0, 2)}
            for p in portfolios
        ],
        "total_decisions": total_decisions,
        "active_decisions": active_decisions,
        "total_investment_value": round(total_investment_value, 2),
        "high_priority_count": len(high_priority_decisions),
        "status_counts": status_counts,
        "type_counts": type_counts,
        "priority_counts": priority_counts,
        "category_counts": category_counts,
        "geography_counts": geography_counts,
        "recent_decisions": recent_list,
    }


# ══════════════════════════════════════════════════════════════════
#  Router 2: /dashboards  — Dashboard Builder (конструктор)
# ══════════════════════════════════════════════════════════════════
builder_router = APIRouter(prefix="/dashboards", tags=["Dashboards — Конструктор дашбордов"])


@builder_router.get("/widget-types")
def get_widget_types():
    """Каталог доступных типов виджетов."""
    return WIDGET_TYPES


@builder_router.get("")
def list_user_dashboards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список сохранённых дашбордов пользователя."""
    return list_dashboards(db, current_user.id)


@builder_router.get("/{dashboard_id}")
def get_dashboard_detail(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить дашборд с виджетами."""
    result = get_dashboard(db, dashboard_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Дашборд не найден")
    return result


@builder_router.post("")
def create_new_dashboard(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать настраиваемый дашборд."""
    return create_dashboard(db, current_user.id, data)


@builder_router.put("/{dashboard_id}")
def update_existing_dashboard(
    dashboard_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить метаданные дашборда."""
    result = update_dashboard(db, dashboard_id, current_user.id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Дашборд не найден")
    return result


@builder_router.delete("/{dashboard_id}")
def delete_existing_dashboard(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить дашборд."""
    ok = delete_dashboard(db, dashboard_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Дашборд не найден")
    return {"status": "deleted"}


@builder_router.post("/{dashboard_id}/widgets")
def add_new_widget(
    dashboard_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Добавить виджет на дашборд."""
    result = add_widget(db, dashboard_id, current_user.id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Дашборд не найден")
    return result


@builder_router.put("/widgets/{widget_id}")
def update_existing_widget(
    widget_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить виджет."""
    result = update_widget(db, widget_id, current_user.id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Виджет не найден")
    return result


@builder_router.delete("/widgets/{widget_id}")
def delete_existing_widget(
    widget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить виджет."""
    ok = delete_widget(db, widget_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Виджет не найден")
    return {"status": "deleted"}


@builder_router.put("/{dashboard_id}/layout")
def update_layout(
    dashboard_id: int,
    layout: list = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Batch-обновление позиций виджетов после drag-and-drop."""
    ok = batch_update_layout(db, dashboard_id, current_user.id, layout)
    if not ok:
        raise HTTPException(status_code=404, detail="Дашборд не найден")
    return {"status": "layout_updated"}


@builder_router.get("/widget-data/{widget_type}")
def get_widget_data(
    widget_type: str,
    metric: str = Query("total_value", description="Метрика для виджета"),
    portfolio_id: Optional[int] = Query(None, description="Фильтр по портфелю"),
    drill_into: Optional[str] = Query(None, description="Drill-down в конкретное значение"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Данные для виджета с кросс-фильтрацией и drill-down."""
    return widget_data(db, current_user.id, widget_type, metric, portfolio_id, drill_into)
