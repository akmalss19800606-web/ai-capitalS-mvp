"""
dashboards.py — Фаза 3, Сессия 2.
API-эндпоинты для конструктора динамических дашбордов (VIS-DASH-001.1–001.5).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import Optional

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.services.dashboard_builder_service import (
    list_dashboards, get_dashboard, create_dashboard,
    update_dashboard, delete_dashboard,
    add_widget, update_widget, delete_widget, batch_update_layout,
    widget_data, WIDGET_TYPES,
)

router = APIRouter(prefix="/dashboards", tags=["Dashboards — Конструктор дашбордов"])


# ─── Widget type catalog ──────────────────────────────────────────────────

@router.get("/widget-types")
def get_widget_types(
    current_user: User = Depends(get_current_user),
):
    """Каталог доступных типов виджетов."""
    return WIDGET_TYPES


# ─── Dashboard CRUD ───────────────────────────────────────────────────────

@router.get("")
def list_user_dashboards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """VIS-DASH-001.5: список сохранённых дашбордов пользователя."""
    return list_dashboards(db, current_user.id)


@router.get("/{dashboard_id}")
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


@router.post("")
def create_new_dashboard(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """VIS-DASH-001.3/001.5: создать настраиваемый дашборд."""
    return create_dashboard(db, current_user.id, data)


@router.put("/{dashboard_id}")
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


@router.delete("/{dashboard_id}")
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


# ─── Widget CRUD ──────────────────────────────────────────────────────────

@router.post("/{dashboard_id}/widgets")
def add_new_widget(
    dashboard_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """VIS-DASH-001.3: добавить виджет на дашборд."""
    result = add_widget(db, dashboard_id, current_user.id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Дашборд не найден")
    return result


@router.put("/widgets/{widget_id}")
def update_existing_widget(
    widget_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить виджет (позицию, настройки, тип)."""
    result = update_widget(db, widget_id, current_user.id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Виджет не найден")
    return result


@router.delete("/widgets/{widget_id}")
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


@router.put("/{dashboard_id}/layout")
def update_layout(
    dashboard_id: int,
    layout: list = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """VIS-DASH-001.3: batch-обновление позиций виджетов после drag-and-drop."""
    ok = batch_update_layout(db, dashboard_id, current_user.id, layout)
    if not ok:
        raise HTTPException(status_code=404, detail="Дашборд не найден")
    return {"status": "layout_updated"}


# ─── Widget Data ──────────────────────────────────────────────────────────

@router.get("/widget-data/{widget_type}")
def get_widget_data(
    widget_type: str,
    metric: str = Query("total_value", description="Метрика для виджета"),
    portfolio_id: Optional[int] = Query(None, description="Фильтр по портфелю"),
    drill_into: Optional[str] = Query(None, description="VIS-DASH-001.2: drill-down в конкретное значение"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """VIS-DASH-001.1/001.2: данные для виджета с кросс-фильтрацией и drill-down."""
    return widget_data(db, current_user.id, widget_type, metric, portfolio_id, drill_into)
