"""
Роутер исламских финансов — шариат-скрининг и калькулятор закята.

Эндпоинты:
  - Шариат-скрининг: отраслевой, финансовый, комплексный, портфельный
  - Закят: калькулятор, нисаб, напоминания, руководство
  - Справочники: запрещённые отрасли, пороги AAOIFI, шариатские индексы
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.shariah_screening_service import (
    screen_asset_industry,
    screen_asset_financials,
    screen_asset_full,
    screen_portfolio,
    get_haram_industries,
    get_financial_thresholds,
    get_shariah_indices,
)
from app.services.zakat_service import (
    calculate_zakat,
    calculate_nisab,
    get_zakat_reminder,
    get_zakat_guide,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/islamic-finance", tags=["islamic-finance"])


# ─── Pydantic-модели запросов ────────────────────────────────────────────────

class IndustryScreeningRequest(BaseModel):
    company_name: str = Field(..., description="Название компании")
    industry: str = Field("", description="Отрасль / сектор")
    description: str = Field("", description="Описание деятельности")
    activities: Optional[List[str]] = Field(None, description="Список видов деятельности")


class FinancialScreeningRequest(BaseModel):
    company_name: str = Field(..., description="Название компании")
    total_assets: float = Field(..., gt=0, description="Общие активы")
    total_debt: float = Field(0, ge=0, description="Общий долг")
    total_revenue: float = Field(0, ge=0, description="Общий доход")
    haram_revenue: float = Field(0, ge=0, description="Доход от запрещённой деятельности")
    interest_bearing_securities: float = Field(0, ge=0, description="Процентные ценные бумаги")
    cash_and_interest: float = Field(0, ge=0, description="Денежные средства + процентные")
    receivables: float = Field(0, ge=0, description="Дебиторская задолженность")


class FullScreeningRequest(BaseModel):
    company_name: str = Field(..., description="Название компании")
    industry: str = Field("", description="Отрасль / сектор")
    description: str = Field("", description="Описание деятельности")
    activities: Optional[List[str]] = Field(None, description="Виды деятельности")
    total_assets: float = Field(0, ge=0, description="Общие активы")
    total_debt: float = Field(0, ge=0, description="Общий долг")
    total_revenue: float = Field(0, ge=0, description="Общий доход")
    haram_revenue: float = Field(0, ge=0, description="Запрещённый доход")
    interest_bearing_securities: float = Field(0, ge=0, description="Процентные ЦБ")
    cash_and_interest: float = Field(0, ge=0, description="Денежные + процентные")
    receivables: float = Field(0, ge=0, description="Дебиторская задолженность")


class PortfolioAsset(BaseModel):
    name: str = Field(..., description="Название актива")
    industry: str = Field("", description="Отрасль")
    description: str = Field("", description="Описание")
    activities: Optional[List[str]] = None
    total_assets: float = Field(0, ge=0)
    total_debt: float = Field(0, ge=0)
    total_revenue: float = Field(0, ge=0)
    haram_revenue: float = Field(0, ge=0)
    interest_bearing_securities: float = Field(0, ge=0)
    cash_and_interest: float = Field(0, ge=0)
    receivables: float = Field(0, ge=0)


class PortfolioScreeningRequest(BaseModel):
    assets: List[PortfolioAsset] = Field(..., min_length=1, description="Список активов портфеля")


class ZakatCalculationRequest(BaseModel):
    assets: dict = Field(
        ...,
        description="Категории активов: {cash, investments, business_inventory, receivables, other}",
        examples=[{"cash": 50000000, "investments": 100000000}],
    )
    liabilities: Optional[dict] = Field(
        None,
        description="Обязательства: {loans, debts, payables, other}",
        examples=[{"loans": 10000000}],
    )
    currency: str = Field("UZS", description="Валюта (UZS, USD, EUR, RUB)")
    gold_grams: float = Field(0, ge=0, description="Золото в граммах")
    silver_grams: float = Field(0, ge=0, description="Серебро в граммах")
    hijri_year_start: Optional[str] = Field(
        None, description="Начало лунного года (ISO 8601, для расчёта хауля)"
    )


class ZakatReminderRequest(BaseModel):
    hawl_start: str = Field(..., description="Дата начала хауля (ISO 8601, например 2025-01-15)")
    reminder_days_before: int = Field(30, ge=1, le=90, description="За сколько дней напомнить")


# ─── Эндпоинты шариат-скрининга ──────────────────────────────────────────────

@router.post("/screening/industry", summary="Отраслевой шариат-скрининг")
async def api_screen_industry(request: IndustryScreeningRequest):
    """
    Проверка компании по отраслевым критериям (харам-индустрии).
    Выявляет связь с запрещёнными секторами: алкоголь, азартные игры,
    свинина, табак, конвенциональные банки и др.
    """
    try:
        result = screen_asset_industry(
            company_name=request.company_name,
            industry=request.industry,
            description=request.description,
            activities=request.activities,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Industry screening error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/screening/financial", summary="Финансовый шариат-скрининг")
async def api_screen_financial(request: FinancialScreeningRequest):
    """
    Финансовый скрининг по пороговым значениям AAOIFI / DJIM / S&P Shariah.
    Проверяет: долг/активы < 33%, запрещённый доход < 5%, процентные ЦБ, и др.
    """
    try:
        result = screen_asset_financials(
            company_name=request.company_name,
            total_assets=request.total_assets,
            total_debt=request.total_debt,
            total_revenue=request.total_revenue,
            haram_revenue=request.haram_revenue,
            interest_bearing_securities=request.interest_bearing_securities,
            cash_and_interest=request.cash_and_interest,
            receivables=request.receivables,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Financial screening error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/screening/full", summary="Комплексный шариат-скрининг")
async def api_screen_full(request: FullScreeningRequest):
    """
    Полный шариатский скрининг — отраслевой + финансовый.
    Возвращает итоговый статус, детальные проверки и рекомендации.
    """
    try:
        result = screen_asset_full(
            company_name=request.company_name,
            industry=request.industry,
            description=request.description,
            activities=request.activities,
            total_assets=request.total_assets,
            total_debt=request.total_debt,
            total_revenue=request.total_revenue,
            haram_revenue=request.haram_revenue,
            interest_bearing_securities=request.interest_bearing_securities,
            cash_and_interest=request.cash_and_interest,
            receivables=request.receivables,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Full screening error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/screening/portfolio", summary="Скрининг портфеля")
async def api_screen_portfolio(request: PortfolioScreeningRequest):
    """
    Комплексный шариатский скрининг портфеля.
    Проверяет все активы и выдаёт агрегированную статистику:
    количество халяль/харам/сомнительных, процент соответствия, рекомендации.
    """
    try:
        assets_data = [a.model_dump() for a in request.assets]
        result = screen_portfolio(assets_data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Portfolio screening error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Эндпоинты закята ───────────────────────────────────────────────────────

@router.post("/zakat/calculate", summary="Калькулятор закята")
async def api_calculate_zakat(request: ZakatCalculationRequest):
    """
    Расчёт суммы закята: 2.5% от чистых активов выше нисаба.
    Учитывает наличные, инвестиции, золото/серебро, долги.
    Курсы: ЦБ Узбекистана (cbu.uz). Налоговые льготы: ст. 179 НК РУз.
    """
    try:
        result = await calculate_zakat(
            assets=request.assets,
            liabilities=request.liabilities,
            currency=request.currency,
            gold_grams=request.gold_grams,
            silver_grams=request.silver_grams,
            hijri_year_start=request.hijri_year_start,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Zakat calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/zakat/nisab", summary="Текущий нисаб")
async def api_get_nisab(currency: str = "UZS"):
    """
    Актуальный нисаб (минимальный порог для закята).
    Рассчитывается по курсу золота/серебра и данным ЦБ Узбекистана.
    Поддерживаемые валюты: UZS, USD, EUR, RUB.
    """
    try:
        result = await calculate_nisab(currency=currency)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Nisab calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/zakat/reminder", summary="Напоминание о закяте")
async def api_zakat_reminder(request: ZakatReminderRequest):
    """
    Расчёт напоминания о сроках выплаты закята.
    Основан на хауле (354 дня — лунный год). Уведомляет заранее.
    """
    try:
        result = get_zakat_reminder(
            hawl_start=request.hawl_start,
            reminder_days_before=request.reminder_days_before,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Zakat reminder error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/zakat/guide", summary="Руководство по закяту")
async def api_zakat_guide():
    """
    Полное руководство по закяту для пользователей Узбекистана.
    Объяснение принципов, категорий, нисаба и налоговых льгот.
    """
    return {"success": True, "data": get_zakat_guide()}


# ─── Справочные эндпоинты ───────────────────────────────────────────────────

@router.get("/reference/haram-industries", summary="Запрещённые отрасли")
async def api_haram_industries():
    """Список запрещённых (харам) отраслей по стандартам AAOIFI и DJIM."""
    return {"success": True, "data": get_haram_industries()}


@router.get("/reference/financial-thresholds", summary="Финансовые пороги AAOIFI")
async def api_financial_thresholds():
    """Пороговые значения финансовых показателей для шариатского скрининга."""
    return {"success": True, "data": get_financial_thresholds()}


@router.get("/reference/shariah-indices", summary="Шариатские индексы")
async def api_shariah_indices():
    """Список глобальных шариатских индексов (DJIM, S&P, FTSE, MSCI)."""
    return {"success": True, "data": get_shariah_indices()}
