# Сервис поиска и получения данных о компаниях Узбекистана.
# Кэширование результатов в БД (CompanyProfile).
# Источник: orginfo.uz

import json as _json
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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
}


def _parse_raw_name(raw: str) -> tuple[str, str | None, str | None]:
    """
    Парсит сырой текст ссылки с orginfo.uz вида:
      302172046Ликвидирована10.01.2012"BENETRA ALLIANCE" xususiy korxonasi...
    Возвращает (clean_name, registration_date, status).
    Формат: ИНН? + Статус? + Дата? + "Название"
    """
    s = raw or ''
    extracted_date: str | None = None
    extracted_status: str | None = None

    # 1. Убираем ИНН в начале (9-12 цифр)
    s = re.sub(r'^\d{9,12}', '', s)

    # 2. Извлекаем и убираем статус
    status_match = re.match(r'^(Ликвидирован[аоы]?|Действующее|Действует|Реорганизовано)', s, re.I)
    if status_match:
        extracted_status = status_match.group(1)
        s = s[status_match.end():]

    # 3. Извлекаем и убираем дату DD.MM.YYYY — это дата РЕГИСТРАЦИИ (основания)
    date_match = re.match(r'^(\d{2}\.\d{2}\.\d{4})', s)
    if date_match:
        extracted_date = date_match.group(1)  # например "10.01.2012"
        s = s[date_match.end():]

    # 4. Убираем обрамляющие кавычки и пробелы
    clean_name = s.strip().strip('"').strip("'").strip()

    return clean_name, extracted_date, extracted_status


def _clean_company_name(raw: str) -> str:
    """Быстрая очистка имени (без извлечения даты)."""
    name, _, _ = _parse_raw_name(raw)
    return name


def _date_to_year(date_str: str | None) -> int | None:
    """Извлекает год из строки вида DD.MM.YYYY или YYYY-MM-DD."""
    if not date_str:
        return None
    m = re.search(r'(\d{4})', date_str)
    return int(m.group(1)) if m else None


async def search_company_orginfo(query: str) -> list[dict]:
    """Поиск компании на orginfo.uz по ИНН или наименованию."""
    results = []
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
            response = await client.get(SEARCH_URL, params={"q": query})
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")
        org_links = soup.find_all("a", href=re.compile(r"/ru/organization/[\w-]+/?"))

        seen_urls = set()
        for link in org_links:
            href = link.get("href", "")
            if href in seen_urls:
                continue
            seen_urls.add(href)

            raw_name = link.get_text(strip=True)
            if not raw_name:
                continue

            # Парсим сырое имя: извлекаем чистое название, дату регистрации и статус
            clean_name, reg_date, status_from_name = _parse_raw_name(raw_name)
            if not clean_name:
                continue

            org_url = f"{BASE_URL}{href}" if href.startswith("/") else href

            parent = link.find_parent(["div", "li", "tr", "article"])
            inn = _extract_inn_from_element(parent) if parent else ""
            # Статус: сначала из имени, потом из контекста родителя
            status = status_from_name or (_extract_status_from_element(parent) if parent else "")

            result_item = {
                "inn": inn,
                "name": clean_name,
                "url": org_url,
                "status": status,
            }
            # Сохраняем дату регистрации и год основания если извлекли из имени
            if reg_date:
                result_item["registration_date"] = reg_date
                year = _date_to_year(reg_date)
                if year:
                    result_item["founded_year"] = year

            results.append(result_item)

    except httpx.HTTPStatusError as e:
        logger.error("Ошибка HTTP при поиске на orginfo.uz: %s", e)
    except httpx.RequestError as e:
        logger.error("Ошибка подключения к orginfo.uz: %s", e)
    except Exception as e:
        logger.error("Непредвиденная ошибка при поиске компании: %s", e)

    return results


