"""
UZ Market Analysis Router — MARKET-001
Endpoints: sectors, quick-ask, deep-analysis, compare
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user
from app.services.uz_market_analysis_service import UZMarketAnalysisService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/uz-market", tags=["UZ Market Analysis"])
svc = UZMarketAnalysisService()


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


@router.get("/sectors", summary="Список 25 отраслей Узбекистана")
async def get_sectors(_u=Depends(get_current_user)):
    return svc.get_sectors()


@router.get("/sectors/{sector_id}", summary="Инфо об отрасли")
async def get_sector(sector_id: str, _u=Depends(get_current_user)):
    sector = svc.get_sector_by_id(sector_id)
    if not sector:
        raise HTTPException(404, f"Отрасль '{sector_id}' не найдена")
    return sector


@router.post("/quick-ask", summary="Быстрый вопрос по рынку УЗ")
async def quick_ask(body: QuickAskRequest, _u=Depends(get_current_user)):
    try:
        return await svc.quick_ask(body.question, body.sector, body.provider)
    except Exception as e:
        logger.error(f"Quick ask error: {e}")
        raise HTTPException(500, str(e))


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
