"""
Роутер биржевых данных UZSE (Ташкентская фондовая биржа).

Эндпоинты:
- GET  /stock-exchange/quotes   — котировки из БД
- GET  /stock-exchange/emitters — список эмитентов
- GET  /stock-exchange/trades   — последние сделки (свежие с UZSE)
- POST /stock-exchange/sync     — полная синхронизация данных
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_db
from app.services.stock_exchange_service import (
    fetch_last_trades,
    get_emitters,
    get_quotes,
    sync_stock_data,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stock-exchange", tags=["Биржа UZSE"])


@router.get(
    "/quotes",
    summary="Котировки ценных бумаг UZSE",
)
async def list_quotes(
    ticker: str = Query(None, description="Тикер для фильтрации (напр. HMKB)"),
    limit: int = Query(50, ge=1, le=200, description="Максимальное количество записей"),
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Получение котировок ценных бумаг из БД.

    Можно фильтровать по тикеру. Возвращает записи
    отсортированные по дате торгов (новые первые).
    """
    try:
        records = get_quotes(db, ticker=ticker, limit=limit)
    except Exception as e:
        logger.error("Ошибка получения котировок: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка при получении котировок")

    return [
        {
            "id": r.id,
            "ticker": r.ticker,
            "emitter_name": r.emitter_name,
            "open_price": r.open_price,
            "close_price": r.close_price,
            "high_price": r.high_price,
            "low_price": r.low_price,
            "volume": r.volume,
            "trade_date": r.trade_date.isoformat() if r.trade_date else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.get(
    "/emitters",
    summary="Список эмитентов UZSE",
)
async def list_emitters(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Получение списка эмитентов (компаний) с Ташкентской фондовой биржи.

    Возвращает тикер, полное название, сектор и ИНН.
    """
    try:
        records = get_emitters(db)
    except Exception as e:
        logger.error("Ошибка получения списка эмитентов: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка при получении эмитентов")

    return [
        {
            "id": r.id,
            "ticker": r.ticker,
            "full_name": r.full_name,
            "sector": r.sector,
            "inn": r.inn,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.get(
    "/trades",
    summary="Последние сделки на UZSE (свежие данные)",
)
async def last_trades(
    _current_user=Depends(get_current_user),
):
    """
    Получение последних сделок напрямую с сайта UZSE.

    Выполняет парсинг главной страницы uzse.uz и возвращает
    свежие данные о торгах (не из кэша БД).
    """
    try:
        trades = await fetch_last_trades()
    except Exception as e:
        logger.error("Ошибка получения сделок UZSE: %s", e)
        raise HTTPException(
            status_code=502,
            detail="Не удалось получить данные с uzse.uz",
        )

    return trades


@router.post(
    "/sync",
    summary="Синхронизация данных UZSE в БД",
)
async def sync_exchange_data(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Запуск полной синхронизации данных UZSE.

    Загружает котировальные цены с uzse.uz и сохраняет в БД.
    Обновляет таблицы stock_quotes и stock_emitters.
    """
    try:
        count = await sync_stock_data(db)
    except Exception as e:
        logger.error("Ошибка синхронизации данных UZSE: %s", e)
        raise HTTPException(
            status_code=502,
            detail="Не удалось синхронизировать данные с uzse.uz",
        )

    if count == 0:
        raise HTTPException(
            status_code=502,
            detail="Не удалось получить котировки с uzse.uz. Повторите позже.",
        )

    return {
        "message": f"Синхронизировано {count} котировок UZSE",
        "count": count,
        "source": "uzse.uz",
    }