async def fetch_company_details(org_url: str) -> dict:
    """Получение детальной информации о компании со страницы orginfo.uz."""
    details: dict = {
        "inn": "", "name": "", "director": "", "address": "",
        "oked": "", "charter_fund": "", "status": "",
        "phone": "", "email": "",
        "registration_date": "", "founded_year": None,
    }
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
            response = await client.get(org_url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")

        title_tag = soup.find("h1") or soup.find("title")
        if title_tag:
            raw_title = title_tag.get_text(strip=True)
            raw_name = re.sub(r"\s*[-–|].*orginfo.*$", "", raw_title).strip()
            details["name"] = _clean_company_name(raw_name)

        _parse_tables(soup, details)
        _parse_definition_lists(soup, details)
        _parse_card_blocks(soup, details)
        _extract_contacts(soup, details)

        # Извлекаем год из даты регистрации
        if details.get("registration_date") and not details.get("founded_year"):
            details["founded_year"] = _date_to_year(details["registration_date"])

    except httpx.HTTPStatusError as e:
        logger.error("Ошибка HTTP при загрузке страницы организации: %s", e)
    except httpx.RequestError as e:
        logger.error("Ошибка подключения при загрузке организации: %s", e)
    except Exception as e:
        logger.error("Ошибка парсинга страницы организации: %s", e)

    return details


async def lookup_by_inn(db: Session, inn: str) -> dict | None:
    """Поиск компании по ИНН: сначала в кэше БД, затем на orginfo.uz."""
    cached = get_cached_company(db, inn)
    if cached:
        return _company_to_dict(cached)

    search_results = await search_company_orginfo(inn)
    if not search_results:
        return None

    company_url = search_results[0].get("url", "")
    if not company_url:
        return None

    details = await fetch_company_details(company_url)
    if not details.get("name"):
        return None

    # Если fetch_company_details не нашёл дату — берём из search результата
    if not details.get("registration_date") and search_results[0].get("registration_date"):
        details["registration_date"] = search_results[0]["registration_date"]
    if not details.get("founded_year") and search_results[0].get("founded_year"):
        details["founded_year"] = search_results[0]["founded_year"]

    if not details.get("inn"):
        details["inn"] = inn
    details["source"] = "orginfo.uz"

    try:
        company = _save_company_to_db(db, details)
        return _company_to_dict(company)
    except Exception as e:
        logger.error("Ошибка сохранения компании в БД: %s", e)
        return details


async def force_lookup_by_inn(db: Session, inn: str) -> dict | None:
    """Принудительное обновление данных из orginfo.uz (игнорирует кэш)."""
    search_results = await search_company_orginfo(inn)
    if not search_results:
        return None

    company_url = search_results[0].get("url", "")
    if not company_url:
        return None

    details = await fetch_company_details(company_url)
    if not details.get("name"):
        return None

    if not details.get("registration_date") and search_results[0].get("registration_date"):
        details["registration_date"] = search_results[0]["registration_date"]
    if not details.get("founded_year") and search_results[0].get("founded_year"):
        details["founded_year"] = search_results[0]["founded_year"]

    if not details.get("inn"):
        details["inn"] = inn
    details["source"] = "orginfo.uz"

    try:
        company = _save_company_to_db(db, details)
        return _company_to_dict(company)
    except Exception as e:
        logger.error("Ошибка force lookup в БД: %s", e)
        return details


def get_cached_company(db: Session, inn: str) -> CompanyProfile | None:
    return db.query(CompanyProfile).filter(CompanyProfile.inn == inn).first()


def _extract_inn_from_element(element) -> str:
    if element is None:
        return ""
    text = element.get_text(" ", strip=True)
    match = re.search(r"\b(\d{9,12})\b", text)
    return match.group(1) if match else ""


def _extract_status_from_element(element) -> str:
    if element is None:
        return ""
    text = element.get_text(" ", strip=True).lower()
    if "действ" in text or "active" in text:
        return "Действующее"
    if "ликвид" in text:
        return "Ликвидировано"
    if "реорг" in text:
        return "Реорганизовано"
    return ""


# Маппинг ключей со страницы orginfo.uz на поля модели
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
    "дата регистрации": "registration_date",
    "зарегистрирован": "registration_date",
    "дата государственной регистрации": "registration_date",
    "дата ликвидации": "liquidation_date",
    "телефон": "phone",
    "тел": "phone",
    "email": "email",
    "электронная почта": "email",
    "опф": "opf",
    "сооту": "sootu",
}


