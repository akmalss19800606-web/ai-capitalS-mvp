"""
olap.py — OLAP Analytics endpoints.
Restored: provides /analytics/olap/* endpoints for the frontend Analytics page.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.db.models.olap import (
    DimTime, DimCompany, DimGeography, DimCategory,
    FactInvestmentPerformance, FactDecisionEvent, FactPortfolioSnapshot,
)
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.portfolio import Portfolio

router = APIRouter(prefix="/analytics/olap", tags=["OLAP Analytics"])


def _safe_query(db, *args, **kwargs):
    """Wrap query to handle missing tables gracefully."""
    try:
        return db.query(*args, **kwargs)
    except Exception:
        return None


@router.get("/overview")
def olap_overview(db: Session = Depends(get_db)):
    """OLAP overview: totals, breakdowns."""
    try:
        total_decisions = db.query(func.count(InvestmentDecision.id)).scalar() or 0
        total_value = db.query(func.sum(InvestmentDecision.total_value)).scalar() or 0
        avg_value = db.query(func.avg(InvestmentDecision.total_value)).scalar() or 0

        # Top categories
        cat_rows = db.query(
            InvestmentDecision.category,
            func.sum(InvestmentDecision.total_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
        ).group_by(InvestmentDecision.category).order_by(func.sum(InvestmentDecision.total_value).desc()).limit(10).all()

        top_categories = [
            {"dimension": "category", "label": r.category or "N/A",
             "total_value": float(r.total_value or 0), "count": r.count,
             "percentage": round(float(r.total_value or 0) / float(total_value) * 100, 1) if total_value else 0}
            for r in cat_rows
        ]

        # Top geographies
        geo_rows = db.query(
            InvestmentDecision.geography,
            func.sum(InvestmentDecision.total_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
        ).filter(InvestmentDecision.geography.isnot(None)
        ).group_by(InvestmentDecision.geography).order_by(func.sum(InvestmentDecision.total_value).desc()).limit(10).all()

        top_geographies = [
            {"dimension": "geography", "label": r.geography or "N/A",
             "total_value": float(r.total_value or 0), "count": r.count,
             "percentage": round(float(r.total_value or 0) / float(total_value) * 100, 1) if total_value else 0}
            for r in geo_rows
        ]

        # Status breakdown
        status_rows = db.query(
            InvestmentDecision.status,
            func.sum(InvestmentDecision.total_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
        ).group_by(InvestmentDecision.status).all()

        status_breakdown = [
            {"dimension": "status", "label": r.status or "N/A",
             "total_value": float(r.total_value or 0), "count": r.count,
             "percentage": round(float(r.total_value or 0) / float(total_value) * 100, 1) if total_value else 0}
            for r in status_rows
        ]

        # Type breakdown
        type_rows = db.query(
            InvestmentDecision.decision_type,
            func.sum(InvestmentDecision.total_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
        ).group_by(InvestmentDecision.decision_type).all()

        type_breakdown = [
            {"dimension": "type", "label": r.decision_type or "N/A",
             "total_value": float(r.total_value or 0), "count": r.count,
             "percentage": round(float(r.total_value or 0) / float(total_value) * 100, 1) if total_value else 0}
            for r in type_rows
        ]

        # Monthly trend
        monthly = db.query(
            func.date_trunc('month', InvestmentDecision.created_at).label("period"),
            func.sum(InvestmentDecision.total_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
            func.avg(InvestmentDecision.total_value).label("avg_value"),
        ).group_by("period").order_by("period").limit(24).all()

        monthly_trend = [
            {"period": str(r.period)[:10] if r.period else "N/A",
             "total_value": float(r.total_value or 0), "count": r.count,
             "avg_value": round(float(r.avg_value or 0), 2)}
            for r in monthly
        ]

        return {
            "total_investment_value": round(float(total_value), 2),
            "total_decisions": total_decisions,
            "avg_decision_value": round(float(avg_value), 2),
            "top_categories": top_categories,
            "top_geographies": top_geographies,
            "monthly_trend": monthly_trend,
            "status_breakdown": status_breakdown,
            "type_breakdown": type_breakdown,
            "last_etl_run": None,
        }
    except Exception as e:
        return {
            "total_investment_value": 0,
            "total_decisions": 0,
            "avg_decision_value": 0,
            "top_categories": [],
            "top_geographies": [],
            "monthly_trend": [],
            "status_breakdown": [],
            "type_breakdown": [],
            "last_etl_run": None,
            "error": str(e),
        }


@router.get("/time-series")
def olap_time_series(
    granularity: str = Query("month", description="month|quarter|year"),
    db: Session = Depends(get_db),
):
    """Time series of investment values."""
    try:
        trunc = func.date_trunc(granularity, InvestmentDecision.created_at)
        rows = db.query(
            trunc.label("period"),
            func.sum(InvestmentDecision.total_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
            func.avg(InvestmentDecision.total_value).label("avg_value"),
        ).group_by("period").order_by("period").all()
        return [{"period": str(r.period)[:10], "total_value": float(r.total_value or 0),
                 "count": r.count, "avg_value": round(float(r.avg_value or 0), 2)} for r in rows]
    except Exception:
        return []


@router.get("/breakdown")
def olap_breakdown(
    dimension: str = Query("category", description="category|geography|status|type"),
    db: Session = Depends(get_db),
):
    """Breakdown by dimension."""
    col_map = {
        "category": InvestmentDecision.category,
        "geography": InvestmentDecision.geography,
        "status": InvestmentDecision.status,
        "type": InvestmentDecision.decision_type,
    }
    col = col_map.get(dimension, InvestmentDecision.category)
    try:
        total = db.query(func.sum(InvestmentDecision.total_value)).scalar() or 0
        rows = db.query(
            col.label("label"),
            func.sum(InvestmentDecision.total_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
        ).group_by(col).order_by(func.sum(InvestmentDecision.total_value).desc()).all()
        return [{"dimension": dimension, "label": r.label or "N/A",
                 "total_value": float(r.total_value or 0), "count": r.count,
                 "percentage": round(float(r.total_value or 0) / float(total) * 100, 1) if total else 0}
                for r in rows]
    except Exception:
        return []


@router.get("/portfolio-trend")
def olap_portfolio_trend(db: Session = Depends(get_db)):
    """Portfolio value trend over time."""
    try:
        rows = db.query(
            func.date_trunc('month', InvestmentDecision.created_at).label("period"),
            Portfolio.name.label("portfolio_name"),
            func.sum(InvestmentDecision.total_value).label("total_value"),
        ).join(Portfolio, InvestmentDecision.portfolio_id == Portfolio.id
        ).group_by("period", Portfolio.name).order_by("period").all()
        return [{"period": str(r.period)[:10], "portfolio_name": r.portfolio_name,
                 "total_value": float(r.total_value or 0)} for r in rows]
    except Exception:
        return []


@router.get("/events")
def olap_events(db: Session = Depends(get_db)):
    """Recent decision events."""
    try:
        rows = db.query(InvestmentDecision).order_by(
            InvestmentDecision.updated_at.desc()
        ).limit(50).all()
        return [{"id": r.id, "title": r.asset_name, "status": r.status,
                 "category": r.category, "updated_at": str(r.updated_at)} for r in rows]
    except Exception:
        return []


# ── Задача 10: POST /olap/etl-balance ────────────────────────────────────
@router.post("/etl-balance", tags=["OLAP ETL"])
def run_balance_etl(
    org_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Запуск ETL: balance_entries -> fact_balance_olap.
    org_id=None — обработать все организации."""
    from app.services.olap_etl_service import run_etl
    return run_etl(db, org_id=org_id)


