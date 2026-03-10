"""
Сервис поиска и получения данных о компаниях Узбекистана через orginfo.uz.

Парсинг HTML-страниц orginfo.uz для получения информации о юридических лицах
по ИНН или наименованию. Кэширование результатов в БД (CompanyProfile).
"""

import logging
import re
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.db.models.company_lookup import CompanyProfile

logger = logging.getLogger(__name__)

BASE_URL = "https://orginfo.uz"
SEARCH_URL = f"{BASE_URL}/ru/search"
DEFAULT_TIMEOUT = 15.0
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
}


async def search_company_orginfo(query: str) -> list[dict]:
    """
    Поиск компании на orginfo.uz по ИНН или наименованию.

    Выполняет GET-запрос на страницу поиска, парсит результаты
    и возвращает список найденных организаций.

    Args:
        query: ИНН или наименование компании для поиска.

    Returns:
        Список словарей с полями: inn, name, url, status.
    """
    results = []
    try:
        async with httpx.AsyncClient(
            timeout=DEFAULT_TIMEOUT, headers=HEADERS, follow_redirects=True
        ) as client:
            response = await client.get(SEARCH_URL, params={"q": query})
            response.raise_for_status()

        # Парсим HTML страницы результатов поиска
        soup = BeautifulSoup(response.text, "lxml")

        # Ищем ссылки на организации вида /ru/organization/{hash}/
        org_links = soup.find_all("a", href=re.compile(r"/ru/organization/[\w-]+/?"))

        seen_urls = set()
        for link in org_links:
            href = link.get("href", "")
            if href in seen_urls:
                continue
            seen_urls.add(href)

            # Извлекаем название из текста ссылки или родительского элемента
            name = link.get_text(strip=True)
            if not name:
                continue

            # Полный URL организации
            org_url = f"{BASE_URL}{href}" if href.startswith("/") else href

            # Пытаемся извлечь ИНН и статус из окружающего контекста
            parent = link.find_parent(["div", "li", "tr", "article"])
            inn = _extract_inn_from_element(parent) if parent else ""
            status = _extract_status_from_element(parent) if parent else ""

            results.append({
                "inn": inn,
                "name": name,
                "url": org_url,
                "status": status,
            })

    except httpx.HTTPStatusError as e:
        logger.error("Ошибка HTTP при поиске на orginfo.uz: %s", e)
    except httpx.RequestError as e:
        logger.error("Ошибка подключения к orginfo.uz: %s", e)
    except Exception as e:
        logger.error("Непредвиденная ошибка при поиске компании: %s", e)

    return results


