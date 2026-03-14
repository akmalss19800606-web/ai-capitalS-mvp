"""
UZ Market Analysis Router — MARKET-001 (fixed)
Endpoints: sectors, quick-ask, deep-analysis, compare,
           generate-report (25-field), macro-context, history
"""
import logging
import uuid
import time
from typing import Optional, List, Literal
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user
from app.services.uz_market_analysis_service import UZMarketAnalysisService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/uz-market", tags=["UZ Market Analysis"])
svc = UZMarketAnalysisService()

# In-memory store for MVP
_reports_store: dict = {}


# ---- Request schemas ----


class QuickAskRequest(BaseModel):
    question: str = Field(..., min_length=3, description="Вопрос о рынке Узбекистана")
    sector: Optional[str] = Field(None, description="ID отрасли для контекста")
    provider: str = Field("groq", description="AI provider: groq or perplexity")


class DeepAnalysisRequest(BaseModel):
    sector_id: str = Field(..., description="ID отрасли")
    provider: str = Field("groq", description="AI provider: groq or perplexity")


class SectorCompareRequest(BaseModel):
    sector_ids: List[str] = Field(..., min_length=2, description="Список ID отраслей")
    provider: str = Field("groq", description="AI provider")


class FullReportRequest(BaseModel):
    """25-field request matching frontend wizard — 7 blocks."""
    # Block 1: OKED
    oked_section: str = Field("J", description="OKED Level 1 section (A-U)")
    oked_division: str = Field("62", description="OKED Level 2 division (01-99)")
    oked_class: Optional[str] = Field(None, description="OKED Level 3 class")
    activity_description: Optional[str] = Field(None, max_length=500)
    # Block 2: Investment
    investment_amount: float = Field(50000, gt=0)
    investment_currency: Literal["USD", "UZS"] = Field("USD")
    investment_horizon_years: int = Field(5, ge=1, le=30)
    investment_type: Literal["greenfield", "expansion", "ma", "franchise"] = Field("greenfield")
    project_stage: Literal["idea", "business_plan", "launch", "operating"] = Field("idea")
    funding_sources: List[str] = Field(default=["own"])
    # Block 3: Financial
    debt_ratio_pct: float = Field(30.0, ge=0, le=90)
    expected_loan_rate_pct: float = Field(22.8, ge=5, le=40)
    expected_revenue_year1: Optional[float] = Field(None, ge=0)
    expected_margin_pct: float = Field(15.0, ge=-50, le=100)
    # Block 4: Region
    region: str = Field("tashkent_city")
    city_district: Optional[str] = Field(None)
    sez_code: Optional[str] = Field(None)
    industrial_zone: Optional[str] = Field(None)
    # Block 5: Market
    target_markets: List[str] = Field(default=["domestic"])
    expected_market_share_pct: float = Field(5.0, ge=0.1, le=50)
    competitors_range: Literal["0-3", "4-10", "11-50", "50+"] = Field("4-10")
    # Block 6: Legal
    legal_form: Literal["ip", "ooo", "ao", "farmer", "family"] = Field("ooo")
    tax_regime: Literal["general", "simplified", "sez", "custom"] = Field("general")
    planned_employees: int = Field(10, ge=1, le=10000)
    # Block 7: Risk
    risk_profile: int = Field(5, ge=1, le=10)
    import_dependency_pct: float = Field(30.0, ge=0, le=100)
    # AI provider
    provider: str = Field("groq")


# ---------------------------------------------------------------------------
# Reference / Macro
# ---------------------------------------------------------------------------


@router.get("/sectors", summary="Список 25 отраслей Узбекистана")
async def get_sectors(_u=Depends(get_current_user)):
    return svc.get_sectors()


@router.get("/sectors/{sector_id}", summary="Инфо об отрасли")
async def get_sector(sector_id: str, _u=Depends(get_current_user)):
    sector = svc.get_sector_by_id(sector_id)
    if not sector:
        raise HTTPException(404, f"Отрасль '{sector_id}' не найдена")
    return sector


