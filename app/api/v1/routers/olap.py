"""
OLAP Analytics API — аналитические запросы к star schema.
Фаза 1, Сессия 4 — STORE-OLAP-001

Endpoints:
  GET /analytics/olap/overview        — сводная панель (все ключевые метрики)
  GET /analytics/olap/time-series     — тренды по времени (месяц/квартал/год)
  GET /analytics/olap/breakdown       — группировка по измерению (category, geography, type, status, priority)
  GET /analytics/olap/portfolio-trend  — тренд по портфелям
  GET /analytics/olap/events          — сводка событий решений
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.olap import (
    DimTime, DimCompany, DimGeography, DimCategory,
    FactInvestmentPerformance, FactDecisionEvent, FactPortfolioSnapshot,
)
from app.schemas.olap import (
    OLAPOverviewResponse,
    OLAPTimeSeriesResponse, OLAPTimeSeriesItem,
    OLAPBreakdownResponse, OLAPBreakdownItem,
    OLAPPortfolioTrendResponse, OLAPPortfolioTrendItem,
    OLAPEventSummaryResponse, OLAPEventSummaryItem,
)

router = APIRouter(tags=["olap-analytics"])

# ─── Labels ───────────────────────────────────────────────────────────────────

CATEGORY_LABELS = {
    "equity": "Акции", "debt": "Долговые", "real_estate": "Недвижимость",
    "infrastructure": "Инфраструктура", "venture": "Венчурные", "other": "Прочее",
}

GEOGRAPHY_LABELS = {
    "UZ": "Узбекистан", "KZ": "Казахстан", "RU": "Россия", "US": "США",
    "GB": "Великобритания", "DE": "Германия", "CN": "Китай", "JP": "Япония",
    "AE": "ОАЭ", "TR": "Турция",
}

STATUS_LABELS = {
    "draft": "Черновик", "review": "На проверке", "approved": "Одобрено",
    "in_progress": "В работе", "completed": "Завершено", "rejected": "Отклонено",
}

TYPE_LABELS = {"BUY": "Купить", "SELL": "Продать", "HOLD": "Держать"}

PRIORITY_LABELS = {
    "low": "Низкий", "medium": "Средний", "high": "Высокий", "critical": "Критический",
}

EVENT_LABELS = {
    "create": "Создание", "status_change": "Смена статуса",
    "update": "Обновление", "workflow_action": "Действие workflow",
}


# ═══════════════════════════════════════════════════════════════════════════════
# ─── OVERVIEW ─────────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/analytics/olap/overview", response_model=OLAPOverviewResponse)
def get_olap_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Сводная OLAP-панель — все ключевые метрики."""
    base_q = db.query(FactInvestmentPerformance).filter(
        FactInvestmentPerformance.user_id == current_user.id
    )

    total_value = base_q.with_entities(sa_func.sum(FactInvestmentPerformance.total_value)).scalar() or 0
    total_count = base_q.count()
    avg_value = total_value / total_count if total_count else 0

    # Last ETL
    last_etl = base_q.with_entities(sa_func.max(FactInvestmentPerformance.created_at)).scalar()

    # Top categories
    cat_rows = (
        db.query(
            DimCategory.code,
            DimCategory.name,
            sa_func.sum(FactInvestmentPerformance.total_value).label("tv"),
            sa_func.count().label("cnt"),
        )
        .join(FactInvestmentPerformance, FactInvestmentPerformance.category_id == DimCategory.id)
        .filter(FactInvestmentPerformance.user_id == current_user.id)
        .group_by(DimCategory.code, DimCategory.name)
        .order_by(sa_func.sum(FactInvestmentPerformance.total_value).desc())
        .limit(5)
        .all()
    )
    top_categories = [
        OLAPBreakdownItem(
            dimension=r[0], label=r[1], total_value=round(r[2] or 0, 2),
            count=r[3], percentage=round((r[2] or 0) / total_value * 100, 1) if total_value else 0,
        ) for r in cat_rows
    ]

    # Top geographies
    geo_rows = (
        db.query(
            DimGeography.code,
            DimGeography.name,
            sa_func.sum(FactInvestmentPerformance.total_value).label("tv"),
            sa_func.count().label("cnt"),
        )
        .join(FactInvestmentPerformance, FactInvestmentPerformance.geography_id == DimGeography.id)
        .filter(FactInvestmentPerformance.user_id == current_user.id)
        .group_by(DimGeography.code, DimGeography.name)
        .order_by(sa_func.sum(FactInvestmentPerformance.total_value).desc())
        .limit(5)
        .all()
    )
    top_geographies = [
        OLAPBreakdownItem(
            dimension=r[0], label=r[1], total_value=round(r[2] or 0, 2),
            count=r[3], percentage=round((r[2] or 0) / total_value * 100, 1) if total_value else 0,
        ) for r in geo_rows
    ]

    # Monthly trend
    monthly_rows = (
        db.query(
            DimTime.year,
            DimTime.month,
            sa_func.sum(FactInvestmentPerformance.total_value).label("tv"),
            sa_func.count().label("cnt"),
            sa_func.avg(FactInvestmentPerformance.total_value).label("av"),
        )
        .join(FactInvestmentPerformance, FactInvestmentPerformance.time_id == DimTime.id)
        .filter(FactInvestmentPerformance.user_id == current_user.id)
        .group_by(DimTime.year, DimTime.month)
        .order_by(DimTime.year, DimTime.month)
        .all()
    )
    monthly_trend = [
        OLAPTimeSeriesItem(
            period=f"{r[0]}-{r[1]:02d}",
            total_value=round(r[2] or 0, 2),
            count=r[3],
            avg_value=round(r[4] or 0, 2),
        ) for r in monthly_rows
    ]

    # Status breakdown
    status_rows = (
        db.query(
            FactInvestmentPerformance.status,
            sa_func.sum(FactInvestmentPerformance.total_value).label("tv"),
            sa_func.count().label("cnt"),
        )
        .filter(FactInvestmentPerformance.user_id == current_user.id)
        .group_by(FactInvestmentPerformance.status)
        .all()
    )
    status_breakdown = [
        OLAPBreakdownItem(
            dimension=r[0], label=STATUS_LABELS.get(r[0], r[0]),
            total_value=round(r[1] or 0, 2), count=r[2],
            percentage=round((r[1] or 0) / total_value * 100, 1) if total_value else 0,
        ) for r in status_rows
    ]

    # Type breakdown
    type_rows = (
        db.query(
            FactInvestmentPerformance.decision_type,
            sa_func.sum(FactInvestmentPerformance.total_value).label("tv"),
            sa_func.count().label("cnt"),
        )
        .filter(FactInvestmentPerformance.user_id == current_user.id)
        .group_by(FactInvestmentPerformance.decision_type)
        .all()
    )
    type_breakdown = [
        OLAPBreakdownItem(
            dimension=r[0], label=TYPE_LABELS.get(r[0], r[0]),
            total_value=round(r[1] or 0, 2), count=r[2],
            percentage=round((r[1] or 0) / total_value * 100, 1) if total_value else 0,
        ) for r in type_rows
    ]

    return OLAPOverviewResponse(
        total_investment_value=round(total_value, 2),
        total_decisions=total_count,
        avg_decision_value=round(avg_value, 2),
        top_categories=top_categories,
        top_geographies=top_geographies,
        monthly_trend=monthly_trend,
        status_breakdown=status_breakdown,
        type_breakdown=type_breakdown,
        last_etl_run=last_etl,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ─── TIME SERIES ──────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/analytics/olap/time-series", response_model=OLAPTimeSeriesResponse)
def get_time_series(
    granularity: str = Query("month", description="month | quarter | year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Тренды по времени: сумма, количество, среднее значение."""
    if granularity == "month":
        group_cols = [DimTime.year, DimTime.month]
        label_fn = lambda r: f"{r[0]}-{r[1]:02d}"
    elif granularity == "quarter":
        group_cols = [DimTime.year, DimTime.quarter]
        label_fn = lambda r: f"{r[0]}-Q{r[1]}"
    elif granularity == "year":
        group_cols = [DimTime.year]
        label_fn = lambda r: str(r[0])
    else:
        raise HTTPException(status_code=422, detail="granularity: month | quarter | year")

    rows = (
        db.query(
            *group_cols,
            sa_func.sum(FactInvestmentPerformance.total_value).label("tv"),
            sa_func.count().label("cnt"),
            sa_func.avg(FactInvestmentPerformance.total_value).label("av"),
        )
        .join(DimTime, FactInvestmentPerformance.time_id == DimTime.id)
        .filter(FactInvestmentPerformance.user_id == current_user.id)
        .group_by(*group_cols)
        .order_by(*group_cols)
        .all()
    )

    items = [
        OLAPTimeSeriesItem(
            period=label_fn(r),
            total_value=round(r[-3] or 0, 2),
            count=r[-2],
            avg_value=round(r[-1] or 0, 2),
        ) for r in rows
    ]

    total_value = sum(i.total_value for i in items)
    total_count = sum(i.count for i in items)

    return OLAPTimeSeriesResponse(
        granularity=granularity,
        items=items,
        total_value=round(total_value, 2),
        total_count=total_count,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ─── BREAKDOWN ────────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/analytics/olap/breakdown", response_model=OLAPBreakdownResponse)
def get_breakdown(
    dimension: str = Query(..., description="category | geography | decision_type | status | priority"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Группировка по измерению."""
    base_q = db.query(FactInvestmentPerformance).filter(
        FactInvestmentPerformance.user_id == current_user.id
    )
    total_value = base_q.with_entities(sa_func.sum(FactInvestmentPerformance.total_value)).scalar() or 0
    total_count = base_q.count()

    if dimension == "category":
        rows = (
            db.query(
                DimCategory.code, DimCategory.name,
                sa_func.sum(FactInvestmentPerformance.total_value).label("tv"),
                sa_func.count().label("cnt"),
            )
            .join(FactInvestmentPerformance, FactInvestmentPerformance.category_id == DimCategory.id)
            .filter(FactInvestmentPerformance.user_id == current_user.id)
            .group_by(DimCategory.code, DimCategory.name)
            .order_by(sa_func.sum(FactInvestmentPerformance.total_value).desc())
            .all()
        )
        items = [OLAPBreakdownItem(
            dimension=r[0], label=r[1], total_value=round(r[2] or 0, 2),
            count=r[3], percentage=round((r[2] or 0) / total_value * 100, 1) if total_value else 0,
        ) for r in rows]

    elif dimension == "geography":
        rows = (
            db.query(
                DimGeography.code, DimGeography.name,
                sa_func.sum(FactInvestmentPerformance.total_value).label("tv"),
                sa_func.count().label("cnt"),
            )
            .join(FactInvestmentPerformance, FactInvestmentPerformance.geography_id == DimGeography.id)
            .filter(FactInvestmentPerformance.user_id == current_user.id)
            .group_by(DimGeography.code, DimGeography.name)
            .order_by(sa_func.sum(FactInvestmentPerformance.total_value).desc())
            .all()
        )
        items = [OLAPBreakdownItem(
            dimension=r[0], label=r[1], total_value=round(r[2] or 0, 2),
            count=r[3], percentage=round((r[2] or 0) / total_value * 100, 1) if total_value else 0,
        ) for r in rows]

    elif dimension in ("decision_type", "status", "priority"):
        col = getattr(FactInvestmentPerformance, dimension)
        labels_map = {
            "decision_type": TYPE_LABELS,
            "status": STATUS_LABELS,
            "priority": PRIORITY_LABELS,
        }[dimension]

        rows = (
            db.query(
                col,
                sa_func.sum(FactInvestmentPerformance.total_value).label("tv"),
                sa_func.count().label("cnt"),
            )
            .filter(FactInvestmentPerformance.user_id == current_user.id, col.isnot(None))
            .group_by(col)
            .order_by(sa_func.sum(FactInvestmentPerformance.total_value).desc())
            .all()
        )
        items = [OLAPBreakdownItem(
            dimension=r[0], label=labels_map.get(r[0], r[0]),
            total_value=round(r[1] or 0, 2), count=r[2],
            percentage=round((r[1] or 0) / total_value * 100, 1) if total_value else 0,
        ) for r in rows]

    else:
        raise HTTPException(status_code=422, detail="dimension: category | geography | decision_type | status | priority")

    return OLAPBreakdownResponse(
        dimension_name=dimension,
        items=items,
        total_value=round(total_value, 2),
        total_count=total_count,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ─── PORTFOLIO TREND ──────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/analytics/olap/portfolio-trend", response_model=OLAPPortfolioTrendResponse)
def get_portfolio_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Тренд портфелей по дням (из снимков)."""
    rows = (
        db.query(
            DimTime.full_date,
            FactPortfolioSnapshot.portfolio_name,
            FactPortfolioSnapshot.total_value,
            FactPortfolioSnapshot.decision_count,
        )
        .join(DimTime, FactPortfolioSnapshot.time_id == DimTime.id)
        .filter(FactPortfolioSnapshot.user_id == current_user.id)
        .order_by(DimTime.full_date.desc())
        .limit(100)
        .all()
    )

    items = [
        OLAPPortfolioTrendItem(
            period=str(r[0]),
            portfolio_name=r[1],
            total_value=round(r[2] or 0, 2),
            decision_count=r[3],
        ) for r in rows
    ]

    return OLAPPortfolioTrendResponse(items=items)


# ═══════════════════════════════════════════════════════════════════════════════
# ─── EVENT SUMMARY ────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/analytics/olap/events", response_model=OLAPEventSummaryResponse)
def get_event_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Сводка событий решений — количество по типу."""
    rows = (
        db.query(
            FactDecisionEvent.event_type,
            sa_func.count().label("cnt"),
        )
        .filter(FactDecisionEvent.user_id == current_user.id)
        .group_by(FactDecisionEvent.event_type)
        .order_by(sa_func.count().desc())
        .all()
    )

    total = sum(r[1] for r in rows)
    items = [
        OLAPEventSummaryItem(
            event_type=r[0],
            count=r[1],
            label=EVENT_LABELS.get(r[0], r[0]),
        ) for r in rows
    ]

    return OLAPEventSummaryResponse(
        period="all_time",
        items=items,
        total_events=total,
    )
