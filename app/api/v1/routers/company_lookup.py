"""
Роутер поиска и получения данных о компаниях Узбекистана.

Эндпоинты:
- GET  /companies/search?q={inn_or_name} — поиск компаний на orginfo.uz
- GET  /companies/{inn} — получение данных по ИНН (кэш БД или orginfo.uz)
- POST /companies/lookup — принудительное обновление данных из orginfo.uz
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_db
from app.services.company_lookup_service import (
    advanced_dd_search,
    force_lookup_by_inn,
    lookup_by_inn,
    search_by_founder,
    search_company_orginfo,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/companies", tags=["Поиск компаний"])


# ─── Схемы запросов/ответов ─────────────────────────────────────────────────


class LookupRequest(BaseModel):
    """Тело запроса для принудительного поиска по ИНН."""
    inn: str


class CompanySearchResult(BaseModel):
    """Результат поиска компании."""
    inn: str
    name: str
    url: str
    status: str


class CompanyDetail(BaseModel):
    """Детальная информация о компании."""
    id: int | None = None
    inn: str
    name: str
    director: str = ""
    address: str = ""
    oked: str = ""
    charter_fund: str = ""
    status: str = ""
    phone: str = ""
    email: str = ""
    source: str = ""
    created_at: str | None = None
    updated_at: str | None = None


# ─── Эндпоинты ──────────────────────────────────────────────────────────────


@router.get(
    "/search",
    response_model=list[CompanySearchResult],
    summary="Поиск компаний по ИНН или наименованию",
)
async def search_companies(
    q: str = Query(..., min_length=2, description="ИНН или наименование компании"),
    _current_user=Depends(get_current_user),
):
    """
    Поиск компаний на orginfo.uz по ИНН или наименованию.

    Выполняет парсинг HTML-страницы результатов поиска и возвращает
    список найденных организаций с ИНН, названием, ссылкой и статусом.
    """
    try:
        results = await search_company_orginfo(q)
        return results
    except Exception as e:
        logger.error("Ошибка поиска компаний по запросу '%s': %s", q, e)
        raise HTTPException(
            status_code=502,
            detail="Не удалось выполнить поиск на orginfo.uz",
        )


@router.get(
    "/{inn}",
    response_model=CompanyDetail,
    summary="Получение данных компании по ИНН",
)
async def get_company_by_inn(
    inn: str,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Получение информации о компании по ИНН.

    Сначала проверяет кэш в БД. Если компания не найдена в кэше,
    выполняет поиск на orginfo.uz и сохраняет результат в БД.
    """
    try:
        result = await lookup_by_inn(db, inn)
    except Exception as e:
        logger.error("Ошибка получения компании по ИНН %s: %s", inn, e)
        raise HTTPException(
            status_code=502,
            detail="Ошибка при получении данных компании",
        )

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Компания с ИНН {inn} не найдена",
        )

    return result


@router.post(
    "/lookup",
    response_model=CompanyDetail,
    summary="Принудительное обновление данных компании из orginfo.uz",
)
async def force_lookup_company(
    body: LookupRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Принудительный поиск и обновление данных компании из orginfo.uz.

    Игнорирует кэш БД и выполняет свежий запрос к orginfo.uz.
    Найденные данные сохраняются/обновляются в БД.
    """
    inn = body.inn.strip()
    if not inn:
        raise HTTPException(status_code=400, detail="ИНН не может быть пустым")

    try:
        result = await force_lookup_by_inn(db, inn)
    except Exception as e:
        logger.error("Ошибка принудительного поиска по ИНН %s: %s", inn, e)
        raise HTTPException(
            status_code=502,
            detail="Ошибка при получении данных с orginfo.uz",
        )

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Компания с ИНН {inn} не найдена на orginfo.uz",
        )

    return result


# ─── DD Extended Search (Phase 3, DD-001) ──────────────────────────────────


class DDSearchRequest(BaseModel):
    """Тело запроса для расширенного DD-поиска."""
    query: str
    filters: dict | None = None  # {oked, region, status}


@router.post(
    "/dd-search",
    summary="Расширенный DD-поиск компаний",
)
async def dd_search(
    body: DDSearchRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Расширенный поиск для Due Diligence с фильтрами.

    Поиск по ОКЭД, региону, статусу. Добавляет DD-релевантность
    и risk flags к каждому результату.
    """
    query = body.query.strip()
    if len(query) < 2:
        raise HTTPException(status_code=400, detail="Запрос должен содержать минимум 2 символа")

    try:
        results = await advanced_dd_search(db, query, body.filters)
    except Exception as e:
        logger.error("Ошибка DD-поиска '%s': %s", query, e)
        raise HTTPException(
            status_code=502,
            detail="Ошибка при выполнении DD-поиска",
        )

    return {"query": query, "filters": body.filters, "total": len(results), "results": results}


@router.get(
    "/by-founder",
    summary="Поиск компаний по директору/основателю",
)
async def find_by_founder(
    name: str = Query(..., min_length=2, description="Имя директора/основателя"),
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    Поиск всех компаний, где указанное лицо является директором.
    """
    try:
        results = await search_by_founder(db, name)
    except Exception as e:
        logger.error("Ошибка поиска по основателю '%s': %s", name, e)
        raise HTTPException(
            status_code=502,
            detail="Ошибка при поиске по основателю",
        )

    return {"founder": name, "total": len(results), "companies": results}
