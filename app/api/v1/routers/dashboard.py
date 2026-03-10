"""
REF-001: Consolidated dashboard router.
Merges: dashboard.py (summary) + dashboards.py (dashboard builder).
DASH-001: Real data endpoint with Redis caching.
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

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Also create a sub-router for /dashboards to keep backward compatibility
builder_router = APIRouter(prefix="/dashboards", tags=["Dashboard Builder"])


# ═══════════════════════════════════════════════════════════════
# Dashboard Summary (from old dashboard.py)
# ═══════════════════════════════════════════════════════════════

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated dashboard data for the main panel."""
    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.owner_id == current_user.id)
        .all()
    )
    total_portfolio_value = sum(p.total_value or 0 for p in portfolios)
    portfolio_count = len(portfolios)

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

    recent = sorted(decisions, key=lambda x: x.created_at or "", reverse=True)[:5]
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


# ═══════════════════════════════════════════════════════════════
# DASH-001: Real Data Endpoint (Redis-cached)
# ═══════════════════════════════════════════════════════════════

@router.get("/realdata")
async def get_dashboard_realdata(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    DASH-001: Dashboard real-time data via Redis cache.
    Returns currencies (cbu.uz), stock market, CPI, macro data.
    """
    from app.services.currency_service import get_latest_rates_cached
    from app.services.redis_cache_service import RedisCacheService

    # 1. Currency rates (Redis TTL 6h)
    try:
        raw_rates = await get_latest_rates_cached(
            codes=["USD", "EUR", "GBP", "RUB", "CNY", "JPY", "KZT", "CHF"]
        )
        currencies = [
            {
                "code": r.get("Ccy", "").strip(),
                "name_ru": r.get("CcyNm_RU", ""),
                "rate": float(str(r.get("Rate", "0")).replace(",", ".")),
                "diff": float(str(r.get("Diff", "0")).replace(",", ".")),
                "date": r.get("Date", ""),
            }
            for r in raw_rates
        ]
    except Exception:
        currencies = []

    # 2. Stock market summary (from DB)
    try:
        from app.services.stock_exchange_service import get_stock_summary
        stock_market = get_stock_summary(db)
    except Exception:
        stock_market = {
            "total_issuers": 0, "total_trades": 0,
            "total_volume": 0, "total_turnover": 0, "top_issuers": [],
        }

    # 3. CPI data summary
    try:
        from app.services.cpi_data_service import get_cpi_summary
        cpi = get_cpi_summary(db)
    except Exception:
        cpi = {"categories_count": 0, "data_points": 0}

    # 4. Company lookup summary
    try:
        from app.services.company_lookup_service import get_company_summary
        companies = get_company_summary(db)
    except Exception:
        companies = {"total_cached": 0, "sources": []}

    # 5. Macro data (Redis TTL 24h)
    try:
        from app.services.macro_data_service import fetch_indicator
        macro: dict = {}
        gdp_data = await fetch_indicator("NY.GDP.MKTP.CD", per_page=1)
        if gdp_data:
            macro["gdp_total"] = gdp_data[0]["value"]
            macro["data_year"] = gdp_data[0].get("date")

        growth_data = await fetch_indicator("NY.GDP.MKTP.KD.ZG", per_page=1)
        if growth_data:
            macro["gdp_growth_pct"] = round(growth_data[0]["value"], 1)

        inflation_data = await fetch_indicator("FP.CPI.TOTL.ZG", per_page=1)
        if inflation_data:
            macro["inflation_pct"] = round(inflation_data[0]["value"], 1)

        pop_data = await fetch_indicator("SP.POP.TOTL", per_page=1)
        if pop_data:
            macro["population_mln"] = round(pop_data[0]["value"] / 1_000_000, 1)
    except Exception:
        macro = {}

    from datetime import datetime
    return {
        "currencies": currencies,
        "stock_market": stock_market,
        "cpi": cpi,
        "companies": companies,
        "macro": macro,
        "data_freshness": datetime.utcnow().isoformat(),
    }


# ═══════════════════════════════════════════════════════════════
# Dashboard Builder (from old dashboards.py)
# ═══════════════════════════════════════════════════════════════

@builder_router.get("/widget-types")
def get_widget_types():
    """Каталог доступных типов виджетов."""
    return WIDGET_TYPES


@builder_router.get("")
def list_user_dashboards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_dashboards(db, current_user.id)


@builder_router.get("/{dashboard_id}")
def get_dashboard_detail(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    return create_dashboard(db, current_user.id, data)


@builder_router.put("/{dashboard_id}")
def update_existing_dashboard(
    dashboard_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    ok = batch_update_layout(db, dashboard_id, current_user.id, layout)
    if not ok:
        raise HTTPException(status_code=404, detail="Дашборд не найден")
    return {"status": "layout_updated"}


@builder_router.get("/widget-data/{widget_type}")
def get_widget_data(
    widget_type: str,
    metric: str = Query("total_value"),
    portfolio_id: Optional[int] = Query(None),
    drill_into: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return widget_data(db, current_user.id, widget_type, metric, portfolio_id, drill_into)
