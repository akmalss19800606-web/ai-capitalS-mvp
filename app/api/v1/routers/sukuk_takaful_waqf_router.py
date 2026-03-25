from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.sukuk_takaful_waqf_service import (
    get_all_sukuks, get_sukuk_by_id,
    get_all_takaful_plans, get_takaful_by_id, calculate_takaful_contribution,
    get_all_waqf_projects, get_waqf_by_id, get_waqf_stats,
)

router = APIRouter(prefix="/islamic", tags=["Islamic: Sukuk, Takaful, Waqf"])


# ── Sukuk ──
@router.get("/sukuk")
async def list_sukuks(
    status: Optional[str] = Query(None, description="Filter: active, matured, defaulted, cancelled"),
    db: AsyncSession = Depends(get_db),
):
    items = await get_all_sukuks(db, status=status)
    return {"items": items, "total": len(items)}


@router.get("/sukuk/{sukuk_id}")
async def get_sukuk(sukuk_id: UUID, db: AsyncSession = Depends(get_db)):
    item = await get_sukuk_by_id(db, sukuk_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sukuk not found")
    return item


# ── Takaful ──
@router.get("/takaful")
async def list_takaful_plans(
    takaful_type: Optional[str] = Query(None, description="Filter: general, family, health, motor, travel"),
    db: AsyncSession = Depends(get_db),
):
    items = await get_all_takaful_plans(db, takaful_type=takaful_type)
    return {"items": items, "total": len(items)}


@router.get("/takaful/{plan_id}")
async def get_takaful(plan_id: UUID, db: AsyncSession = Depends(get_db)):
    item = await get_takaful_by_id(db, plan_id)
    if not item:
        raise HTTPException(status_code=404, detail="Takaful plan not found")
    return item


@router.post("/takaful/calculate")
async def takaful_calculator(
    coverage_amount: float = Query(..., gt=0, description="Coverage amount in UZS"),
    takaful_type: str = Query("general", description="Type: general, family, health, motor, travel"),
    term_months: int = Query(12, ge=1, le=360, description="Contract term in months"),
):
    return await calculate_takaful_contribution(coverage_amount, takaful_type, term_months)


# ── Waqf ──
@router.get("/waqf")
async def list_waqf_projects(
    status: Optional[str] = Query(None, description="Filter: active, completed, suspended, planning"),
    db: AsyncSession = Depends(get_db),
):
    items = await get_all_waqf_projects(db, status=status)
    return {"items": items, "total": len(items)}


@router.get("/waqf/stats")
async def waqf_statistics(db: AsyncSession = Depends(get_db)):
    return await get_waqf_stats(db)


@router.get("/waqf/{waqf_id}")
async def get_waqf(waqf_id: UUID, db: AsyncSession = Depends(get_db)):
    item = await get_waqf_by_id(db, waqf_id)
    if not item:
        raise HTTPException(status_code=404, detail="Waqf project not found")
    return item
