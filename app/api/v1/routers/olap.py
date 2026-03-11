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
        total_value = db.query(func.sum(InvestmentDecision.expected_value)).scalar() or 0
        avg_value = db.query(func.avg(InvestmentDecision.expected_value)).scalar() or 0

        # Top categories
        cat_rows = db.query(
            InvestmentDecision.category,
            func.sum(InvestmentDecision.expected_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
        ).group_by(InvestmentDecision.category).order_by(func.sum(InvestmentDecision.expected_value).desc()).limit(10).all()

        top_categories = [
            {"dimension": "category", "label": r.category or "N/A",
             "total_value": float(r.total_value or 0), "count": r.count,
             "percentage": round(float(r.total_value or 0) / float(total_value) * 100, 1) if total_value else 0}
            for r in cat_rows
        ]

        # Top geographies
        geo_rows = db.query(
            InvestmentDecision.geography,
            func.sum(InvestmentDecision.expected_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
        ).filter(InvestmentDecision.geography.isnot(None)
        ).group_by(InvestmentDecision.geography).order_by(func.sum(InvestmentDecision.expected_value).desc()).limit(10).all()

        top_geographies = [
            {"dimension": "geography", "label": r.geography or "N/A",
             "total_value": float(r.total_value or 0), "count": r.count,
             "percentage": round(float(r.total_value or 0) / float(total_value) * 100, 1) if total_value else 0}
            for r in geo_rows
        ]

        # Status breakdown
        status_rows = db.query(
            InvestmentDecision.status,
            func.sum(InvestmentDecision.expected_value).label("total_value"),
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
            func.sum(InvestmentDecision.expected_value).label("total_value"),
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
            func.sum(InvestmentDecision.expected_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
            func.avg(InvestmentDecision.expected_value).label("avg_value"),
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
            func.sum(InvestmentDecision.expected_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
            func.avg(InvestmentDecision.expected_value).label("avg_value"),
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
        total = db.query(func.sum(InvestmentDecision.expected_value)).scalar() or 0
        rows = db.query(
            col.label("label"),
            func.sum(InvestmentDecision.expected_value).label("total_value"),
            func.count(InvestmentDecision.id).label("count"),
        ).group_by(col).order_by(func.sum(InvestmentDecision.expected_value).desc()).all()
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
            func.sum(InvestmentDecision.expected_value).label("total_value"),
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
        return [{"id": r.id, "title": r.title, "status": r.status,
                 "category": r.category, "updated_at": str(r.updated_at)} for r in rows]
    except Exception:
        return []