# — Tasks 19-25: Drill-down, Cross-tab, KPI, Compare, Heatmap, ETL endpoints ————

@router.get("/drill-down")
def olap_drill_down(
    dimension: str = Query("category", description="category|geography|status|type"),
    value: str = Query(..., description="Value to drill down into"),
    sub_dimension: str = Query("status", description="Sub-dimension to break by"),
    db: Session = Depends(get_db),
):
    """Drill down: break a dimension value by sub-dimension."""
    col_map = {
        "category": InvestmentDecision.category,
        "geography": InvestmentDecision.geography,
        "status": InvestmentDecision.status,
        "type": InvestmentDecision.decision_type,
    }
    col = col_map.get(dimension, InvestmentDecision.category)
    sub_col = col_map.get(sub_dimension, InvestmentDecision.status)
    try:
        rows = db.query(
            sub_col.label("sub_label"),
            func.sum(InvestmentDecision.total_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
        ).filter(col == value).group_by(sub_col).order_by(
            func.sum(InvestmentDecision.total_value).desc()
        ).all()
        return [
            {"dimension": dimension, "value": value,
             "sub_dimension": sub_dimension, "sub_label": r.sub_label or "N/A",
             "total_value": float(r.total_value or 0), "count": r.count}
            for r in rows
        ]
    except Exception:
        return []


@router.get("/cross-tab")
def olap_cross_tab(
    row_dim: str = Query("category", description="Row dimension"),
    col_dim: str = Query("status", description="Column dimension"),
    db: Session = Depends(get_db),
):
    """Cross-tab (pivot): row_dim x col_dim by total_value."""
    col_map = {
        "category": InvestmentDecision.category,
        "geography": InvestmentDecision.geography,
        "status": InvestmentDecision.status,
        "type": InvestmentDecision.decision_type,
    }
    row_col = col_map.get(row_dim, InvestmentDecision.category)
    col_col = col_map.get(col_dim, InvestmentDecision.status)
    try:
        rows = db.query(
            row_col.label("row_label"),
            col_col.label("col_label"),
            func.sum(InvestmentDecision.total_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
        ).group_by(row_col, col_col).order_by(row_col, col_col).all()
        result = {}
        for r in rows:
            rk = r.row_label or "N/A"
            ck = r.col_label or "N/A"
            if rk not in result:
                result[rk] = {}
            result[rk][ck] = {"total_value": float(r.total_value or 0), "count": r.count}
        return {"row_dimension": row_dim, "col_dimension": col_dim, "data": result}
    except Exception:
        return {"row_dimension": row_dim, "col_dimension": col_dim, "data": {}}

@router.get("/kpi")
def olap_kpi(db: Session = Depends(get_db)):
    """Key Performance Indicators for dashboard."""
    try:
        total_value = db.query(func.sum(InvestmentDecision.total_value)).scalar() or 0
        total_decisions = db.query(func.count(InvestmentDecision.id)).scalar() or 0
        avg_value = db.query(func.avg(InvestmentDecision.total_value)).scalar() or 0
        active_count = db.query(func.count(InvestmentDecision.id)).filter(
            InvestmentDecision.status == "active"
        ).scalar() or 0
        completed_count = db.query(func.count(InvestmentDecision.id)).filter(
            InvestmentDecision.status == "completed"
        ).scalar() or 0
        # Month-over-month growth
        from datetime import date
        now = datetime.utcnow()
        first_this_month = now.replace(day=1, hour=0, minute=0, second=0)
        first_last_month = (first_this_month - timedelta(days=1)).replace(day=1)
        this_month_value = db.query(func.sum(InvestmentDecision.total_value)).filter(
            InvestmentDecision.created_at >= first_this_month
        ).scalar() or 0
        last_month_value = db.query(func.sum(InvestmentDecision.total_value)).filter(
            InvestmentDecision.created_at >= first_last_month,
            InvestmentDecision.created_at < first_this_month,
        ).scalar() or 0
        mom_growth = round(
            (float(this_month_value) - float(last_month_value)) / float(last_month_value) * 100, 2
        ) if last_month_value else 0
        return {
            "total_portfolio_value": round(float(total_value), 2),
            "total_decisions": total_decisions,
            "avg_decision_value": round(float(avg_value), 2),
            "active_decisions": active_count,
            "completed_decisions": completed_count,
            "this_month_value": round(float(this_month_value), 2),
            "last_month_value": round(float(last_month_value), 2),
            "mom_growth_pct": mom_growth,
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/compare")
def olap_compare(
    dimension: str = Query("category", description="Dimension to compare"),
    items: str = Query(..., description="Comma-separated values to compare"),
    db: Session = Depends(get_db),
):
    """Compare multiple dimension values side by side."""
    col_map = {
        "category": InvestmentDecision.category,
        "geography": InvestmentDecision.geography,
        "status": InvestmentDecision.status,
        "type": InvestmentDecision.decision_type,
    }
    col = col_map.get(dimension, InvestmentDecision.category)
    item_list = [i.strip() for i in items.split(",") if i.strip()]
    try:
        result = []
        for item in item_list:
            row = db.query(
                func.sum(InvestmentDecision.total_value).label("total_value"),
                func.count(InvestmentDecision.id).label("count"),
                func.avg(InvestmentDecision.total_value).label("avg_value"),
            ).filter(col == item).one_or_none()
            result.append({
                "label": item,
                "total_value": float(row.total_value or 0) if row else 0,
                "count": row.count if row else 0,
                "avg_value": round(float(row.avg_value or 0), 2) if row else 0,
            })
        return {"dimension": dimension, "items": result}
    except Exception as e:
        return {"dimension": dimension, "items": [], "error": str(e)}


@router.get("/heatmap")
def olap_heatmap(
    x_dim: str = Query("category", description="X axis dimension"),
    y_dim: str = Query("geography", description="Y axis dimension"),
    db: Session = Depends(get_db),
):
    """Heatmap data: x_dim vs y_dim with total_value intensity."""
    col_map = {
        "category": InvestmentDecision.category,
        "geography": InvestmentDecision.geography,
        "status": InvestmentDecision.status,
        "type": InvestmentDecision.decision_type,
    }
    x_col = col_map.get(x_dim, InvestmentDecision.category)
    y_col = col_map.get(y_dim, InvestmentDecision.geography)
    try:
        rows = db.query(
            x_col.label("x"),
            y_col.label("y"),
            func.sum(InvestmentDecision.total_value).label("value"),
            func.count(InvestmentDecision.id).label("count"),
        ).group_by(x_col, y_col).all()
        return {
            "x_dimension": x_dim,
            "y_dimension": y_dim,
            "data": [
                {"x": r.x or "N/A", "y": r.y or "N/A",
                 "value": float(r.value or 0), "count": r.count}
                for r in rows
            ]
        }
    except Exception as e:
        return {"x_dimension": x_dim, "y_dimension": y_dim, "data": [], "error": str(e)}
