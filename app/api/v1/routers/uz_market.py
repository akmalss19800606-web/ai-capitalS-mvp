"""
UZ Market Analysis Router — MARKET-001 (fixed v2)
Endpoints: sectors, quick-ask, deep-analysis, compare,
           generate-report (25-field), generate-report/stream (SSE),
           macro-context, history
Auth made optional for generate-report and macro-context (MVP).
"""
import logging
import uuid
import time
import json as _json
import asyncio
from typing import Optional, List, Literal
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Header, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user
from app.services.uz_market_analysis_service import UZMarketAnalysisService
from app.db.session import SessionLocal
from app.db.models.quick_ask_record import QuickAskRecord

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/uz-market", tags=["UZ Market Analysis"])
svc = UZMarketAnalysisService()

# MKT-02: In-memory store for MVP — user-scoped (key: "user_id:report_id")
_reports_store: dict = {}


# ---- Optional auth helper ----
async def get_optional_user(authorization: Optional[str] = Header(None)):
    """Returns user or None — does not block unauthenticated requests."""
    if not authorization:
        return None
    try:
        from app.core.security import decode_token
        from app.db.session import SessionLocal
        from app.db.models.user import User
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        if payload is None:
            return None
        user_id = payload.get("sub")
        if user_id is None:
            return None
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == int(user_id)).first()
            # MKT-04: Detach user from session before closing to prevent leak
            if user:
                db.expunge(user)
            return user
        finally:
            db.close()
    except Exception:
        return None


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
# Reference / Macro  (NO auth required for MVP)
# ---------------------------------------------------------------------------

@router.get("/sectors", summary="Список 25 отраслей Узбекистана")
async def get_sectors():
    return svc.get_sectors()

@router.get("/sectors/{sector_id}", summary="Инфо об отрасли")
async def get_sector(sector_id: str):
    sector = svc.get_sector_by_id(sector_id)
    if not sector:
        raise HTTPException(404, f"Отрасль '{sector_id}' не найдена")
    return sector

@router.get("/macro-context", summary="Текущие макропоказатели Узбекистана")
async def get_macro_context():
    """ВВП, инфляция, ставка ЦБ, курс USD/UZS, TSMI."""
    return svc.get_macro_indicators()

@router.get("/reference/regions", summary="14 регионов Узбекистана")
async def get_regions():
    return svc.get_regions()

@router.get("/reference/sez", summary="СЭЗ Узбекистана")
async def get_sez_list():
    return svc.get_sez_list()

@router.get("/reference/oked", summary="Секции ОКЭД (A-U)")
async def get_oked_sections():
    return svc.get_oked_sections()


# ---------------------------------------------------------------------------
# Quick Ask
# ---------------------------------------------------------------------------

@router.post("/quick-ask", summary="Быстрый вопрос по рынку УЗ")
async def quick_ask(body: QuickAskRequest, _u=Depends(get_optional_user)):
    try:
        data = await svc.quick_ask(body.question, body.sector, body.provider)
        # E5-03: persist Q&A to DB
        try:
            db = SessionLocal()
            rec = QuickAskRecord(
                user_id=getattr(_u, "id", None) if _u else None,
                question=body.question,
                answer=data.get("answer", ""),
                provider=body.provider,
            )
            db.add(rec)
            db.commit()
            data["record_id"] = str(rec.id)
            db.close()
        except Exception as db_err:
            logger.warning(f"QuickAsk DB save failed (non-blocking): {db_err}")
        return data
    except Exception as e:
        logger.error(f"Quick ask error: {e}")
        # MKT-05: Don't expose internal error details to client
        raise HTTPException(500, "Internal server error")


# ---------------------------------------------------------------------------
# Quick Ask History (E5-03)
# ---------------------------------------------------------------------------

