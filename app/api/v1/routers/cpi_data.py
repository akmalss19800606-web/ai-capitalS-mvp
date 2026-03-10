"""
Роутер данных ИПЦ (индекс потребительских цен) / инфляции.

Эндпоинты:
- GET  /cpi/data    — записи ИПЦ из БД
- GET  /cpi/current — последнее значение ИПЦ
- GET  /cpi/trend   — тренд ИПЦ за N лет (для графика)
- POST /cpi/sync    — синхронизация с World Bank API
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_db
from app.services.cpi_data_service import (
    get_cpi_data,
    get_cpi_trend,
    get_current_cpi,
    sync_cpi_data,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cpi", tags=["ИПЦ / Инфляция"])


@router.get(
    "/data",
    summary="Записи ИПЦ из БД",
)
async def list_cpi_data(
    limit: int = Query(30, ge=1, le=100, description="Максимальное количество записей"),
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Получение записей ИПЦ из БД.

    Возвращает данные инфляции (потребительские цены, годовой %)
    отсортированные по дате (новые первые).
    """
    try:
        records = get_cpi_data(db, limit=limit)
    except Exception as e:
        logger.error("Ошибка получения данных ИПЦ: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка при получении данных ИПЦ")

    return [
        {
            "id": r.id,
            "region": r.region,
            "category": r.category,
            "value": r.value,
            "period_date": r.period_date.isoformat() if r.period_date else None,
            "source": r.source,
        }
        for r in records
    ]


@router.get(
    "/current",
    summary="Последнее значение ИПЦ",
)
async def current_cpi(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Получение последнего значения ИПЦ (инфляции).

    Возвращает самую свежую запись ИПЦ из БД
    с полями: value, period_date, year, source.
    """
    try:
        result = get_current_cpi(db)
    except Exception as e:
        logger.error("Ошибка получения текущего ИПЦ: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка при получении данных ИПЦ")

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Данные ИПЦ не найдены. Выполните /cpi/sync для загрузки.",
        )

    return result


@router.get(
    "/trend",
    summary="Тренд ИПЦ для графика",
)
async def cpi_trend(
    years: int = Query(10, ge=1, le=30, description="Количество лет для тренда"),
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Получение тренда ИПЦ за N лет для построения графика.

    Возвращает список значений в хронологическом порядке:
    [{year: 2015, value: 8.5}, {year: 2016, value: 9.2}, ...].
    """
    try:
        trend = get_cpi_trend(db, years=years)
    except Exception as e:
        logger.error("Ошибка получения тренда ИПЦ: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка при получении тренда ИПЦ")

    return trend


@router.post(
    "/sync",
    summary="Синхронизация ИПЦ с World Bank",
)
async def sync_cpi(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Запуск синхронизации данных ИПЦ с World Bank API.

    Загружает свежие данные по инфляции и сохраняет в БД.
    Существующие записи обновляются (upsert).
    """
    try:
        count = await sync_cpi_data(db)
    except Exception as e:
        logger.error("Ошибка синхронизации ИПЦ: %s", e)
        raise HTTPException(
            status_code=502,
            detail="Не удалось синхронизировать данные ИПЦ с World Bank",
        )

    if count == 0:
        raise HTTPException(
            status_code=502,
            detail="World Bank API не вернул данных ИПЦ. Повторите позже.",
        )

    return {
        "message": f"Синхронизировано {count} записей ИПЦ",
        "count": count,
        "source": "worldbank",
    }
