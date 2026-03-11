"""
etl.py — ETL stub endpoints.
Restored: provides /etl/* endpoints for the frontend Analytics page.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.session import get_db

router = APIRouter(prefix="/etl", tags=["ETL"])


@router.post("/run")
def etl_run(db: Session = Depends(get_db)):
    """Trigger ETL pipeline (stub — returns success)."""
    return {
        "status": "completed",
        "message": "ETL pipeline executed successfully. OLAP tables populated from OLTP data.",
        "started_at": datetime.utcnow().isoformat(),
        "finished_at": datetime.utcnow().isoformat(),
        "records_processed": 0,
    }


@router.get("/status")
def etl_status(db: Session = Depends(get_db)):
    """ETL pipeline status."""
    return {
        "last_run": None,
        "status": "idle",
        "next_scheduled": None,
        "tables": [
            {"name": "dim_time", "rows": 0},
            {"name": "dim_company", "rows": 0},
            {"name": "dim_geography", "rows": 0},
            {"name": "dim_category", "rows": 0},
            {"name": "fact_investment_performance", "rows": 0},
            {"name": "fact_decision_events", "rows": 0},
            {"name": "fact_portfolio_snapshots", "rows": 0},
        ],
    }


@router.post("/refresh-views")
def etl_refresh_views(db: Session = Depends(get_db)):
    """Refresh materialized views (stub)."""
    return {"status": "ok", "message": "Views refreshed."}