async def fetch_company_details(org_url: str) -> dict:
    """
    Получение детальной информации о компании со страницы организации на orginfo.uz.

    Парсит страницу организации и извлекает: ИНН, название, директор,
    адрес, ОКЭД, уставный фонд, статус, телефон, email.

    Args:
        org_url: Полный URL страницы организации на orginfo.uz.

    Returns:
        Словарь с детальными данными компании.
    """
    details = {
        "inn": "",
        "name": "",
        "director": "",
        "address": "",
        "oked": "",
        "charter_fund": "",
        "status": "",
        "phone": "",
        "email": "",
    }
    try:
        async with httpx.AsyncClient(
            timeout=DEFAULT_TIMEOUT, headers=HEADERS, follow_redirects=True
        ) as client:
            response = await client.get(org_url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")

        # Извлекаем название из заголовка страницы
        title_tag = soup.find("h1") or soup.find("title")
        if title_tag:
            raw_title = title_tag.get_text(strip=True)
            # Убираем суффиксы типа "- orginfo.uz"
            details["name"] = re.sub(r"\s*[-–|].*orginfo.*$", "", raw_title).strip()

        # Парсим таблицы и карточки с данными организации
        # Ищем пары «Ключ: Значение» в таблицах, dl, div-карточках
        _parse_tables(soup, details)
        _parse_definition_lists(soup, details)
        _parse_card_blocks(soup, details)

        # Извлекаем контакты
        _extract_contacts(soup, details)

    except httpx.HTTPStatusError as e:
        logger.error("Ошибка HTTP при загрузке страницы организации: %s", e)
    except httpx.RequestError as e:
        logger.error("Ошибка подключения при загрузке организации: %s", e)
    except Exception as e:
        logger.error("Ошибка парсинга страницы организации: %s", e)

    return details


async def lookup_by_inn(db: Session, inn: str) -> dict | None:
    """
    Поиск компании по ИНН: сначала в кэше БД, затем на orginfo.uz.

    Если компания найдена на orginfo.uz, сохраняет результат в БД
    для последующего кэширования.

    Args:
        db: Сессия SQLAlchemy.
        inn: ИНН компании (строка из цифр).

    Returns:
        Словарь с данными компании или None, если не найдена.
    """
    # Проверяем кэш в БД
    cached = get_cached_company(db, inn)
    if cached:
        logger.info("Компания с ИНН %s найдена в кэше БД", inn)
        return _company_to_dict(cached)

    # Ищем на orginfo.uz
    logger.info("Поиск компании с ИНН %s на orginfo.uz", inn)
    search_results = await search_company_orginfo(inn)
    if not search_results:
        logger.warning("Компания с ИНН %s не найдена на orginfo.uz", inn)
        return None

    # Берём первый результат и загружаем детали
    first_result = search_results[0]
    org_url = first_result.get("url", "")
    if not org_url:
        return None

    details = await fetch_company_details(org_url)
    if not details.get("name"):
        # Используем данные из поисковой выдачи, если детальная страница не распарсилась
        details["name"] = first_result.get("name", "")

    # Устанавливаем ИНН из запроса, если не удалось извлечь со страницы
    if not details.get("inn"):
        details["inn"] = inn

    # Сохраняем в БД
    company = _save_company_to_db(db, details)
    return _company_to_dict(company)


async def force_lookup_by_inn(db: Session, inn: str) -> dict | None:
    """
    Принудительный поиск компании по ИНН на orginfo.uz (минуя кэш БД).

    Всегда обращается к orginfo.uz, обновляет запись в БД.

    Args:
        db: Сессия SQLAlchemy.
        inn: ИНН компании.

    Returns:
        Словарь с данными компании или None.
    """
    inn = inn.strip()

    search_results = await search_company_orginfo(inn)
    if not search_results:
        logger.warning("Компания с ИНН %s не найдена на orginfo.uz (force)", inn)
        return None

    first_result = search_results[0]
    org_url = first_result.get("url", "")
    if not org_url:
        return None

    details = await fetch_company_details(org_url)
    if not details.get("inn"):
        details["inn"] = inn
    if not details.get("name"):
        details["name"] = first_result.get("name", "")

    company = _save_company_to_db(db, details)
    return _company_to_dict(company)


def get_cached_company(db: Session, inn: str) -> CompanyProfile | None:
    """
    Получение компании из кэша БД по ИНН.

    Args:
        db: Сессия SQLAlchemy.
        inn: ИНН компании.

    Returns:
        Объект CompanyProfile или None.
    """
    return db.query(CompanyProfile).filter(CompanyProfile.inn == inn).first()


# ─── Вспомогательные функции парсинга ───────────────────────────────────────


def _extract_inn_from_element(element) -> str:
    """Извлекает ИНН из текста HTML-элемента."""
    if element is None:
        return ""
    text = element.get_text(" ", strip=True)
    # ИНН — последовательность из 9 цифр
    match = re.search(r"\b(\d{9})\b", text)
    return match.group(1) if match else ""


def _extract_status_from_element(element) -> str:
    """Извлекает статус организации из HTML-элемента."""
    if element is None:
        return ""
    text = element.get_text(" ", strip=True).lower()
    if "действующ" in text:
        return "Действующее"
    if "ликвидир" in text:
        return "Ликвидировано"
    if "реорганиз" in text:
        return "Реорганизовано"
    return ""


# Маппинг ключей со страницы orginfo.uz на поля нашей модели
_FIELD_MAP = {
    "инн": "inn",
    "ИНН": "inn",
    "директор": "director",
    "руководитель": "director",
    "адрес": "address",
    "юридический адрес": "address",
    "окэд": "oked",
    "ОКЭД": "oked",
    "основной вид деятельности": "oked",
    "уставный фонд": "charter_fund",
    "уставной фонд": "charter_fund",
    "статус": "status",
    "состояние": "status",
    "телефон": "phone",
    "тел": "phone",
    "email": "email",
    "электронная почта": "email",
    "опф": "opf",
    "сооту": "sootu",
}


def _map_field(label: str) -> str | None:
    """Определяет поле модели по тексту метки со страницы."""
    label_lower = label.lower().strip().rstrip(":")
    for key, field in _FIELD_MAP.items():
        if key.lower() in label_lower:
            return field
    return None


def _parse_tables(soup: BeautifulSoup, details: dict) -> None:
    """Парсит HTML-таблицы на странице организации."""
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True)
                value = cells[1].get_text(strip=True)
                field = _map_field(label)
                if field and field in details and not details[field]:
                    details[field] = value