@router.get("/quick-ask/history", summary="История быстрых вопросов")
async def quick_ask_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _u=Depends(get_optional_user),
):
    db = SessionLocal()
    try:
        q = db.query(QuickAskRecord)
        uid = getattr(_u, "id", None) if _u else None
        if uid:
            q = q.filter(QuickAskRecord.user_id == uid)
        else:
            q = q.filter(QuickAskRecord.user_id.is_(None))
        total = q.count()
        rows = q.order_by(QuickAskRecord.created_at.desc()).offset(offset).limit(limit).all()
        items = [
            {
                "id": str(r.id),
                "question": r.question,
                "answer": r.answer,
                "provider": r.provider,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
        return {"items": items, "total": total, "limit": limit, "offset": offset}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Deep Analysis (by sector)
# ---------------------------------------------------------------------------

@router.post("/deep-analysis", summary="Глубокий анализ отрасли (12 разделов)")
async def deep_analysis(body: DeepAnalysisRequest, _u=Depends(get_optional_user)):
    try:
        result = await svc.deep_analysis(body.sector_id, body.provider)
        if "error" in result and "sector" not in result:
            raise HTTPException(404, result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deep analysis error: {e}")
        # MKT-05: Don't expose internal error details to client
        raise HTTPException(500, "Internal server error")


# ---------------------------------------------------------------------------
# Sector Compare
# ---------------------------------------------------------------------------

@router.post("/compare", summary="Сравнение отраслей")
async def compare_sectors(body: SectorCompareRequest, _u=Depends(get_optional_user)):
    try:
        result = await svc.sector_compare(body.sector_ids, body.provider)
        if "error" in result:
            raise HTTPException(400, result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Compare error: {e}")
        # MKT-05: Don't expose internal error details to client
        raise HTTPException(500, "Internal server error")


# ---------------------------------------------------------------------------
# MAIN: Full 25-field generate-report -> 12-section AI report (NO auth for MVP)
# ---------------------------------------------------------------------------

@router.post("/generate-report", summary="Полный AI-отчёт (25 полей → 12 разделов)")
async def generate_full_report(body: FullReportRequest, _u=Depends(get_optional_user)):
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
        # MKT-02: Store with user-scoped key
        uid = str(getattr(_u, 'id', 'anon')) if _u else 'anon'
        _reports_store[f"{uid}:{report_id}"] = result
        return result
    except Exception as e:
        logger.error(f"Generate report error: {e}")
        # MKT-05: Don't expose internal error details to client
        raise HTTPException(500, "Internal server error")


# ---------------------------------------------------------------------------
# E5-04: SSE streaming endpoint for real-time progress bar
# ---------------------------------------------------------------------------

@router.post("/generate-report/stream", summary="AI-отчёт с прогрессом (SSE)")
async def generate_report_stream(body: FullReportRequest, _u=Depends(get_optional_user)):
    """
    SSE-стрим: отправляет JSON-события прогресса во время генерации отчёта.
    Формат события: data: {"step": "...", "progress": N}\n\n
    Финальное событие: data: {"step": "Готово", "progress": 100, "report_id": "..."}\n\n
    """
    report_id = str(uuid.uuid4())
    uid = str(getattr(_u, 'id', 'anon')) if _u else 'anon'

    async def event_stream():
        start_time = time.time()

        def evt(step: str, progress: int, **extra):
            return f"data: {_json.dumps({'step': step, 'progress': progress, **extra}, ensure_ascii=False)}\n\n"

        yield evt("Проверка входных данных...", 5)
        await asyncio.sleep(0.2)

        yield evt("Загрузка макроэкономических показателей...", 10)
        await asyncio.sleep(0.2)

        yield evt("Обогащение региональных данных...", 18)
        await asyncio.sleep(0.2)

        yield evt("Подготовка запроса к AI-провайдеру...", 25)
        await asyncio.sleep(0.1)

        yield evt("Генерация 12-секционного анализа...", 30)

        # Actual AI report generation
        try:
            result = await svc.full_market_analysis(
                request=body.dict(),
                report_id=report_id,
                provider=body.provider,
            )
        except Exception as e:
            logger.error(f"SSE generate report error: {e}")
            yield evt("Ошибка генерации", 0, error="Внутренняя ошибка сервера")
            return

        yield evt("Формирование SWOT и PESTEL анализа...", 65)
        await asyncio.sleep(0.2)

        yield evt("Расчёт инвестиционной привлекательности...", 78)
        await asyncio.sleep(0.2)

        yield evt("Оценка рисков и рекомендации...", 88)
        await asyncio.sleep(0.15)

        yield evt("Подготовка итогового отчёта...", 95)
        await asyncio.sleep(0.1)

        elapsed = round(time.time() - start_time, 2)
        result["generation_time_sec"] = elapsed
        result["id"] = report_id

        # Store report
        _reports_store[f"{uid}:{report_id}"] = result

        yield evt("Готово", 100, report_id=report_id)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# History / Reports
# ---------------------------------------------------------------------------

@router.get("/reports", summary="История отчётов")
async def list_reports(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _u=Depends(get_optional_user),
):
    # MKT-02: Filter reports by user
    uid = str(getattr(_u, 'id', 'anon')) if _u else 'anon'
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

@router.get("/reports/{report_id}", summary="Получить отчёт по ID")
async def get_report(report_id: str, _u=Depends(get_optional_user)):
    # MKT-02: User-scoped lookup
    uid = str(getattr(_u, 'id', 'anon')) if _u else 'anon'
    report = _reports_store.get(f"{uid}:{report_id}")
    if not report:
        raise HTTPException(404, f"Отчёт '{report_id}' не найден")
    return report

@router.delete("/reports/{report_id}", summary="Удалить отчёт")
async def delete_report(report_id: str, _u=Depends(get_optional_user)):
    # MKT-02: User-scoped delete
    uid = str(getattr(_u, 'id', 'anon')) if _u else 'anon'
    key = f"{uid}:{report_id}"
    if key not in _reports_store:
        raise HTTPException(404, f"Отчёт '{report_id}' не найден")
    del _reports_store[key]
    return {"deleted": report_id}
