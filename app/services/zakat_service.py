"""
Калькулятор закята — расчёт обязательного исламского налога на имущество.

Функционал:
  - Расчёт закята 2.5% от чистых активов выше нисаба
  - Нисаб по золоту (85г) и серебру (595г) с актуальными курсами
  - Курсы ЦБ Узбекистана (cbu.uz) для UZS
  - Учёт узбекского налогообложения (вычет закята из НДФЛ — ст. 179 НК РУз)
  - Напоминания о сроках выплаты
  - Расчёт для различных категорий активов
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from enum import Enum

logger = logging.getLogger(__name__)


# ─── Константы закята ────────────────────────────────────────────────────────

ZAKAT_RATE = 0.025  # 2.5% — стандартная ставка закята

# Нисаб — минимальный порог для обязательности закята
NISAB_GOLD_GRAMS = 85.0      # 85 граммов золота
NISAB_SILVER_GRAMS = 595.0   # 595 граммов серебра (около 21 унции)

# Категории активов, облагаемых закятом
class AssetCategory(str, Enum):
    CASH = "cash"                         # Наличные и банковские счета
    GOLD_SILVER = "gold_silver"           # Золото и серебро
    INVESTMENTS = "investments"           # Инвестиции (акции, сукук)
    BUSINESS_INVENTORY = "business_inv"   # Товарные запасы бизнеса
    RECEIVABLES = "receivables"           # Дебиторская задолженность
    AGRICULTURAL = "agricultural"         # Сельскохозяйственная продукция
    REAL_ESTATE_TRADE = "real_estate"     # Недвижимость для торговли


# Фоллбэк-курсы (используются если cbu.uz недоступен)
FALLBACK_RATES = {
    "USD": 12850.0,     # 1 USD ≈ 12850 UZS (ориентировочный курс 2025)
    "EUR": 13900.0,
    "RUB": 140.0,
    "GBP": 16200.0,
    "gold_per_gram_usd": 72.0,    # 1 грамм золота ≈ $72
    "silver_per_gram_usd": 0.92,  # 1 грамм серебра ≈ $0.92
}


# ─── Получение курсов ────────────────────────────────────────────────────────

async def fetch_cbu_rates() -> Dict[str, float]:
    """
    Получение актуальных курсов валют с API ЦБ Узбекистана.

    API: https://cbu.uz/uz/arkhiv-kursov-valyut/json/
    Returns:
        Словарь {currency_code: rate_in_uzs}
    """
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://cbu.uz/uz/arkhiv-kursov-valyut/json/")
            if response.status_code == 200:
                data = response.json()
                rates = {}
                for item in data:
                    code = item.get("Ccy", "")
                    rate = float(item.get("Rate", 0))
                    if code and rate > 0:
                        rates[code] = rate
                logger.info(f"CBU rates fetched: {len(rates)} currencies")
                return rates
    except Exception as e:
        logger.warning(f"Failed to fetch CBU rates: {e}, using fallback")

    return {"USD": FALLBACK_RATES["USD"], "EUR": FALLBACK_RATES["EUR"],
            "RUB": FALLBACK_RATES["RUB"], "GBP": FALLBACK_RATES["GBP"]}


async def get_gold_price_uzs() -> Dict[str, float]:
    """
    Расчёт цены золота и серебра в UZS.
    Использует курс USD/UZS от ЦБ + мировую цену золота.

    Returns:
        {gold_per_gram_uzs, silver_per_gram_uzs, usd_uzs_rate}
    """
    rates = await fetch_cbu_rates()
    usd_rate = rates.get("USD", FALLBACK_RATES["USD"])

    gold_per_gram_usd = FALLBACK_RATES["gold_per_gram_usd"]
    silver_per_gram_usd = FALLBACK_RATES["silver_per_gram_usd"]

    # Попробуем получить актуальную цену золота
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Используем бесплатный API для цен на металлы
            response = await client.get(
                "https://api.metals.live/v1/spot/gold"
            )
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    # Цена за тройскую унцию (31.1035 грамм)
                    oz_price = float(data[0].get("price", 0))
                    if oz_price > 0:
                        gold_per_gram_usd = oz_price / 31.1035

            response2 = await client.get(
                "https://api.metals.live/v1/spot/silver"
            )
            if response2.status_code == 200:
                data2 = response2.json()
                if data2 and len(data2) > 0:
                    oz_price_ag = float(data2[0].get("price", 0))
                    if oz_price_ag > 0:
                        silver_per_gram_usd = oz_price_ag / 31.1035
    except Exception as e:
        logger.warning(f"Failed to fetch metal prices: {e}, using fallback")

    return {
        "gold_per_gram_uzs": round(gold_per_gram_usd * usd_rate, 2),
        "silver_per_gram_uzs": round(silver_per_gram_usd * usd_rate, 2),
        "gold_per_gram_usd": round(gold_per_gram_usd, 2),
        "silver_per_gram_usd": round(silver_per_gram_usd, 2),
        "usd_uzs_rate": usd_rate,
    }


# ─── Расчёт нисаба ──────────────────────────────────────────────────────────

async def calculate_nisab(currency: str = "UZS") -> Dict[str, Any]:
    """
    Расчёт текущего нисаба в указанной валюте.

    Нисаб = стоимость 85г золота ИЛИ 595г серебра (берётся меньший).
    В ханафитском мазхабе (преобладает в Узбекистане) обычно берут серебряный нисаб.

    Args:
        currency: Валюта для расчёта (UZS, USD, EUR, RUB)

    Returns:
        Нисаб в указанной валюте (золотой и серебряный эквиваленты).
    """
    prices = await get_gold_price_uzs()
    rates = await fetch_cbu_rates()

    nisab_gold_uzs = NISAB_GOLD_GRAMS * prices["gold_per_gram_uzs"]
    nisab_silver_uzs = NISAB_SILVER_GRAMS * prices["silver_per_gram_uzs"]

    # Конвертация в нужную валюту
    if currency == "UZS":
        convert = 1.0
    elif currency in rates:
        convert = 1.0 / rates[currency]
    else:
        convert = 1.0 / rates.get("USD", FALLBACK_RATES["USD"])

    nisab_gold_converted = round(nisab_gold_uzs * convert, 2)
    nisab_silver_converted = round(nisab_silver_uzs * convert, 2)
    nisab_recommended = min(nisab_gold_converted, nisab_silver_converted)

    return {
        "currency": currency,
        "nisab_gold": {
            "grams": NISAB_GOLD_GRAMS,
            "value": nisab_gold_converted,
            "display": f"{nisab_gold_converted:,.2f} {currency}",
        },
        "nisab_silver": {
            "grams": NISAB_SILVER_GRAMS,
            "value": nisab_silver_converted,
            "display": f"{nisab_silver_converted:,.2f} {currency}",
        },
        "nisab_recommended": {
            "value": nisab_recommended,
            "display": f"{nisab_recommended:,.2f} {currency}",
            "basis": "silver" if nisab_silver_converted <= nisab_gold_converted else "gold",
            "note": "Ханафитский мазхаб (преобладает в Узбекистане) — нисаб по серебру",
        },
        "metal_prices": prices,
        "calculated_at": datetime.now().isoformat(),
    }


# ─── Калькулятор закята ──────────────────────────────────────────────────────

async def calculate_zakat(
    assets: Dict[str, float],
    liabilities: Dict[str, float] = None,
    currency: str = "UZS",
    gold_grams: float = 0.0,
    silver_grams: float = 0.0,
    hijri_year_start: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Расчёт суммы закята.

    Формула: Закят = (Совокупные активы - Долги) × 2.5%
    Условие: Чистые активы >= Нисаб И прошёл 1 лунный год (хауль)

    Args:
        assets: Словарь категорий активов и их стоимости.
            Ключи: cash, investments, business_inventory, receivables, other
        liabilities: Словарь обязательств (долги, кредиты).
            Ключи: loans, debts, payables, other
        currency: Валюта расчёта.
        gold_grams: Граммы золота в собственности.
        silver_grams: Граммы серебра в собственности.
        hijri_year_start: Дата начала лунного года (для расчёта хауля).

    Returns:
        Детальный расчёт закята.
    """
    if liabilities is None:
        liabilities = {}

    prices = await get_gold_price_uzs()
    rates = await fetch_cbu_rates()

    # Конвертация золота и серебра в валюту
    if currency == "UZS":
        gold_value = gold_grams * prices["gold_per_gram_uzs"]
        silver_value = silver_grams * prices["silver_per_gram_uzs"]
    else:
        gold_value = gold_grams * prices["gold_per_gram_usd"]
        silver_value = silver_grams * prices["silver_per_gram_usd"]
        if currency != "USD" and currency in rates:
            usd_rate = rates.get("USD", FALLBACK_RATES["USD"])
            curr_rate = rates.get(currency, 1)
            factor = usd_rate / curr_rate
            gold_value *= factor
            silver_value *= factor

    # Суммирование активов
    asset_breakdown = {}
    total_assets_value = 0.0

    for category, value in assets.items():
        asset_breakdown[category] = {
            "value": round(value, 2),
            "display": f"{value:,.2f} {currency}",
        }
        total_assets_value += value

    # Добавляем металлы
    if gold_grams > 0:
        asset_breakdown["gold"] = {
            "grams": gold_grams,
            "value": round(gold_value, 2),
            "display": f"{gold_value:,.2f} {currency} ({gold_grams}г)",
        }
        total_assets_value += gold_value

    if silver_grams > 0:
        asset_breakdown["silver"] = {
            "grams": silver_grams,
            "value": round(silver_value, 2),
            "display": f"{silver_value:,.2f} {currency} ({silver_grams}г)",
        }
        total_assets_value += silver_value

    # Суммирование обязательств
    liability_breakdown = {}
    total_liabilities = 0.0
    for category, value in liabilities.items():
        liability_breakdown[category] = {
            "value": round(value, 2),
            "display": f"{value:,.2f} {currency}",
        }
        total_liabilities += value

    # Чистые активы
    net_assets = total_assets_value - total_liabilities

    # Проверка нисаба
    nisab = await calculate_nisab(currency)
    nisab_value = nisab["nisab_recommended"]["value"]
    meets_nisab = net_assets >= nisab_value

    # Расчёт закята
    zakat_amount = 0.0
    if meets_nisab:
        zakat_amount = net_assets * ZAKAT_RATE

    # Расчёт хауля (лунного года)
    hawl_info = None
    if hijri_year_start:
        try:
            start_date = datetime.fromisoformat(hijri_year_start)
            # Лунный год ≈ 354 дня
            hawl_end = start_date + timedelta(days=354)
            days_remaining = (hawl_end - datetime.now()).days
            hawl_info = {
                "start_date": hijri_year_start,
                "end_date": hawl_end.isoformat(),
                "days_remaining": max(0, days_remaining),
                "completed": days_remaining <= 0,
                "note": "Закят выплачивается по истечении хауля (354 дня — лунный год)",
            }
        except ValueError:
            hawl_info = {"error": "Неверный формат даты. Используйте ISO 8601."}

    # Налоговые аспекты Узбекистана
    uz_tax_info = {
        "note": "Согласно ст. 179 НК Республики Узбекистан, благотворительные взносы "
                "(включая закят) могут вычитаться из налогооблагаемого дохода в пределах "
                "установленных лимитов.",
        "tax_deduction_possible": True,
        "max_deduction_percent": 0.05,  # До 5% от налогооблагаемого дохода
        "recommendation": "Сохраняйте квитанции для подтверждения выплаты закята при подаче налоговой декларации.",
    }

    return {
        "zakat_amount": round(zakat_amount, 2),
        "zakat_display": f"{zakat_amount:,.2f} {currency}",
        "zakat_rate": f"{ZAKAT_RATE * 100}%",
        "meets_nisab": meets_nisab,
        "nisab_threshold": nisab_value,
        "nisab_display": f"{nisab_value:,.2f} {currency}",
        "net_assets": round(net_assets, 2),
        "net_assets_display": f"{net_assets:,.2f} {currency}",
        "total_assets": round(total_assets_value, 2),
        "total_liabilities": round(total_liabilities, 2),
        "asset_breakdown": asset_breakdown,
        "liability_breakdown": liability_breakdown,
        "hawl": hawl_info,
        "uzbekistan_tax": uz_tax_info,
        "currency": currency,
        "metal_prices": prices,
        "calculated_at": datetime.now().isoformat(),
    }


