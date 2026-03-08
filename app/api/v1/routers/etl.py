"""
ETL Pipeline — извлечение данных из OLTP и загрузка в OLAP star schema.
Фаза 1, Сессия 4 — STORE-OLAP-001.2

Endpoints:
  POST /etl/run      — запустить полный ETL цикл
  GET  /etl/status    — статус последнего запуска
  POST /etl/refresh-views — обновить materialized views
"""
import time
from datetime import date, datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func as sa_func, text
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.olap import (
    DimTime, DimCompany, DimGeography, DimCategory,
    FactInvestmentPerformance, FactDecisionEvent, FactPortfolioSnapshot,
)
from app.schemas.olap import ETLRunResponse, ETLStatusResponse

router = APIRouter(tags=["etl"])

# ─── Month / Day names (Russian) ─────────────────────────────────────────────

MONTH_NAMES = {
    1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
    5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
    9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь",
}
DAY_NAMES = {
    0: "Понедельник", 1: "Вторник", 2: "Среда", 3: "Четверг",
    4: "Пятница", 5: "Суббота", 6: "Воскресенье",
}

GEOGRAPHY_NAMES = {
    "UZ": ("Узбекистан", "Центральная Азия"),
    "KZ": ("Казахстан", "Центральная Азия"),
    "RU": ("Россия", "СНГ"),
    "US": ("США", "Северная Америка"),
    "GB": ("Великобритания", "Европа"),
    "DE": ("Германия", "Европа"),
    "CN": ("Китай", "Азия"),
    "JP": ("Япония", "Азия"),
    "AE": ("ОАЭ", "Ближний Восток"),
    "TR": ("Турция", "Ближний Восток"),
}