def _map_field(label: str) -> str | None:
    label_lower = label.lower().strip().rstrip(":")
    for key, field in _FIELD_MAP.items():
        if key.lower() in label_lower:
            return field
    return None


def _parse_tables(soup: BeautifulSoup, details: dict) -> None:
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
    for block in soup.find_all(["div", "section"], class_=re.compile(
        r"(card|info|detail|field|item|param|prop)", re.I
    )):
        text = block.get_text(" ", strip=True)
        for pattern in [r"([\u0410-\u044fA-Za-z\s]+?):\s*(.+)", r"([\u0410-\u044fA-Za-z\s]+?)\n\s*(.+)"]:
            for match in re.finditer(pattern, text):
                label = match.group(1).strip()
                value = match.group(2).strip()
                field = _map_field(label)
                if field and field in details and not details[field]:
                    details[field] = value


def _extract_contacts(soup: BeautifulSoup, details: dict) -> None:
    page_text = soup.get_text(" ", strip=True)
    phone_match = re.search(r"(\+998[\s\-]?\(?\d{2}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})", page_text)
    if phone_match and not details["phone"]:
        details["phone"] = phone_match.group(1)
    email_match = re.search(r"([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})", page_text)
    if email_match and not details["email"]:
        details["email"] = email_match.group(1)


def _save_company_to_db(db: Session, details: dict) -> CompanyProfile:
    inn = details.get("inn", "")
    existing = db.query(CompanyProfile).filter(CompanyProfile.inn == inn).first()
    now = datetime.now(timezone.utc)
    raw_json = _json.dumps(details, ensure_ascii=False) if isinstance(details, dict) else details

    if existing:
        existing.name = details.get("name", existing.name)
        existing.director = details.get("director", existing.director)
        existing.address = details.get("address", existing.address)
        existing.oked = details.get("oked", existing.oked)
        existing.charter_fund = details.get("charter_fund", existing.charter_fund)
        existing.status = details.get("status", existing.status)
        existing.phone = details.get("phone", existing.phone)
        existing.email = details.get("email", existing.email)
        existing.source = "orginfo.uz"
        existing.raw_data = raw_json
        existing.updated_at = now
        db.commit()
        db.refresh(existing)
        return existing

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
        raw_data=raw_json,
        created_at=now,
        updated_at=now,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


async def search_by_founder(db: Session, founder_name: str) -> list[dict]:
    """Поиск по имени директора/учредителя."""
    try:
        cached = db.query(CompanyProfile).filter(
            CompanyProfile.director.ilike(f"%{founder_name}%")
        ).limit(20).all()
        if cached:
            return [_company_to_dict(c) for c in cached]
    except Exception:
        pass
    return []


async def advanced_dd_search(
    db: Session,
    query: str,
    filters: dict | None = None,
) -> list[dict]:
    """Расширенный DD-поиск с фильтрами."""
    results = await search_company_orginfo(query)

    if filters:
        status_filter = (filters.get("status") or "").lower()
        if status_filter:
            results = [r for r in results if status_filter in (r.get("status") or "").lower()]

    enriched = []
    for r in results[:10]:
        inn = r.get("inn", "")
        cached = get_cached_company(db, inn) if inn else None
        if cached:
            company_dict = _company_to_dict(cached)
        else:
            company_dict = dict(r)
        enriched.append({**company_dict, "dd_relevance": "high", "risk_flags": []})

    return enriched


def _company_to_dict(company: CompanyProfile) -> dict:
    """Преобразует объект CompanyProfile в словарь для ответа API."""
    founded_year = None
    if company.raw_data:
        try:
            raw = _json.loads(company.raw_data) if isinstance(company.raw_data, str) else company.raw_data
            founded_year = raw.get("founded_year")
            if not founded_year:
                reg_date = raw.get("registration_date", "")
                if reg_date:
                    founded_year = _date_to_year(str(reg_date))
        except Exception:
            pass
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
        "founded_year": founded_year,
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "updated_at": company.updated_at.isoformat() if company.updated_at else None,
    }
