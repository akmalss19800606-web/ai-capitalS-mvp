"""
Сервис биржевых данных — интеграция с UZSE (Ташкентская фондовая биржа).

Парсинг HTML-страниц uzse.uz для получения котировок и сделок.
Публичный API отсутствует — данные извлекаются из HTML.

Источники:
- Котировки (тикерная лента): https://uzse.uz/?locale=ru (div.main-ticker-item)
- Последние сделки (таблица): https://uzse.uz/?locale=ru (table #0)

Примечание: SSL-сертификат uzse.uz не входит в стандартный набор CA,
поэтому используется verify=False.
"""

import logging
import re
from datetime import date, datetime
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.db.models.stock_exchange import StockQuote, StockEmitter

logger = logging.getLogger(__name__)

UZSE_MAIN_URL = "https://uzse.uz/"
DEFAULT_TIMEOUT = 20.0
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
}


def _parse_number(text: str) -> Optional[float]:
    """
    Парсинг числового значения из текста.

    Обрабатывает узбекский/русский формат: пробелы как разделитель тысяч,
    запятая как десятичный разделитель.
    """
    if not text:
        return None
    # Убираем пробелы, неразрывные пробелы и спецсимволы
    cleaned = text.strip().replace("\xa0", "").replace(" ", "")
    # Заменяем запятую на точку для десятичного разделителя
    cleaned = cleaned.replace(",", ".")
    # Убираем всё кроме цифр, точки и минуса
    cleaned = re.sub(r"[^\d.\-]", "", cleaned)
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _parse_trade_date(text: str) -> date:
    """
    Парсинг даты сделки из текста.

    Пробует несколько форматов: DD.MM.YYYY, YYYY-MM-DD,
    а также формат UZSE: "06 март, 16:02".
    """
    if not text:
        return date.today()

    text = text.strip()

    for fmt in ["%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue

    # Формат UZSE: "06 март, 16:02" — извлекаем день и месяц
    months_ru = {
        "январ": 1, "феврал": 2, "март": 3, "апрел": 4,
        "мая": 5, "май": 5, "июн": 6, "июл": 7, "август": 8,
        "сентябр": 9, "октябр": 10, "ноябр": 11, "декабр": 12,
    }
    text_lower = text.lower()
    for month_prefix, month_num in months_ru.items():
        if month_prefix in text_lower:
            day_match = re.search(r"(\d{1,2})", text)
            if day_match:
                try:
                    day = int(day_match.group(1))
                    return date(date.today().year, month_num, day)
                except ValueError:
                    pass

    # Пробуем извлечь дату формата DD.MM.YYYY
    match = re.search(r"(\d{2})[.\-/](\d{2})[.\-/](\d{4})", text)
    if match:
        try:
            return date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
        except ValueError:
            pass

    return date.today()


async def _fetch_main_page() -> Optional[BeautifulSoup]:
    """
    Загрузка и парсинг главной страницы UZSE.

    Используется verify=False т.к. SSL-сертификат uzse.uz
    не входит в стандартный набор CA.
    """
    try:
        async with httpx.AsyncClient(
            timeout=DEFAULT_TIMEOUT,
            headers=HEADERS,
            follow_redirects=True,
            verify=False,
        ) as client:
            response = await client.get(UZSE_MAIN_URL, params={"locale": "ru"})
            response.raise_for_status()

        return BeautifulSoup(response.text, "lxml")

    except httpx.HTTPStatusError as e:
        logger.error("Ошибка HTTP при загрузке uzse.uz: %s", e)
    except httpx.RequestError as e:
        logger.error("Ошибка подключения к uzse.uz: %s", e)
    except Exception as e:
        logger.error("Непредвиденная ошибка при загрузке uzse.uz: %s", e)

    return None


async def fetch_quotation_prices() -> list[dict]:
    """
    Парсинг котировальных цен из тикерной ленты на главной странице UZSE.

    Тикерная лента содержит div.main-ticker-item с данными:
    тикер, название компании, цена закрытия, последняя цена.

    Returns:
        Список словарей с данными котировок.
    """
    results = []

    soup = await _fetch_main_page()
    if not soup:
        return []

    try:
        # Парсим тикерную ленту (div.main-ticker-item)
        ticker_items = soup.find_all(class_=lambda x: x and "main-ticker-item" in x)

        for item in ticker_items:
            text = item.get_text(separator="|", strip=True)
            if not text:
                continue

            # Формат текста: "HMKB (<Hamkorbank> ATB )|Цена закрытия :57.9|Цена последний сделки :58|(..."
            parts = text.split("|")
            if len(parts) < 2:
                continue

            # Извлекаем тикер и название из первой части
            first_part = parts[0].strip()
            ticker_match = re.match(r"^([A-ZА-ЯЁ]{2,10})\b", first_part)
            if not ticker_match:
                continue

            ticker = ticker_match.group(1).upper()

            # Извлекаем название компании из скобок
            name_match = re.search(r"\((.+?)\)", first_part)
            emitter_name = name_match.group(1).strip() if name_match else ""
            # Убираем символы < > из названия
            emitter_name = emitter_name.replace("<", "").replace(">", "").strip()

            # Извлекаем цены и дату по позиции: метка в parts[i], значение в parts[i+1]
            close_price = None
            last_price = None
            trade_date = date.today()

            for idx, part in enumerate(parts):
                part_lower = part.lower().strip()
                if "дата" in part_lower and "сделк" in part_lower and idx + 1 < len(parts):
                    trade_date = _parse_trade_date(parts[idx + 1].strip())
                elif "закрыт" in part_lower and idx + 1 < len(parts):
                    close_price = _parse_number(parts[idx + 1])
                elif "последн" in part_lower and "сделк" in part_lower and idx + 1 < len(parts):
                    last_price = _parse_number(parts[idx + 1])

            if not close_price and not last_price:
                continue

            results.append({
                "ticker": ticker,
                "emitter_name": emitter_name,
                "close_price": close_price or last_price,
                "last_price": last_price,
                "trade_date": trade_date,
            })

        logger.info("UZSE: загружено %d котировок из тикерной ленты", len(results))

    except Exception as e:
        logger.error("Непредвиденная ошибка при парсинге котировок UZSE: %s", e)

    return results


async def fetch_last_trades() -> list[dict]:
    """
    Парсинг последних сделок из таблицы на главной странице UZSE.

    Таблица содержит: Время, Код ЦБ, Эмитент, Тип ЦБ,
    Рынок, Площадка, Торговая цена, Кол-во ЦБ, Объём торгов.

    Returns:
        Список словарей с данными последних сделок.
    """
    results = []

    soup = await _fetch_main_page()
    if not soup:
        return []

    try:
        tables = soup.find_all("table")

        for table in tables:
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue

            # Проверяем заголовок — ищем таблицу сделок
            header_cells = rows[0].find_all(["th", "td"])
            header_texts = [c.get_text(strip=True).lower() for c in header_cells]

            # Таблица сделок должна содержать "время" или "код" в заголовке
            is_trades_table = any(
                "время" in h or "код цб" in h or "торговая" in h
                for h in header_texts
            )
            if not is_trades_table:
                continue

            for row in rows[1:]:
                cells = row.find_all(["td", "th"])
                if len(cells) < 4:
                    continue

                cell_texts = [c.get_text(strip=True) for c in cells]

                trade = {}

                if len(cell_texts) >= 9:
                    # Полная таблица: Время, Код ЦБ, Эмитент, Тип ЦБ,
                    # Рынок, Площадка, Торговая цена, Кол-во, Объём
                    trade = {
                        "time": cell_texts[0],
                        "security_code": cell_texts[1],
                        "issuer_name": cell_texts[2],
                        "security_type": cell_texts[3],
                        "market": cell_texts[4],
                        "board": cell_texts[5],
                        "trade_price": _parse_number(cell_texts[6]),
                        "volume": _parse_number(cell_texts[7]),
                        "trade_value": cell_texts[8],
                    }

                    # Извлекаем тикер из кода ЦБ (первые 4 буквы)
                    code = cell_texts[1]
                    ticker_match = re.match(r"^[A-Z]{2,6}", code)
                    if ticker_match:
                        trade["ticker"] = ticker_match.group(0)

                elif len(cell_texts) >= 5:
                    trade = {
                        "time": cell_texts[0],
                        "security_code": cell_texts[1],
                        "issuer_name": cell_texts[2],
                        "trade_price": _parse_number(cell_texts[3]),
                        "volume": _parse_number(cell_texts[4]),
                    }

                if trade:
                    results.append(trade)

        logger.info("UZSE: загружено %d последних сделок", len(results))

    except Exception as e:
        logger.error("Непредвиденная ошибка при парсинге сделок UZSE: %s", e)

    return results


async def sync_stock_data(db: Session) -> int:
    """
    Синхронизация данных UZSE в БД.

    Загружает котировки из тикерной ленты, сохраняет/обновляет записи
    в таблицах stock_quotes и stock_emitters.

    Args:
        db: Сессия SQLAlchemy.

    Returns:
        Количество сохранённых/обновлённых записей.
    """
    quotes = await fetch_quotation_prices()
    if not quotes:
        return 0

    count = 0
    for q in quotes:
        ticker = q["ticker"]
        trade_date = q.get("trade_date", date.today())

        # Upsert котировки: по (ticker, trade_date)
        existing_quote = db.query(StockQuote).filter(
            StockQuote.ticker == ticker,
            StockQuote.trade_date == trade_date,
        ).first()

        if existing_quote:
            existing_quote.close_price = q.get("close_price")
            existing_quote.emitter_name = q.get("emitter_name", existing_quote.emitter_name)
        else:
            new_quote = StockQuote(
                ticker=ticker,
                emitter_name=q.get("emitter_name", ""),
                close_price=q.get("close_price"),
                trade_date=trade_date,
            )
            db.add(new_quote)

        # Upsert эмитента: по ticker
        if q.get("emitter_name"):
            existing_emitter = db.query(StockEmitter).filter(
                StockEmitter.ticker == ticker,
            ).first()

            if not existing_emitter:
                new_emitter = StockEmitter(
                    ticker=ticker,
                    full_name=q["emitter_name"],
                )
                db.add(new_emitter)
            elif not existing_emitter.full_name:
                existing_emitter.full_name = q["emitter_name"]

        count += 1

    db.commit()
    logger.info("UZSE: синхронизировано %d котировок в БД", count)
    return count


def get_quotes(
    db: Session,
    ticker: Optional[str] = None,
    limit: int = 50,
) -> list[StockQuote]:
    """
    Получить котировки из БД.

    Args:
        db: Сессия SQLAlchemy.
        ticker: Тикер для фильтрации (опционально).
        limit: Максимальное количество записей.

    Returns:
        Список объектов StockQuote.
    """
    query = db.query(StockQuote)

    if ticker:
        query = query.filter(StockQuote.ticker == ticker.upper())

    return query.order_by(StockQuote.trade_date.desc()).limit(limit).all()


def get_emitters(db: Session) -> list[StockEmitter]:
    """
    Получить список эмитентов из БД.

    Args:
        db: Сессия SQLAlchemy.

    Returns:
        Список объектов StockEmitter.
    """
    return db.query(StockEmitter).order_by(StockEmitter.ticker).all()
