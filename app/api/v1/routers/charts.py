"""
charts.py — Фаза 3, Сессия 1.
API-эндпоинты для расширенных визуализаций (VIS-CHART-001.1–001.4).
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.services.chart_service import (
    build_waterfall,
    build_tornado,
    build_bubble,
    build_heatmap,
)

router = APIRouter(prefix="/charts", tags=["Charts — Расширенные визуализации"])


@router.get("/waterfall")
def get_waterfall(
    portfolio_id: Optional[int] = Query(None, description="Фильтр по портфелю"),
    db: Session = Depends(get_db),
):
    """VIS-CHART-001.1 — Waterfall (каскадная диаграмма изменений)."""
    return build_waterfall(db, portfolio_id)


@router.get("/tornado")
def get_tornado(
    portfolio_id: Optional[int] = Query(None, description="Фильтр по портфелю"),
    db: Session = Depends(get_db),
):
    """VIS-CHART-001.2 — Tornado (диаграмма чувствительности)."""
    return build_tornado(db, portfolio_id)


@router.get("/bubble")
def get_bubble(
    portfolio_id: Optional[int] = Query(None, description="Фильтр по портфелю"),
    db: Session = Depends(get_db),
):
    """VIS-CHART-001.3 — Bubble (пузырьковая диаграмма)."""
    return build_bubble(db, portfolio_id)


@router.get("/heatmap")
def get_heatmap(
    portfolio_id: Optional[int] = Query(None, description="Фильтр по портфелю"),
    db: Session = Depends(get_db),
):
    """VIS-CHART-001.4 — Heatmap (тепловая карта корреляций)."""
    return build_heatmap(db, portfolio_id)
