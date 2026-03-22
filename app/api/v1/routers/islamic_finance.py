"""
Islamic Finance API Router (refactored).
Thin layer - delegates to islamic_finance_service.py.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.islamic_finance import (
    IslamicP2PProject, SSBFatwa, SSBMember,
)
from app.schemas.islamic_finance import (
    ScreeningRequest, ScreeningResponse, StandardResult, RatioDetail,
    ZakatRequest, ZakatResponse,
    PurificationRequest, PurificationResponse,
    ProductRequest, ProductResponse,
    PoSCRequest, PoSCResponse,
    SSBFatwaRequest, SSBFatwaResponse, SSBMemberResponse,
    GlossaryResponse, HaramIndustryResponse,
    P2PProjectRequest, P2PProjectResponse,
)
from app.services.islamic_finance_service import (
    ScreeningService, ZakatService, PurificationService,
    ProductService, PoSCService, GlossaryService, HaramIndustryService,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/islamic-finance", tags=["islamic-finance"])


# --- Screening ---
@router.post("/screening", response_model=ScreeningResponse, status_code=status.HTTP_201_CREATED)
def run_screening(data: ScreeningRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row, results, overall, ok = ScreeningService.run_screening(
        db=db, user_id=current_user.id, company_name=data.company_name,
        ticker=data.ticker, standard=data.standard,
        total_assets=data.total_assets, total_debt=data.total_debt,
        total_revenue=data.total_revenue, haram_revenue=data.haram_revenue,
        market_cap=data.market_cap,
        interest_bearing_securities=data.interest_bearing_securities,
        cash_and_interest=data.cash_and_interest, receivables=data.receivables,
    )
    return ScreeningResponse(
        id=row.id, company_name=row.company_name, ticker=row.ticker,
        standards=[StandardResult(**r) for r in results],
        overall_score=overall, is_compliant=ok, screened_at=row.screened_at,
    )

@router.get("/screening", response_model=List[ScreeningResponse])
def list_screenings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = ScreeningService.list_screenings(db, current_user.id)
    out = []
    for r in rows:
        stds = [StandardResult(**s) for s in (r.result_json or [])]
        out.append(ScreeningResponse(
            id=r.id, company_name=r.company_name, ticker=r.ticker,
            standards=stds, overall_score=r.overall_score or 0,
            is_compliant=r.is_compliant or False, screened_at=r.screened_at,
        ))
    return out


# --- Zakat ---
@router.post("/zakat", response_model=ZakatResponse, status_code=status.HTTP_201_CREATED)
def calc_zakat(data: ZakatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = ZakatService.calculate(
        db=db, user_id=current_user.id, mode=data.mode, madhab=data.madhab,
        assets=data.assets, liabilities=data.liabilities,
        nisab_type=data.nisab_type, currency=data.currency,
        hawl_start=data.hawl_start, hawl_end=data.hawl_end,
    )
    return ZakatResponse(
        id=row.id, mode=row.mode, madhab=row.madhab,
        nisab_type=row.nisab_type, nisab_value=row.nisab_value,
        zakatable_amount=row.zakatable_amount, zakat_amount=row.zakat_amount,
        currency=row.currency, hawl_start=row.hawl_start,
        hawl_end=row.hawl_end, created_at=row.created_at,
    )

@router.get("/zakat", response_model=List[ZakatResponse])
def list_zakat(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = ZakatService.list_calculations(db, current_user.id)
    return [ZakatResponse(
        id=r.id, mode=r.mode, madhab=r.madhab,
        nisab_type=r.nisab_type, nisab_value=r.nisab_value,
        zakatable_amount=r.zakatable_amount, zakat_amount=r.zakat_amount,
        currency=r.currency, hawl_start=r.hawl_start,
        hawl_end=r.hawl_end, created_at=r.created_at,
    ) for r in rows]


# --- Purification ---
@router.post("/purification", response_model=PurificationResponse, status_code=status.HTTP_201_CREATED)
def calc_purification(data: PurificationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = PurificationService.calculate(
        db=db, user_id=current_user.id, portfolio_id=data.portfolio_id,
        position_name=data.position_name, haram_pct=data.haram_pct,
        dividend_amount=data.dividend_amount, method=data.method, notes=data.notes,
    )
    return PurificationResponse(
        id=row.id, portfolio_id=row.portfolio_id,
        position_name=row.position_name, haram_pct=row.haram_pct,
        dividend_amount=row.dividend_amount,
        purification_amount=row.purification_amount,
        method=row.method, notes=row.notes, created_at=row.created_at,
    )

@router.get("/purification", response_model=List[PurificationResponse])
def list_purification(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return PurificationService.list_records(db, current_user.id)


# --- Products (Contracts) ---
@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = ProductService.create(
        db=db, user_id=current_user.id,
        product_type=data.product_type, title=data.title, params=data.params,
    )
    return ProductResponse(
        id=row.id, product_type=row.product_type, title=row.title,
        result=row.result_json, schedule=row.schedule_json, status=row.status,
    )

@router.get("/products", response_model=List[ProductResponse])
def list_products(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = ProductService.list_products(db, current_user.id)
    return [ProductResponse(
        id=r.id, product_type=r.product_type, title=r.title,
        result=r.result_json or {}, schedule=r.schedule_json, status=r.status,
    ) for r in rows]


# --- PoSC ---
@router.post("/posc", response_model=PoSCResponse, status_code=status.HTTP_201_CREATED)
def create_posc(data: PoSCRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = PoSCService.create_report(
        db=db, user_id=current_user.id,
        target_name=data.target_name, target_type=data.target_type,
        document_hash=data.document_hash,
    )
    return PoSCResponse(
        id=row.id, target_name=row.target_name, score=row.score,
        category_scores=row.category_scores_json, findings=row.findings_json,
        hash_chain=row.hash_chain, qr_code_url=row.qr_code_url, status=row.status,
    )

@router.get("/posc", response_model=List[PoSCResponse])
def list_posc(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = PoSCService.list_reports(db, current_user.id)
    return [PoSCResponse(
        id=r.id, target_name=r.target_name, score=r.score or 0,
        category_scores=r.category_scores_json or {},
        findings=r.findings_json or [], hash_chain=r.hash_chain,
        qr_code_url=r.qr_code_url, status=r.status or "draft",
    ) for r in rows]


# --- SSB ---
@router.post("/ssb/fatwas", response_model=SSBFatwaResponse, status_code=status.HTTP_201_CREATED)
def create_fatwa(data: SSBFatwaRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = SSBFatwa(
        subject=data.subject, product_type=data.product_type,
        decision=data.decision, reasoning=data.reasoning,
        aaoifi_refs=data.aaoifi_refs, status="published",
    )
    db.add(row); db.commit(); db.refresh(row)
    return SSBFatwaResponse(
        id=row.id, subject=row.subject, product_type=row.product_type,
        decision=row.decision, aaoifi_refs=row.aaoifi_refs,
        status=row.status, issued_at=row.issued_at,
    )

@router.get("/ssb/fatwas", response_model=List[SSBFatwaResponse])
def list_fatwas(db: Session = Depends(get_db)):
    rows = db.query(SSBFatwa).order_by(SSBFatwa.id.desc()).all()
    return [SSBFatwaResponse(
        id=r.id, subject=r.subject, product_type=r.product_type,
        decision=r.decision, aaoifi_refs=r.aaoifi_refs,
        status=r.status, issued_at=r.issued_at,
    ) for r in rows]

@router.get("/ssb/members", response_model=List[SSBMemberResponse])
def list_ssb_members(db: Session = Depends(get_db)):
    return db.query(SSBMember).filter(SSBMember.is_active == True).all()


# --- Glossary ---
@router.get("/glossary", response_model=List[GlossaryResponse])
def list_glossary(q: Optional[str] = Query(None, description="Search"), db: Session = Depends(get_db)):
    return GlossaryService.search(db, q)


# --- Haram Industries ---
@router.get("/haram-industries", response_model=List[HaramIndustryResponse])
def list_haram_industries(category: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return HaramIndustryService.list_industries(db, category)


# --- P2P ---
@router.post("/p2p", response_model=P2PProjectResponse, status_code=status.HTTP_201_CREATED)
def create_p2p(data: P2PProjectRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = IslamicP2PProject(
        user_id=current_user.id, title=data.title, description=data.description,
        target_amount=data.target_amount, product_type=data.product_type,
        profit_sharing_ratio=data.profit_sharing_ratio,
        duration_months=data.duration_months, risk_level=data.risk_level,
    )
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.get("/p2p", response_model=List[P2PProjectResponse])
def list_p2p(status_filter: Optional[str] = Query(None, alias="status"), db: Session = Depends(get_db)):
    query = db.query(IslamicP2PProject)
    if status_filter:
        query = query.filter(IslamicP2PProject.status == status_filter)
    return query.order_by(IslamicP2PProject.id.desc()).all()


# --- Zakat Nisab ---
@router.get("/zakat/nisab")
def get_nisab(currency: str = Query("UZS")):
    return {"success": True, "data": ZakatService.get_nisab_info(currency)}


# --- Financial Thresholds ---
@router.get("/financial-thresholds")
def get_financial_thresholds():
    return {
        "success": True,
        "data": [
            {"name_ru": "Коэффициент долга", "max_percentage": "30%", "standard": "AAOIFI"},
            {"name_ru": "Процентные доходы", "max_percentage": "30%", "standard": "AAOIFI"},
            {"name_ru": "Харам-доход", "max_percentage": "5%", "standard": "AAOIFI"},
            {"name_ru": "Дебиторская задолженность", "max_percentage": "49%", "standard": "AAOIFI"},
            {"name_ru": "Коэффициент долга", "max_percentage": "33%", "standard": "DJIM"},
            {"name_ru": "Процентные доходы", "max_percentage": "33%", "standard": "DJIM"},
        ],
    }


# --- Shariah Indices ---
@router.get("/shariah-indices")
def get_shariah_indices():
    return {
        "success": True,
        "data": [
            {"name": "DJIM", "provider": "Dow Jones", "description": "Dow Jones Islamic Market Index"},
            {"name": "S&P Shariah", "provider": "S&P Global", "description": "S&P 500 Shariah Index"},
            {"name": "FTSE Shariah", "provider": "FTSE Russell", "description": "FTSE Shariah Global Equity Index"},
            {"name": "MSCI Islamic", "provider": "MSCI", "description": "MSCI World Islamic Index"},
        ],
    }