# ─── Напоминания о закяте ───────────────────────────────────────────────────

def get_zakat_reminder(
    hawl_start: str,
    reminder_days_before: int = 30,
) -> Dict[str, Any]:
    """
    Создать напоминание о сроках выплаты закята.

    Args:
        hawl_start: Дата начала лунного года (ISO 8601).
        reminder_days_before: За сколько дней до хауля напомнить.

    Returns:
        Информация о напоминании.
    """
    try:
        start_date = datetime.fromisoformat(hawl_start)
    except ValueError:
        return {"error": "Неверный формат даты. Используйте ISO 8601 (YYYY-MM-DD)."}

    # Лунный год ≈ 354 дня
    hawl_end = start_date + timedelta(days=354)
    reminder_date = hawl_end - timedelta(days=reminder_days_before)
    now = datetime.now()

    days_to_hawl = (hawl_end - now).days
    days_to_reminder = (reminder_date - now).days

    if days_to_hawl <= 0:
        status = "overdue"
        message = (
            "Срок выплаты закята наступил. "
            "Рекомендуется произвести расчёт и выплатить закят как можно скорее."
        )
    elif days_to_reminder <= 0:
        status = "upcoming"
        message = (
            f"До окончания хауля осталось {days_to_hawl} дней. "
            "Пора подготовить расчёт закята."
        )
    else:
        status = "scheduled"
        message = (
            f"Напоминание о закяте запланировано через {days_to_reminder} дней "
            f"(за {reminder_days_before} дней до хауля)."
        )

    return {
        "status": status,
        "message": message,
        "hawl_start": hawl_start,
        "hawl_end": hawl_end.isoformat(),
        "reminder_date": reminder_date.isoformat(),
        "days_to_hawl": max(0, days_to_hawl),
        "days_to_reminder": max(0, days_to_reminder),
        "current_date": now.isoformat(),
        "recommendations": [
            "Подготовьте инвентаризацию всех активов (наличные, вклады, инвестиции, золото)",
            "Соберите данные об обязательствах (долги, кредиты)",
            "Определите текущий нисаб по курсу ЦБ Узбекистана",
            "Рассчитайте закят через калькулятор AI Capital",
            "Сохраните квитанцию для налоговой декларации (ст. 179 НК РУз)",
        ],
    }


