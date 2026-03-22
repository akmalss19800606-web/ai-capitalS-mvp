"""
Nisab Service — вычисляет нисаб по текущей цене золота.
Нисаб = 85 граммов золота (стандарт AAOIFI SS Intro).
Курс берётся из таблицы currency_rate (модель CurrencyRate).
"""
from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import desc

# 85 г золота — нисаб по AAOIFI
NISAB_GOLD_GRAMS = Decimal("85")


def get_nisab_today(db: Session) -> dict:
    """
    Возвращает нисаб в UZS и USD по текущему курсу.
    Ищет последнюю запись gold_price_uzs и exchange_rate в currency_rate.
    Если таблица пуста — использует fallback-значения для разработки.
    """
    try:
        from app.db.models.currencyrate import CurrencyRate
        rate_row = (
            db.query(CurrencyRate)
            .order_by(desc(CurrencyRate.rate_date))
            .first()
        )
    except Exception:
        rate_row = None

    if rate_row and hasattr(rate_row, "gold_price_uzs") and rate_row.gold_price_uzs:
        gold_price_uzs = Decimal(str(rate_row.gold_price_uzs))
        exchange_rate_uzs = Decimal(str(rate_row.usd_uzs)) if hasattr(rate_row, "usd_uzs") else Decimal("12700")
        rate_date = rate_row.rate_date
        source = "db"
    else:
        # Fallback для dev-среды: ~$85/г × 12700 UZS/USD
        gold_price_uzs = Decimal("1079500")   # ~$85 × 12700
        exchange_rate_uzs = Decimal("12700")
        rate_date = date.today()
        source = "fallback"

    nisab_uzs = NISAB_GOLD_GRAMS * gold_price_uzs
    nisab_usd = nisab_uzs / exchange_rate_uzs

    return {
        "nisab_gold_grams": NISAB_GOLD_GRAMS,
        "gold_price_uzs": gold_price_uzs,
        "nisab_uzs": nisab_uzs.quantize(Decimal("0.01")),
        "exchange_rate_uzs": exchange_rate_uzs,
        "nisab_usd": nisab_usd.quantize(Decimal("0.01")),
        "rate_date": rate_date,
        "source": source,
    }
