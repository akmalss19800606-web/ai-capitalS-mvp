"""
Market Analysis Router - MARKET-004 (fixed)
Full TZ v3.0 Section A implementation.
Endpoints:
    POST /market-analysis/analyze      - full 25-field analysis -> 12-section report
    POST /market-analysis/quick        - quick analysis (min fields)
    GET  /market-analysis/reports       - history list
    GET  /market-analysis/reports/{id}  - get report by id
    GET  /market-analysis/reference/regions - 14 regions
    GET  /market-analysis/reference/sez    - 49 SEZs
    GET  /market-analysis/reference/oked   - OKED sections
    GET  /market-analysis/reference/macro  - current macro indicators
"""
import logging
import time
import uuid
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from app.api.v1.deps import get_current_user
from app.schemas.market_analysis import (
    MarketAnalysisRequest,
)
from app.services.uz_market_analysis_service import UZMarketAnalysisService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market-analysis", tags=["Market Analysis UZ"])
svc = UZMarketAnalysisService()

# MKT-03: In-memory store for MVP — user-scoped (key: "user_id:report_id")
_reports_store: dict = {}


# ---------------------------------------------------------------------------
# Reference endpoints
# ---------------------------------------------------------------------------

@router.get("/reference/regions", summary="14 регионов Узбекистана")
async def get_regions(_u=Depends(get_current_user)):
    return svc.get_regions()


@router.get("/reference/sez", summary="49 СЭЗ Узбекистана")
async def get_sez_list(_u=Depends(get_current_user)):
    return svc.get_sez_list()


@router.get("/reference/oked", summary="Секции ОКЭД (A-U)")
async def get_oked_sections(_u=Depends(get_current_user)):
    return svc.get_oked_sections()


@router.get("/reference/macro", summary="Текущие макропоказатели Узбекистана")
async def get_macro_indicators(_u=Depends(get_current_user)):
    return svc.get_macro_indicators()


# ---------------------------------------------------------------------------
# Analysis endpoints (returns dict, no strict Pydantic response_model)
# ---------------------------------------------------------------------------

@router.post(
    "/analyze",
    summary="Полный анализ рынка УЗ — 25 полей → 12-секционный отчёт",
)
async def analyze_market(
    body: MarketAnalysisRequest,
    background_tasks: BackgroundTasks,
    _u=Depends(get_current_user),
):
    """
    Принимает 25-полевой запрос (7 блоков Wizard), возвращает полный
    AI-отчёт из 12 разделов с макроконтекстом.
    """
    report_id = str(uuid.uuid4())
    start_time = time.time()

    try:
        result = await svc.full_market_analysis(body, report_id)
        elapsed = round(time.time() - start_time, 2)
        result["generation_time_sec"] = elapsed
        result["id"] = report_id

        # MKT-03: Store with user-scoped key
        uid = str(getattr(_u, 'id', 'anon'))
        _reports_store[f"{uid}:{report_id}"] = result
        return result

    except Exception as e:
        logger.error(f"Market analysis error: {e}")
        raise HTTPException(500, f"Ошибка анализа рынка: {str(e)}")


@router.post(
    "/quick",
    summary="Быстрый анализ рынка (минимальные поля)",
)
async def quick_market_analysis(
    oked_section: str = Query(..., description="Секция ОКЭД (A-U)"),
    oked_division: str = Query(..., description="Раздел ОКЭД (01-99)"),
    region: str = Query(..., description="Регион Узбекистана"),
    investment_amount: float = Query(..., description="Сумма инвестиций USD"),
    provider: str = Query("groq", description="AI провайдер: groq / perplexity"),
    _u=Depends(get_current_user),
):
    try:
        question = f"Анализ рынка: секция ОКЭД {oked_section}, раздел {oked_division}, регион {region}, инвестиции ${investment_amount}"
        result = await svc.quick_ask(
            question=question,
            sector=oked_section,
            provider=provider,
        )
        return result
    except Exception as e:
        logger.error(f"Quick market analysis error: {e}")
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# History / Reports
# ---------------------------------------------------------------------------

@router.get(
    "/reports",
    summary="История отчётов рынка текущего пользователя",
)
async def list_reports(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _u=Depends(get_current_user),
):
    # MKT-03: Filter reports by user
    uid = str(getattr(_u, 'id', 'anon'))
    prefix = f"{uid}:"
    all_reports = [v for k, v in _reports_store.items() if k.startswith(prefix)]
    total = len(all_reports)
    items = all_reports[offset: offset + limit]
    summaries = []
    for r in items:
        try:
            req = r.get("request", {})
            summaries.append({
                "id": r.get("id"),
                "oked_section": req.get("oked_section", ""),
                "oked_division": req.get("oked_division", ""),
                "region": req.get("region", ""),
                "recommendation": r.get("recommendation", "hold"),
                "confidence_score": r.get("confidence_score", 0),
                "investment_amount": req.get("investment_amount", 0),
                "investment_currency": req.get("investment_currency", "USD"),
                "created_at": r.get("created_at"),
                "status": r.get("status", "ready"),
            })
        except Exception:
            pass
    return {"items": summaries, "total": total, "limit": limit, "offset": offset}


@router.get(
    "/reports/{report_id}",
    summary="Получить отчёт по ID",
)
async def get_report(report_id: str, _u=Depends(get_current_user)):
    # MKT-03: User-scoped lookup
    uid = str(getattr(_u, 'id', 'anon'))
    report = _reports_store.get(f"{uid}:{report_id}")
    if not report:
        raise HTTPException(404, f"Отчёт '{report_id}' не найден")
    return report


@router.delete(
    "/reports/{report_id}",
    summary="Удалить отчёт",
)
async def delete_report(report_id: str, _u=Depends(get_current_user)):
    # MKT-03: User-scoped delete
    uid = str(getattr(_u, 'id', 'anon'))
    key = f"{uid}:{report_id}"
    if key not in _reports_store:
        raise HTTPException(404, f"Отчёт '{report_id}' не найден")
    del _reports_store[key]
    return {"deleted": report_id}