CATEGORY_NAMES = {
    "equity": "Акции",
    "debt": "Долговые",
    "real_estate": "Недвижимость",
    "infrastructure": "Инфраструктура",
    "venture": "Венчурные",
    "other": "Прочее",
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _ensure_dim_time(db: Session, d: date) -> int:
    """Создать запись dim_time для даты, если не существует. Вернуть id."""
    existing = db.query(DimTime).filter(DimTime.full_date == d).first()
    if existing:
        return existing.id

    iso_cal = d.isocalendar()
    dt = DimTime(
        full_date=d,
        year=d.year,
        quarter=(d.month - 1) // 3 + 1,
        month=d.month,
        month_name=MONTH_NAMES.get(d.month, str(d.month)),
        week=iso_cal[1],
        day=d.day,
        day_of_week=d.weekday(),
        day_name=DAY_NAMES.get(d.weekday(), ""),
        is_weekend=1 if d.weekday() >= 5 else 0,
    )
    db.add(dt)
    db.flush()
    return dt.id


def _ensure_dim_company(db: Session, asset_name: str, asset_symbol: str, decision_id: int) -> int:
    """Создать или найти dim_company. Вернуть id."""
    existing = db.query(DimCompany).filter(
        DimCompany.asset_symbol == asset_symbol,
        DimCompany.source_decision_id == decision_id,
    ).first()
    if existing:
        return existing.id

    dc = DimCompany(
        asset_name=asset_name,
        asset_symbol=asset_symbol,
        source_decision_id=decision_id,
    )
    db.add(dc)
    db.flush()
    return dc.id


def _ensure_dim_geography(db: Session, code: str) -> int:
    """Создать или найти dim_geography. Вернуть id."""
    if not code:
        return None
    code_upper = code.upper().strip()
    existing = db.query(DimGeography).filter(DimGeography.code == code_upper).first()
    if existing:
        return existing.id

    geo_info = GEOGRAPHY_NAMES.get(code_upper, (code_upper, "Другое"))
    dg = DimGeography(code=code_upper, name=geo_info[0], region=geo_info[1])
    db.add(dg)
    db.flush()
    return dg.id


def _ensure_dim_category(db: Session, code: str) -> int:
    """Создать или найти dim_category. Вернуть id."""
    if not code:
        return None
    code_lower = code.lower().strip()
    existing = db.query(DimCategory).filter(DimCategory.code == code_lower).first()
    if existing:
        return existing.id

    cat_name = CATEGORY_NAMES.get(code_lower, code_lower.capitalize())
    dc = DimCategory(code=code_lower, name=cat_name)
    db.add(dc)
    db.flush()
    return dc.id


# ═══════════════════════════════════════════════════════════════════════════════
# ─── ETL RUN ──────────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/etl/run", response_model=ETLRunResponse)
def run_etl(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Полный ETL цикл: извлечь данные из OLTP (decisions, portfolios),
    загрузить в star schema OLAP.
    """
    start_time = time.time()
    today = date.today()

    # ── 1. Load dimensions ────────────────────────────────────────────────

    dim_time_count = 0
    dim_company_count = 0
    dim_geography_count = 0
    dim_category_count = 0

    # Pre-fill dim_time for last 365 days
    for i in range(365):
        d = today - timedelta(days=i)
        before = db.query(DimTime).count()
        _ensure_dim_time(db, d)
        after = db.query(DimTime).count()
        if after > before:
            dim_time_count += 1

    # ── 2. Load facts from decisions ──────────────────────────────────────

    decisions = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.created_by == current_user.id)
        .all()
    )

    fact_perf_count = 0
    fact_event_count = 0

    for d in decisions:
        # Decision date
        dec_date = d.created_at.date() if d.created_at else today

        # Ensure dimensions
        time_id = _ensure_dim_time(db, dec_date)
        company_id = _ensure_dim_company(db, d.asset_name, d.asset_symbol, d.id)

        geo_code = d.geography if hasattr(d, "geography") else None
        geography_id = _ensure_dim_geography(db, geo_code) if geo_code else None

        cat_code = (d.category.value if hasattr(d.category, "value") else d.category) if hasattr(d, "category") and d.category else None
        category_id = _ensure_dim_category(db, cat_code) if cat_code else None

        if geography_id:
            dim_geography_count += 1
        if category_id:
            dim_category_count += 1
        dim_company_count += 1

        # Check if fact already exists for this decision
        existing_fact = (
            db.query(FactInvestmentPerformance)
            .filter(
                FactInvestmentPerformance.decision_id == d.id,
                FactInvestmentPerformance.time_id == time_id,
            )
            .first()
        )

        if not existing_fact:
            fact = FactInvestmentPerformance(
                time_id=time_id,
                company_id=company_id,
                geography_id=geography_id,
                category_id=category_id,
                decision_id=d.id,
                user_id=d.created_by,
                decision_type=d.decision_type.value if hasattr(d.decision_type, "value") else d.decision_type,
                status=d.status.value if hasattr(d.status, "value") else d.status,
                priority=(d.priority.value if hasattr(d.priority, "value") else d.priority) if hasattr(d, "priority") and d.priority else None,
                amount=d.amount or 0,
                price=d.price or 0,
                total_value=d.total_value or (d.amount or 0) * (d.price or 0),
                target_return=d.target_return if hasattr(d, "target_return") else None,
                risk_level=d.risk_level if hasattr(d, "risk_level") else None,
            )
            db.add(fact)
            fact_perf_count += 1

        # Create event fact: "create" event
        existing_event = (
            db.query(FactDecisionEvent)
            .filter(
                FactDecisionEvent.decision_id == d.id,
                FactDecisionEvent.event_type == "create",
            )
            .first()
        )
        if not existing_event:
            event = FactDecisionEvent(
                time_id=time_id,
                company_id=company_id,
                decision_id=d.id,
                user_id=d.created_by,
                event_type="create",
                new_status=d.status.value if hasattr(d.status, "value") else d.status,
                event_detail=f"Создано решение: {d.asset_name} ({d.asset_symbol})",
                event_timestamp=d.created_at or datetime.now(timezone.utc),
            )
            db.add(event)
            fact_event_count += 1

    # ── 3. Load portfolio snapshots ───────────────────────────────────────

    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.owner_id == current_user.id)
        .all()
    )

    today_time_id = _ensure_dim_time(db, today)
    fact_snap_count = 0

    for p in portfolios:
        # Check if snapshot for today already exists
        existing_snap = (
            db.query(FactPortfolioSnapshot)
            .filter(
                FactPortfolioSnapshot.portfolio_id == p.id,
                FactPortfolioSnapshot.time_id == today_time_id,
            )
            .first()
        )

        # Aggregate decision stats for this portfolio
        port_decisions = [d for d in decisions if d.portfolio_id == p.id]
        active_statuses = {"draft", "review", "approved", "in_progress"}
        completed_statuses = {"completed"}

        active_count = sum(
            1 for d in port_decisions
            if (d.status.value if hasattr(d.status, "value") else d.status) in active_statuses
        )
        completed_count = sum(
            1 for d in port_decisions
            if (d.status.value if hasattr(d.status, "value") else d.status) in completed_statuses
        )
        amounts = [d.total_value or (d.amount or 0) * (d.price or 0) for d in port_decisions]

        if not existing_snap:
            snap = FactPortfolioSnapshot(
                time_id=today_time_id,
                portfolio_id=p.id,
                user_id=p.owner_id,
                portfolio_name=p.name,
                total_value=sum(amounts),
                decision_count=len(port_decisions),
                active_count=active_count,
                completed_count=completed_count,
                avg_amount=sum(amounts) / len(amounts) if amounts else 0,
                max_amount=max(amounts) if amounts else 0,
                min_amount=min(amounts) if amounts else 0,
            )
            db.add(snap)
            fact_snap_count += 1

    db.commit()

    # ── 4. Refresh materialized views ─────────────────────────────────────

    views_refreshed = _refresh_materialized_views(db)

    duration = round(time.time() - start_time, 2)

    return ETLRunResponse(
        status="success",
        dimensions_loaded={
            "dim_time": dim_time_count,
            "dim_company": dim_company_count,
            "dim_geography": dim_geography_count,
            "dim_category": dim_category_count,
        },
        facts_loaded={
            "fact_investment_performance": fact_perf_count,
            "fact_decision_events": fact_event_count,
            "fact_portfolio_snapshots": fact_snap_count,
        },
        materialized_views_refreshed=views_refreshed,
        duration_seconds=duration,
        message=f"ETL завершён за {duration}с. Загружено: {fact_perf_count} фактов performance, {fact_event_count} событий, {fact_snap_count} снимков.",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ─── ETL STATUS ───────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/etl/status", response_model=ETLStatusResponse)
def get_etl_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Статус OLAP-хранилища: количество записей по таблицам."""
    last_fact = (
        db.query(sa_func.max(FactInvestmentPerformance.created_at))
        .filter(FactInvestmentPerformance.user_id == current_user.id)
        .scalar()
    )

    return ETLStatusResponse(
        last_run_at=last_fact,
        total_facts={
            "fact_investment_performance": db.query(FactInvestmentPerformance).filter(FactInvestmentPerformance.user_id == current_user.id).count(),
            "fact_decision_events": db.query(FactDecisionEvent).filter(FactDecisionEvent.user_id == current_user.id).count(),
            "fact_portfolio_snapshots": db.query(FactPortfolioSnapshot).filter(FactPortfolioSnapshot.user_id == current_user.id).count(),
        },
        total_dimensions={
            "dim_time": db.query(DimTime).count(),
            "dim_company": db.query(DimCompany).count(),
            "dim_geography": db.query(DimGeography).count(),
            "dim_category": db.query(DimCategory).count(),
        },
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ─── MATERIALIZED VIEWS ──────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

MATERIALIZED_VIEWS_SQL = {
    "mv_monthly_performance": """
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_performance AS
        SELECT
            dt.year,
            dt.month,
            dt.month_name,
            COUNT(*) as decision_count,
            SUM(f.total_value) as total_value,
            AVG(f.total_value) as avg_value,
            SUM(CASE WHEN f.decision_type = 'BUY' THEN f.total_value ELSE 0 END) as buy_value,
            SUM(CASE WHEN f.decision_type = 'SELL' THEN f.total_value ELSE 0 END) as sell_value
        FROM fact_investment_performance f
        JOIN dim_time dt ON f.time_id = dt.id
        GROUP BY dt.year, dt.month, dt.month_name
        ORDER BY dt.year, dt.month
    """,
    "mv_category_summary": """
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_category_summary AS
        SELECT
            dc.code as category_code,
            dc.name as category_name,
            COUNT(*) as decision_count,
            SUM(f.total_value) as total_value,
            AVG(f.total_value) as avg_value
        FROM fact_investment_performance f
        JOIN dim_category dc ON f.category_id = dc.id
        GROUP BY dc.code, dc.name
    """,
    "mv_geography_summary": """
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_geography_summary AS
        SELECT
            dg.code as geo_code,
            dg.name as geo_name,
            dg.region,
            COUNT(*) as decision_count,
            SUM(f.total_value) as total_value,
            AVG(f.total_value) as avg_value
        FROM fact_investment_performance f
        JOIN dim_geography dg ON f.geography_id = dg.id
        GROUP BY dg.code, dg.name, dg.region
    """,
}


def _refresh_materialized_views(db: Session) -> list:
    """Создать и обновить materialized views."""
    refreshed = []
    for name, create_sql in MATERIALIZED_VIEWS_SQL.items():
        try:
            db.execute(text(create_sql))
            db.execute(text(f"REFRESH MATERIALIZED VIEW {name}"))
            db.commit()
            refreshed.append(name)
        except Exception:
            db.rollback()
            # View might not have data yet, skip
            try:
                db.execute(text(create_sql))
                db.commit()
                refreshed.append(name)
            except Exception:
                db.rollback()
    return refreshed


@router.post("/etl/refresh-views")
def refresh_views(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить materialized views вручную."""
    refreshed = _refresh_materialized_views(db)
    return {"refreshed": refreshed, "count": len(refreshed)}
