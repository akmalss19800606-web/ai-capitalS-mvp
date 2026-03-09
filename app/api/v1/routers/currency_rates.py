"""
Роутер курсов валют — /rates.
Этап 0, Сессия 0.2 — Валюта UZS.

Эндпоинты:
  GET  /rates          — актуальные курсы ЦБ Узбекистана
  POST /rates/sync     — загрузить/обновить курсы из cbu.uz
  POST /rates/convert  — конвертация суммы через UZS
"""
from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.db.models.user import User
from app.schemas.currency import (
    CurrencyRateResponse,
    CurrencyRatesListResponse,
    CurrencyConvertRequest,
    CurrencyConvertResponse,
)
from app.services.currency_service import (
    sync_rates_to_db,
    get_latest_rates,
    convert_to_uzs,
    convert_from_uzs,
    format_uzs,
    KEY_CURRENCIES,
)

router = APIRouter(prefix="/rates", tags=["Currency Rates"])


@router.get(
    "",
    response_model=CurrencyRatesListResponse,
    summary="Актуальные курсы валют ЦБ Узбекистана",
)
def get_rates(
    codes: Optional[str] = Query(
        None,
        description="Коды валют через запятую (USD,EUR,RUB). Без параметра — ключевые валюты.",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Возвращает последние курсы валют из локального кеша (БД).
    Если кеш пуст — автоматически загружает с cbu.uz.
    """
    # Определяем список кодов
    if codes:
        code_list = [c.strip().upper() for c in codes.split(",") if c.strip()]
    else:
        code_list = KEY_CURRENCIES

    # Пробуем получить из БД
    rates = get_latest_rates(db, codes=code_list)

    # Если БД пуста — автозагрузка
    if not rates:
        synced = sync_rates_to_db(db)
        if synced > 0:
            rates = get_latest_rates(db, codes=code_list)

    rate_items = [
        CurrencyRateResponse(
            code=r.code,
            ccy_name_ru=r.ccy_name_ru,
            nominal=r.nominal,
            rate=r.rate,
            diff=r.diff,
            rate_date=r.rate_date,
        )
        for r in rates
    ]

    return CurrencyRatesListResponse(
        rates=rate_items,
        fetched_at=rates[0].fetched_at if rates else None,
    )


@router.post(
    "/sync",
    summary="Синхронизировать курсы с cbu.uz",
)
def sync_rates(
    target_date: Optional[date] = Query(
        None, description="Дата курсов (YYYY-MM-DD). По умолчанию — сегодня."
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Загружает курсы валют с cbu.uz и сохраняет в БД.
    Существующие записи обновляются (upsert).
    """
    count = sync_rates_to_db(db, target_date=target_date)
    if count == 0:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Не удалось получить данные с cbu.uz. Повторите позже.",
        )
    return {
        "message": f"Синхронизировано {count} курсов валют",
        "count": count,
        "date": str(target_date or "сегодня"),
    }


@router.post(
    "/convert",
    response_model=CurrencyConvertResponse,
    summary="Конвертация валют через UZS",
)
def convert_currency(
    body: CurrencyConvertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Конвертирует сумму между валютами через UZS.
    Поддерживает: USD->UZS, UZS->EUR, USD->EUR (через UZS).
    """
    from_ccy = body.from_currency.upper()
    to_ccy = body.to_currency.upper()

    # Прямая конвертация в UZS
    if to_ccy == "UZS":
        result = convert_to_uzs(db, body.amount, from_ccy)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Курс для {from_ccy} не найден. Выполните /rates/sync.",
            )
        return CurrencyConvertResponse(
            amount=body.amount,
            from_currency=from_ccy,
            to_currency=to_ccy,
            rate=result["rate"],
            result=result["result"],
            rate_date=result["rate_date"],
        )

    # Прямая конвертация из UZS
    if from_ccy == "UZS":
        result = convert_from_uzs(db, body.amount, to_ccy)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Курс для {to_ccy} не найден. Выполните /rates/sync.",
            )
        return CurrencyConvertResponse(
            amount=body.amount,
            from_currency=from_ccy,
            to_currency=to_ccy,
            rate=result["rate"],
            result=result["result"],
            rate_date=result["rate_date"],
        )

    # Кросс-конвертация через UZS: FROM -> UZS -> TO
    to_uzs = convert_to_uzs(db, body.amount, from_ccy)
    if not to_uzs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Курс для {from_ccy} не найден. Выполните /rates/sync.",
        )

    from_uzs = convert_from_uzs(db, to_uzs["result"], to_ccy)
    if not from_uzs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Курс для {to_ccy} не найден. Выполните /rates/sync.",
        )

    # Кросс-курс: сколько to_ccy за 1 from_ccy
    cross_rate = round(from_uzs["result"] / body.amount, 6) if body.amount else 0

    return CurrencyConvertResponse(
        amount=body.amount,
        from_currency=from_ccy,
        to_currency=to_ccy,
        rate=cross_rate,
        result=from_uzs["result"],
        rate_date=to_uzs["rate_date"],
    )
