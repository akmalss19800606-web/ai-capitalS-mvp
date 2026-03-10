"""
Роутер Excel-экспорта — Фаза 3, EXPORT-002.

Эндпоинты:
  - POST /export/excel/portfolio — экспорт портфеля в xlsx
  - POST /export/excel/dd-report — экспорт DD-отчёта в xlsx
  - POST /export/excel/comparison — экспорт сравнения компаний в xlsx
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import io

from app.api.v1.deps import get_current_user
from app.services.excel_export_service import ExcelExportService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/export/excel", tags=["Excel Export"])

XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# ── Схемы запросов ─────────────────────────────────────────────


class AssetData(BaseModel):
    name: str = ""
    symbol: str = ""
    quantity: float = 0
    price: float = 0
    value: float = 0
    weight: float = 0
    pnl: float = 0


class AnalyticsData(BaseModel):
    npv: Any = None
    irr: Any = None
    payback: Any = None
    wacc: Any = None
    dcf: Any = None


class PortfolioExportRequest(BaseModel):
    name: str = "Мой Портфель"
    currency: str = "USD"
    total_value: float = 0
    roi: str = "N/A"
    owner: str = ""
    assets: List[AssetData] = []
    analytics: Optional[AnalyticsData] = None


class DDReportExportRequest(BaseModel):
    company_name: str
    inn: str = ""
    scores: Dict[str, Any] = {}
    red_flags: List[str] = []


class CompanyData(BaseModel):
    name: str = ""
    inn: str = ""
    director: str = ""
    oked: str = ""
    charter_fund: str = ""
    status: str = ""
    address: str = ""
    phone: str = ""


class ComparisonExportRequest(BaseModel):
    companies: List[CompanyData]


# ── Эндпоинты ─────────────────────────────────────────────────


@router.post("/portfolio", summary="Экспорт портфеля в Excel")
async def export_portfolio(
    body: PortfolioExportRequest,
    _current_user=Depends(get_current_user),
):
    """
    Генерация xlsx с 3 листами: Сводка, Активы (с формулами + PieChart), Аналитика.
    """
    try:
        xlsx_bytes = ExcelExportService.export_portfolio_summary(body.dict())
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Ошибка экспорта портфеля в Excel: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка генерации Excel")

    filename = f"portfolio_{body.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type=XLSX_CONTENT_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/dd-report", summary="Экспорт DD-отчёта в Excel")
async def export_dd_report(
    body: DDReportExportRequest,
    _current_user=Depends(get_current_user),
):
    """
    Генерация xlsx с DD-скорингом и red flags.
    """
    try:
        xlsx_bytes = ExcelExportService.export_dd_report(body.dict())
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Ошибка экспорта DD в Excel: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка генерации Excel")

    filename = f"dd_{body.company_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type=XLSX_CONTENT_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/comparison", summary="Экспорт сравнения компаний в Excel")
async def export_comparison(
    body: ComparisonExportRequest,
    _current_user=Depends(get_current_user),
):
    """
    Генерация xlsx со сравнительной таблицей компаний.
    """
    if not body.companies:
        raise HTTPException(status_code=400, detail="Список компаний пустой")

    try:
        xlsx_bytes = ExcelExportService.export_comparison([c.dict() for c in body.companies])
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Ошибка экспорта сравнения в Excel: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка генерации Excel")

    filename = f"comparison_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type=XLSX_CONTENT_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
