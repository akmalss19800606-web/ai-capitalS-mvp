from typing import Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.islamic_stage3 import SukukIssuance, TakafulPlan, WaqfProject


def get_all_sukuks(db: Session, status: Optional[str] = None):
    query = select(SukukIssuance).order_by(SukukIssuance.issue_date.desc())
    if status:
        query = query.where(SukukIssuance.status == status)
    result = db.execute(query)
    return result.scalars().all()


def get_sukuk_by_id(db: Session, sukuk_id: UUID):
    result = db.execute(select(SukukIssuance).where(SukukIssuance.id == sukuk_id))
    return result.scalar_one_or_none()


def get_all_takaful_plans(db: Session, takaful_type: Optional[str] = None):
    query = select(TakafulPlan).where(TakafulPlan.is_active == True).order_by(TakafulPlan.name_ru)
    if takaful_type:
        query = query.where(TakafulPlan.takaful_type == takaful_type)
    result = db.execute(query)
    return result.scalars().all()


def get_takaful_by_id(db: Session, plan_id: UUID):
    result = db.execute(select(TakafulPlan).where(TakafulPlan.id == plan_id))
    return result.scalar_one_or_none()


def calculate_takaful_contribution(
    coverage_amount: float,
    takaful_type: str,
    term_months: int = 12,
) -> dict:
    base_rates = {
        "general": 0.025, "family": 0.035, "health": 0.045,
        "motor": 0.03, "travel": 0.02,
    }
    rate = base_rates.get(takaful_type, 0.03)
    annual = coverage_amount * rate
    monthly = annual / 12
    total = monthly * term_months
    return {
        "monthly_contribution_uzs": round(monthly, 2),
        "annual_contribution_uzs": round(annual, 2),
        "total_contribution_uzs": round(total, 2),
        "coverage_amount_uzs": coverage_amount,
        "term_months": term_months,
        "takaful_type": takaful_type,
        "rate_applied": rate,
    }


def get_all_waqf_projects(db: Session, status: Optional[str] = None):
    query = select(WaqfProject).order_by(WaqfProject.created_at.desc())
    if status:
        query = query.where(WaqfProject.status == status)
    result = db.execute(query)
    return result.scalars().all()


def get_waqf_by_id(db: Session, waqf_id: UUID):
    result = db.execute(select(WaqfProject).where(WaqfProject.id == waqf_id))
    return result.scalar_one_or_none()


def get_waqf_stats(db: Session) -> dict:
    projects = get_all_waqf_projects(db)
    total_target = sum(float(p.target_amount_uzs or 0) for p in projects)
    total_collected = sum(float(p.collected_amount_uzs or 0) for p in projects)
    active = sum(1 for p in projects if p.status == "active")
    return {
        "total_projects": len(projects),
        "active_projects": active,
        "total_target_uzs": round(total_target, 2),
        "total_collected_uzs": round(total_collected, 2),
        "completion_pct": round(total_collected / total_target * 100, 2) if total_target > 0 else 0,
    }
