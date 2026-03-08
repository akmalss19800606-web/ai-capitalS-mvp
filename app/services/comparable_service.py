"""
Comparable Company Multiples — оценка на основе мультипликаторов.
Фаза 4, Сессия 3 — EXCH-ADAPT-001.5.

Позволяет:
  - Вести базу comparable companies
  - Рассчитывать медианные и средние мультипликаторы по сектору
  - Оценивать компанию на основе peer group
"""
from typing import Optional, List, Dict, Any
from statistics import median, mean

from sqlalchemy.orm import Session

from app.db.models.market_adapters import ComparableCompany


def create_comparable(db: Session, user_id: int, **kwargs) -> ComparableCompany:
    comp = ComparableCompany(user_id=user_id, **kwargs)
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return comp


def list_comparables(
    db: Session,
    user_id: int,
    sector: Optional[str] = None,
    industry: Optional[str] = None,
    limit: int = 100,
) -> List[ComparableCompany]:
    q = db.query(ComparableCompany).filter(ComparableCompany.user_id == user_id)
    if sector:
        q = q.filter(ComparableCompany.sector == sector)
    if industry:
        q = q.filter(ComparableCompany.industry == industry)
    return q.order_by(ComparableCompany.company_name).limit(limit).all()


def get_comparable(db: Session, comp_id: int) -> Optional[ComparableCompany]:
    return db.query(ComparableCompany).filter(ComparableCompany.id == comp_id).first()


def update_comparable(db: Session, comp_id: int, **kwargs) -> Optional[ComparableCompany]:
    comp = get_comparable(db, comp_id)
    if not comp:
        return None
    for k, v in kwargs.items():
        if v is not None:
            setattr(comp, k, v)
    db.commit()
    db.refresh(comp)
    return comp


def delete_comparable(db: Session, comp_id: int):
    comp = get_comparable(db, comp_id)
    if comp:
        db.delete(comp)
        db.commit()


def get_multiples_analysis(
    db: Session,
    user_id: int,
    sector: Optional[str] = None,
    industry: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Анализ мультипликаторов comparable companies.
    Возвращает медианные и средние значения по группе.
    """
    comps = list_comparables(db, user_id, sector=sector, industry=industry)
    if not comps:
        return {
            "total_companies": 0,
            "sector": sector,
            "median_ev_revenue": None,
            "median_ev_ebitda": None,
            "median_pe": None,
            "median_pb": None,
            "avg_ev_revenue": None,
            "avg_ev_ebitda": None,
            "avg_pe": None,
            "avg_pb": None,
            "companies": comps,
        }

    def _safe_median(vals):
        filtered = [v for v in vals if v is not None]
        return round(median(filtered), 2) if filtered else None

    def _safe_mean(vals):
        filtered = [v for v in vals if v is not None]
        return round(mean(filtered), 2) if filtered else None

    ev_rev = [c.ev_revenue for c in comps]
    ev_ebitda = [c.ev_ebitda for c in comps]
    pe = [c.pe_ratio for c in comps]
    pb = [c.pb_ratio for c in comps]

    return {
        "total_companies": len(comps),
        "sector": sector,
        "median_ev_revenue": _safe_median(ev_rev),
        "median_ev_ebitda": _safe_median(ev_ebitda),
        "median_pe": _safe_median(pe),
        "median_pb": _safe_median(pb),
        "avg_ev_revenue": _safe_mean(ev_rev),
        "avg_ev_ebitda": _safe_mean(ev_ebitda),
        "avg_pe": _safe_mean(pe),
        "avg_pb": _safe_mean(pb),
        "companies": comps,
    }


def get_sectors_list(db: Session, user_id: int) -> List[str]:
    """Список уникальных секторов."""
    result = (
        db.query(ComparableCompany.sector)
        .filter(
            ComparableCompany.user_id == user_id,
            ComparableCompany.sector != None,
        )
        .distinct()
        .all()
    )
    return [r[0] for r in result if r[0]]