def _parse_definition_lists(soup: BeautifulSoup, details: dict) -> None:
    """Парсит списки определений (dl/dt/dd) на странице."""
    for dl in soup.find_all("dl"):
        terms = dl.find_all("dt")
        definitions = dl.find_all("dd")
        for dt, dd in zip(terms, definitions):
            label = dt.get_text(strip=True)
            value = dd.get_text(strip=True)
            field = _map_field(label)
            if field and field in details and not details[field]:
                details[field] = value


def _parse_card_blocks(soup: BeautifulSoup, details: dict) -> None:
    """Парсит div-карточки с парами «метка: значение»."""
    # Ищем элементы с классами, характерными для карточек
    for block in soup.find_all(["div", "section"], class_=re.compile(
        r"(card|info|detail|field|item|param|prop)", re.I
    )):
        text = block.get_text(" ", strip=True)
        # Пробуем найти пары «Ключ: Значение» или «Ключ\nЗначение»
        for pattern in [r"([А-Яа-яA-Za-z\s]+?):\s*(.+)", r"([А-Яа-яA-Za-z\s]+?)\n\s*(.+)"]:
            for match in re.finditer(pattern, text):
                label = match.group(1).strip()
                value = match.group(2).strip()
                field = _map_field(label)
                if field and field in details and not details[field]:
                    details[field] = value


def _extract_contacts(soup: BeautifulSoup, details: dict) -> None:
    """Извлекает контактные данные (телефон, email) со страницы."""
    page_text = soup.get_text(" ", strip=True)

    # Телефон: формат +998XXXXXXXXX или аналогичный
    if not details.get("phone"):
        phone_match = re.search(
            r"(\+?\d{3}[\s\-]?\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})", page_text
        )
        if phone_match:
            details["phone"] = phone_match.group(1).strip()

    # Email
    if not details.get("email"):
        email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", page_text)
        if email_match:
            details["email"] = email_match.group(0)


def _save_company_to_db(db: Session, details: dict) -> CompanyProfile:
    """
    Сохраняет или обновляет данные компании в БД.

    Args:
        db: Сессия SQLAlchemy.
        details: Словарь с данными компании.

    Returns:
        Сохранённый объект CompanyProfile.
    """
    inn = details.get("inn", "")
    existing = db.query(CompanyProfile).filter(CompanyProfile.inn == inn).first()

    now = datetime.now(timezone.utc)

    if existing:
        # Обновляем существующую запись
        existing.name = details.get("name", existing.name)
        existing.director = details.get("director", existing.director)
        existing.address = details.get("address", existing.address)
        existing.oked = details.get("oked", existing.oked)
        existing.charter_fund = details.get("charter_fund", existing.charter_fund)
        existing.status = details.get("status", existing.status)
        existing.phone = details.get("phone", existing.phone)
        existing.email = details.get("email", existing.email)
        existing.source = "orginfo.uz"
        existing.raw_data = details
        existing.updated_at = now
        db.commit()
        db.refresh(existing)
        return existing

    # Создаём новую запись
    company = CompanyProfile(
        inn=inn,
        name=details.get("name", ""),
        director=details.get("director", ""),
        address=details.get("address", ""),
        oked=details.get("oked", ""),
        charter_fund=details.get("charter_fund", ""),
        status=details.get("status", ""),
        phone=details.get("phone", ""),
        email=details.get("email", ""),
        source="orginfo.uz",
        raw_data=details,
        created_at=now,
        updated_at=now,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def _company_to_dict(company: CompanyProfile) -> dict:
    """Преобразует объект CompanyProfile в словарь для ответа API."""
    return {
        "id": company.id,
        "inn": company.inn,
        "name": company.name,
        "director": company.director,
        "address": company.address,
        "oked": company.oked,
        "charter_fund": company.charter_fund,
        "status": company.status,
        "phone": company.phone,
        "email": company.email,
        "source": company.source,
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "updated_at": company.updated_at.isoformat() if company.updated_at else None,
    }
