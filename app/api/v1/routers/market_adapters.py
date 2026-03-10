"""
Роутер: Адаптеры внешних систем — рыночные данные, ETL, CRM, DMS, Comparable.
Фаза 4, Сессия 3 — EXCH-ADAPT-001.

Эндпоинты:
  # Источники рыночных данных (EXCH-ADAPT-001.1)
  POST   /adapters/sources             — создать источник
  GET    /adapters/sources             — список источников
  PUT    /adapters/sources/{id}        — обновить
  DELETE /adapters/sources/{id}        — удалить

  # Котировки и макро (EXCH-ADAPT-001.1)
  GET    /adapters/market/quote/{sym}  — котировка
  GET    /adapters/market/macro/{ind}  — макроиндикатор
  GET    /adapters/market/cache/{id}   — записи кэша

  # ETL Pipeline (EXCH-ADAPT-001.2)
  POST   /adapters/etl/run/{id}        — запуск ETL
  POST   /adapters/etl/run-all         — запуск для всех
  GET    /adapters/etl/status          — статус ETL
  POST   /adapters/etl/cleanup         — очистка кэша

  # CRM Contacts (EXCH-ADAPT-001.3)
  POST   /adapters/crm/contacts        — создать контакт
  GET    /adapters/crm/contacts        — список
  PUT    /adapters/crm/contacts/{id}   — обновить
  DELETE /adapters/crm/contacts/{id}   — удалить

  # CRM Deals (EXCH-ADAPT-001.3)
  POST   /adapters/crm/deals           — создать сделку
  GET    /adapters/crm/deals           — список
  PUT    /adapters/crm/deals/{id}      — обновить
  DELETE /adapters/crm/deals/{id}      — удалить
  GET    /adapters/crm/pipeline        — сводка pipeline

  # DMS (EXCH-ADAPT-001.4)
  POST   /adapters/dms/documents       — создать документ
  GET    /adapters/dms/documents       — список
  PUT    /adapters/dms/documents/{id}  — обновить
  DELETE /adapters/dms/documents/{id}  — удалить
  POST   /adapters/dms/documents/{id}/versions — добавить версию
  GET    /adapters/dms/documents/{id}/versions — список версий
  POST   /adapters/dms/search          — поиск
  GET    /adapters/dms/stats           — статистика

  # Comparable (EXCH-ADAPT-001.5)
  POST   /adapters/comparable          — добавить компанию
  GET    /adapters/comparable          — список
  PUT    /adapters/comparable/{id}     — обновить
  DELETE /adapters/comparable/{id}     — удалить
  GET    /adapters/comparable/analysis — анализ мультипликаторов
  GET    /adapters/comparable/sectors  — список секторов
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.api.v1.routers.auth import get_current_user
from app.db.models.user import User

from app.schemas.market_adapters import (
    MarketDataSourceCreate, MarketDataSourceResponse, MarketDataSourceUpdate,
    MarketQuoteResponse, MacroIndicatorResponse, MarketDataCacheResponse,
    EtlJobRequest, EtlJobResponse,
    CrmContactCreate, CrmContactResponse, CrmContactUpdate,
    CrmDealCreate, CrmDealResponse, CrmDealUpdate,
    DocumentCreate, DocumentResponse, DocumentUpdate,
    DocumentVersionCreate, DocumentVersionResponse,
    DocumentSearchRequest,
    ComparableCompanyCreate, ComparableCompanyResponse, ComparableCompanyUpdate,
    ComparableAnalysisResponse,
)

from app.services.market_data_service import (
    create_source, list_sources, get_source,
    update_source, delete_source,
    fetch_quote, fetch_macro, list_cached_data,
    run_etl_job, run_etl_all_sources, get_etl_status, cleanup_expired_cache,
)
from app.services.crm_adapter_service import (
    create_contact, list_contacts, get_contact, update_contact, delete_contact,
    create_deal, list_deals, get_deal, update_deal, delete_deal,
    get_pipeline_summary,
)
from app.services.dms_service import (
    create_document, list_documents, get_document, update_document, delete_document,
    add_version, list_versions, search_documents, get_document_stats,
)
from app.services.comparable_service import (
    create_comparable, list_comparables, get_comparable,
    update_comparable, delete_comparable,
    get_multiples_analysis, get_sectors_list,
)

router = APIRouter(prefix="/adapters", tags=["external-adapters"])


# ═══════════════════════════════════════════════════════════════
# MARKET DATA SOURCES (EXCH-ADAPT-001.1)
# ═══════════════════════════════════════════════════════════════

@router.post("/sources", response_model=MarketDataSourceResponse)
def create_data_source(
    body: MarketDataSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_source(db, current_user.id, **body.model_dump())


@router.get("/sources", response_model=list[MarketDataSourceResponse])
def list_data_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_sources(db, current_user.id)


@router.put("/sources/{source_id}", response_model=MarketDataSourceResponse)
def update_data_source(
    source_id: int,
    body: MarketDataSourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    src = get_source(db, source_id)
    if not src:
        raise HTTPException(404, "Источник не найден")
    if src.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    return update_source(db, source_id, **body.model_dump(exclude_unset=True))


@router.delete("/sources/{source_id}")
def remove_data_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    src = get_source(db, source_id)
    if not src:
        raise HTTPException(404, "Источник не найден")
    if src.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    delete_source(db, source_id)
    return {"detail": "Источник удалён"}


# ═══════════════════════════════════════════════════════════════
# MARKET QUOTES & MACRO (EXCH-ADAPT-001.1)
# ═══════════════════════════════════════════════════════════════

@router.get("/market/quote/{symbol}")
def get_quote(
    symbol: str,
    source_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return fetch_quote(db, source_id, symbol)


@router.get("/market/macro/{indicator}")
def get_macro(
    indicator: str,
    source_id: Optional[int] = None,
    country: str = "US",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return fetch_macro(db, source_id, indicator, country)


@router.get("/market/cache/{source_id}", response_model=list[MarketDataCacheResponse])
def get_cache(
    source_id: int,
    data_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_cached_data(db, source_id, data_type, limit)


# ═══════════════════════════════════════════════════════════════
# ETL PIPELINE (EXCH-ADAPT-001.2)
# ═══════════════════════════════════════════════════════════════

@router.post("/etl/run/{source_id}")
def run_etl(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    src = get_source(db, source_id)
    if not src:
        raise HTTPException(404, "Источник не найден")
    if src.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    return run_etl_job(db, source_id)


@router.post("/etl/run-all")
def run_etl_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return run_etl_all_sources(db, current_user.id)


@router.get("/etl/status")
def etl_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_etl_status(db, current_user.id)


@router.post("/etl/cleanup")
def etl_cleanup(
    source_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = cleanup_expired_cache(db, source_id)
    return {"deleted": count}


# ═══════════════════════════════════════════════════════════════
# CRM CONTACTS (EXCH-ADAPT-001.3)
# ═══════════════════════════════════════════════════════════════

@router.post("/crm/contacts", response_model=CrmContactResponse)
def add_contact(
    body: CrmContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_contact(db, current_user.id, **body.model_dump())


@router.get("/crm/contacts", response_model=list[CrmContactResponse])
def get_contacts(
    contact_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_contacts(db, current_user.id, contact_type, search)


@router.put("/crm/contacts/{contact_id}", response_model=CrmContactResponse)
def edit_contact(
    contact_id: int,
    body: CrmContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = get_contact(db, contact_id)
    if not c:
        raise HTTPException(404, "Контакт не найден")
    if c.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    return update_contact(db, contact_id, **body.model_dump(exclude_unset=True))


@router.delete("/crm/contacts/{contact_id}")
def remove_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = get_contact(db, contact_id)
    if not c:
        raise HTTPException(404, "Контакт не найден")
    if c.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    delete_contact(db, contact_id)
    return {"detail": "Контакт удалён"}


# ═══════════════════════════════════════════════════════════════
# CRM DEALS (EXCH-ADAPT-001.3)
# ═══════════════════════════════════════════════════════════════

@router.post("/crm/deals", response_model=CrmDealResponse)
def add_deal(
    body: CrmDealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_deal(db, current_user.id, **body.model_dump())


@router.get("/crm/deals", response_model=list[CrmDealResponse])
def get_deals(
    stage: Optional[str] = None,
    contact_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_deals(db, current_user.id, stage, contact_id)


@router.put("/crm/deals/{deal_id}", response_model=CrmDealResponse)
def edit_deal(
    deal_id: int,
    body: CrmDealUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = get_deal(db, deal_id)
    if not d:
        raise HTTPException(404, "Сделка не найдена")
    if d.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    return update_deal(db, deal_id, **body.model_dump(exclude_unset=True))


@router.delete("/crm/deals/{deal_id}")
def remove_deal(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = get_deal(db, deal_id)
    if not d:
        raise HTTPException(404, "Сделка не найдена")
    if d.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    delete_deal(db, deal_id)
    return {"detail": "Сделка удалена"}


@router.get("/crm/pipeline")
def pipeline_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_pipeline_summary(db, current_user.id)


# ═══════════════════════════════════════════════════════════════
# DMS (EXCH-ADAPT-001.4)
# ═══════════════════════════════════════════════════════════════

@router.post("/dms/documents", response_model=DocumentResponse)
def add_document(
    body: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_document(db, current_user.id, **body.model_dump())


@router.get("/dms/documents", response_model=list[DocumentResponse])
def get_documents(
    category: Optional[str] = None,
    search: Optional[str] = None,
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_documents(db, current_user.id, category, search, include_archived)


@router.put("/dms/documents/{doc_id}", response_model=DocumentResponse)
def edit_document(
    doc_id: int,
    body: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = get_document(db, doc_id)
    if not d:
        raise HTTPException(404, "Документ не найден")
    if d.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    return update_document(db, doc_id, **body.model_dump(exclude_unset=True))


@router.delete("/dms/documents/{doc_id}")
def remove_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = get_document(db, doc_id)
    if not d:
        raise HTTPException(404, "Документ не найден")
    if d.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    delete_document(db, doc_id)
    return {"detail": "Документ удалён"}


@router.post("/dms/documents/{doc_id}/versions", response_model=DocumentVersionResponse)
def add_doc_version(
    doc_id: int,
    body: DocumentVersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = get_document(db, doc_id)
    if not d:
        raise HTTPException(404, "Документ не найден")
    if d.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    try:
        return add_version(db, doc_id, current_user.id, body.file_name, body.file_size, body.change_notes)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/dms/documents/{doc_id}/versions", response_model=list[DocumentVersionResponse])
def get_doc_versions(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = get_document(db, doc_id)
    if not d:
        raise HTTPException(404, "Документ не найден")
    if d.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    return list_versions(db, doc_id)


@router.post("/dms/search", response_model=list[DocumentResponse])
def dms_search(
    body: DocumentSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_documents(db, current_user.id, body.query, body.category, body.tags)


@router.get("/dms/stats")
def dms_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_document_stats(db, current_user.id)


# ═══════════════════════════════════════════════════════════════
# COMPARABLE COMPANIES (EXCH-ADAPT-001.5)
# ═══════════════════════════════════════════════════════════════

@router.post("/comparable", response_model=ComparableCompanyResponse)
def add_comparable(
    body: ComparableCompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_comparable(db, current_user.id, **body.model_dump())


@router.get("/comparable", response_model=list[ComparableCompanyResponse])
def get_comparables(
    sector: Optional[str] = None,
    industry: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_comparables(db, current_user.id, sector, industry)


@router.put("/comparable/{comp_id}", response_model=ComparableCompanyResponse)
def edit_comparable(
    comp_id: int,
    body: ComparableCompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = get_comparable(db, comp_id)
    if not c:
        raise HTTPException(404, "Компания не найдена")
    if c.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    return update_comparable(db, comp_id, **body.model_dump(exclude_unset=True))


@router.delete("/comparable/{comp_id}")
def remove_comparable(
    comp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = get_comparable(db, comp_id)
    if not c:
        raise HTTPException(404, "Компания не найдена")
    if c.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    delete_comparable(db, comp_id)
    return {"detail": "Компания удалена"}


@router.get("/comparable/analysis")
def comparable_analysis(
    sector: Optional[str] = None,
    industry: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_multiples_analysis(db, current_user.id, sector, industry)


@router.get("/comparable/sectors")
def comparable_sectors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"sectors": get_sectors_list(db, current_user.id)}