# ─── Справочная информация ───────────────────────────────────────────────────

def get_zakat_guide() -> Dict[str, Any]:
    """Полное руководство по закяту для пользователей Узбекистана."""
    return {
        "title": "Руководство по закяту — AI Capital",
        "sections": [
            {
                "title": "Что такое закят?",
                "content": (
                    "Закят (араб. الزكاة) — обязательный исламский налог на имущество, "
                    "один из пяти столпов ислама. Составляет 2.5% от чистых активов, "
                    "превышающих нисаб, по истечении лунного года (хауль — 354 дня)."
                ),
            },
            {
                "title": "Кто обязан платить?",
                "content": (
                    "Совершеннолетний мусульманин, чьи чистые активы (за вычетом долгов) "
                    "достигли нисаба и удерживались в течение одного лунного года."
                ),
            },
            {
                "title": "Нисаб",
                "content": (
                    "Нисаб — минимальный порог: стоимость 85г золота или 595г серебра. "
                    "В ханафитском мазхабе (основной в Узбекистане) используется "
                    "серебряный нисаб как более доступный. Актуальные курсы — cbu.uz."
                ),
            },
            {
                "title": "Облагаемые активы",
                "content": (
                    "Наличные, банковские вклады, золото/серебро, инвестиции (акции, сукук), "
                    "товарные запасы бизнеса, дебиторская задолженность. "
                    "Не облагаются: личное жильё, личный транспорт, предметы обихода."
                ),
            },
            {
                "title": "Налоговые льготы в Узбекистане",
                "content": (
                    "Согласно статье 179 Налогового кодекса Республики Узбекистан, "
                    "благотворительные взносы (включая закят) могут вычитаться "
                    "из налогооблагаемого дохода. Сохраняйте подтверждающие документы."
                ),
            },
            {
                "title": "Получатели закята (8 категорий — Коран, 9:60)",
                "categories": [
                    "Фукара (бедные)",
                    "Масакин (нуждающиеся)",
                    "Амилин (сборщики закята)",
                    "Муаллафатуль-кулюб (новообращённые)",
                    "Фи-р-рикаб (освобождение рабов)",
                    "Гаримин (должники)",
                    "Фи сабилиллях (на пути Аллаха)",
                    "Ибн-ус-сабиль (путники)",
                ],
            },
        ],
        "disclaimer": (
            "Данный калькулятор предоставляет приблизительный расчёт. "
            "Для точного определения суммы закята рекомендуется консультация "
            "с квалифицированным учёным-исламоведом (алимом)."
        ),
    }