@router.get("/macro-context", summary="Текущие макропоказатели Узбекистана")
async def get_macro_context(_u=Depends(get_current_user)):
    """ВВП, инфляция, ставка ЦБ, курс USD/UZS, TSMI."""
    return svc.get_macro_indicators()


@router.get("/reference/regions", summary="14 регионов Узбекистана")
async def get_regions(_u=Depends(get_current_user)):
    return svc.get_regions()


@router.get("/reference/sez", summary="СЭЗ Узбекистана")
async def get_sez_list(_u=Depends(get_current_user)):
    return svc.get_sez_list()


@router.get("/reference/oked", summary="Секции ОКЭД (A-U)")
async def get_oked_sections(_u=Depends(get_current_user)):
    return svc.get_oked_sections()


# ---------------------------------------------------------------------------
# Quick Ask
# ---------------------------------------------------------------------------


@router.post("/quick-ask", summary="Быстрый вопрос по рынку УЗ")
async def quick_ask(body: QuickAskRequest, _u=Depends(get_current_user)):
    try:
        return await svc.quick_ask(body.question, body.sector, body.provider)
    except Exception as e:
        logger.error(f"Quick ask error: {e}")
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# Deep Analysis (by sector)
# ---------------------------------------------------------------------------


@router.post("/deep-analysis", summary="Глубокий анализ отрасли (12 разделов)")
async def deep_analysis(body: DeepAnalysisRequest, _u=Depends(get_current_user)):
    try:
        result = await svc.deep_analysis(body.sector_id, body.provider)
        if "error" in result and "sector" not in result:
            raise HTTPException(404, result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deep analysis error: {e}")
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# Sector Compare
# ---------------------------------------------------------------------------


@router.post("/compare", summary="Сравнение отраслей")
async def compare_sectors(body: SectorCompareRequest, _u=Depends(get_current_user)):
    try:
        result = await svc.sector_compare(body.sector_ids, body.provider)
        if "error" in result:
            raise HTTPException(400, result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Compare error: {e}")
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# MAIN: Full 25-field generate-report -> 12-section AI report
# ---------------------------------------------------------------------------


@router.post("/generate-report", summary="Полный AI-отчёт (25 полей → 12 разделов)")
async def generate_full_report(body: FullReportRequest, _u=Depends(get_current_user)):
    """
    Принимает все 25 полей из фронтенд-визарда,
    вызывает full_market_analysis и возвращает 12-секционный отчёт.
    """
    report_id = str(uuid.uuid4())
    start_time = time.time()
    try:
        result = await svc.full_market_analysis(
            request=body.dict(),
            report_id=report_id,
            provider=body.provider,
        )
        elapsed = round(time.time() - start_time, 2)
        result["generation_time_sec"] = elapsed
        result["id"] = report_id
        # Store for history
        _reports_store[report_id] = result
        return result
    except Exception as e:
        logger.error(f"Generate report error: {e}")
        raise HTTPException(500, f"Ошибка генерации отчёта: {str(e)}")


# ---------------------------------------------------------------------------
# History / Reports
# ---------------------------------------------------------------------------


@router.get("/reports", summary="История отчётов")
async def list_reports(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _u=Depends(get_current_user),
):
    all_reports = list(_reports_store.values())
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


@router.get("/reports/{report_id}", summary="Получить отчёт по ID")
async def get_report(report_id: str, _u=Depends(get_current_user)):
    report = _reports_store.get(report_id)
    if not report:
        raise HTTPException(404, f"Отчёт '{report_id}' не найден")
    return report


@router.delete("/reports/{report_id}", summary="Удалить отчёт")
async def delete_report(report_id: str, _u=Depends(get_current_user)):
    if report_id not in _reports_store:
        raise HTTPException(404, f"Отчёт '{report_id}' не найден")
    del _reports_store[report_id]
    return {"deleted": report_id}
