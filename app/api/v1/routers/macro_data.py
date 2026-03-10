"""
Роутер макроэкономических данных Узбекистана.

Эндпоинты:
- GET  /macro/health     — проверка доступности сервиса
- GET  /macro/indicators — список индикаторов из БД
- GET  /macro/summary    — последние значения ключевых индикаторов
- POST /macro/sync       — синхронизация с World Bank API
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_db
from app.services.macro_data_service import (
    get_indicators,
    get_summary,
    sync_macro_indicators,
    INDICATORS,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/macro", tags=["Макроданные"])


@router.get(
    "/health",
    summary="Проверка доступности сервиса макроданных",
)
async def health_check(
    _current_user=Depends(get_current_user),
):
    """Проверка работоспособности сервиса макроэкономических данных."""
    return {
        "status": "ok",
        "source": "worldbank",
        "indicators_count": len(INDICATORS),
    }


@router.get(
    "/indicators",
    summary="Список макроэкономических индикаторов",
)
async def list_indicators(
    code: str = Query(None, description="Код индикатора World Bank для фильтрации"),
    limit: int = Query(20, ge=1, le=200, description="Максимальное количество записей"),
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Получение макроэкономических индикаторов из БД.

    Можно фильтровать по коду индикатора (напр. NY.GDP.MKTP.CD).
    Возвращает записи отсортированные по дате (новые первые).
    """
    try:
        records = get_indicators(db, indicator_code=code, limit=limit)
    except Exception as e:
        logger.error("Ошибка получения индикаторов: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка при получении данных")

    return [
        {
            "id": r.id,
            "source": r.source,
            "indicator_code": r.indicator_code,
            "indicator_name": r.indicator_name,
            "value": r.value,
            "unit": r.unit,
            "period_date": r.period_date.isoformat() if r.period_date else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.get(
    "/summary",
    summary="Сводка ключевых макропоказателей",
)
async def macro_summary(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Получение последних значений всех ключевых индикаторов.

    Возвращает словарь с последними данными по ВВП, инфляции,
    промышленности и населению.
    """
    try:
        summary = get_summary(db)
    except Exception as e:
        logger.error("Ошибка получения сводки макроданных: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка при получении сводки")

    return summary


@router.post(
    "/sync",
    summary="Синхронизация макроданных с World Bank",
)
async def sync_data(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Запуск синхронизации макроэкономических данных с World Bank API.

    Загружает свежие данные по всем ключевым индикаторам и сохраняет
    в БД. Существующие записи обновляются (upsert).
    """
    try:
        count = await sync_macro_indicators(db)
    except Exception as e:
        logger.error("Ошибка синхронизации макроданных: %s", e)
        raise HTTPException(
            status_code=502,
            detail="Не удалось синхронизировать данные с World Bank",
        )

    if count == 0:
        raise HTTPException(
            status_code=502,
            detail="World Bank API не вернул данных. Повторите позже.",
        )

    return {
        "message": f"Синхронизировано {count} макроиндикаторов",
        "count": count,
        "source": "worldbank",
    }
