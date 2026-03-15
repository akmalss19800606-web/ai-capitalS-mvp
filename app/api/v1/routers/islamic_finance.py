"""
Islamic Finance API Router.
Endpoints: screening, zakat, purification, products, posc, ssb, glossary, haram-industries, p2p.
"""
import hashlib
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.islamic_finance import (
    IslamicScreening, ZakatCalculation, PurificationRecord,
    IslamicContract, PoSCReport, SSBFatwa, SSBMember,
    IslamicGlossary, HaramIndustryDB, IslamicP2PProject,
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

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/islamic-finance", tags=["islamic-finance"])


# ─── Screening ───────────────────────────────────────────
def _calc_ratios(data: ScreeningRequest, std: str) -> dict:
    mc = float(data.market_cap or data.total_assets) or 1
    tr = float(data.total_revenue) or 1
    thresholds = {
        "AAOIFI": {"debt": 30, "interest": 30, "haram": 5, "recv": 49},
        "DJIM":   {"debt": 33, "interest": 33, "haram": 5, "recv": 33},
        "FTSE":   {"debt": 33, "interest": 33, "haram": 5, "recv": 50},
        "SP":     {"debt": 33, "interest": 33, "haram": 5, "recv": 49},
        "MSCI":   {"debt": 33.33, "interest": 33.33, "haram": 5, "recv": 33.33},
    }
    t = thresholds.get(std, thresholds["AAOIFI"])
    ratios = [
        {"ratio_name": "debt_ratio",
         "value": round(float(data.total_debt) / mc * 100, 2),
         "threshold": t["debt"]},
        {"ratio_name": "interest_ratio",
         "value": round((float(data.interest_bearing_securities) + float(data.cash_and_interest)) / mc * 100, 2),
         "threshold": t["interest"]},
        {"ratio_name": "haram_revenue",
         "value": round(float(data.haram_revenue) / tr * 100, 2),
         "threshold": t["haram"]},
        {"ratio_name": "receivables",
         "value": round(float(data.receivables) / mc * 100, 2),
         "threshold": t["recv"]},
    ]
    for r in ratios:
        r["passed"] = r["value"] <= r["threshold"]
    compliant = all(r["passed"] for r in ratios)
    score = round(sum(1 for r in ratios if r["passed"]) / len(ratios) * 100, 1)
    return {"standard": std, "ratios": ratios, "is_compliant": compliant, "score": score}


@router.post("/screening", response_model=ScreeningResponse,
             status_code=status.HTTP_201_CREATED)
def run_screening(
    data: ScreeningRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stds = [data.standard] if data.standard != "ALL" else [
        "AAOIFI", "DJIM", "FTSE", "SP", "MSCI"]
    results = [_calc_ratios(data, s) for s in stds]
    overall = round(sum(r["score"] for r in results) / len(results), 1)
    ok = all(r["is_compliant"] for r in results)
    row = IslamicScreening(
        user_id=current_user.id,
        company_name=data.company_name, ticker=data.ticker,
        standard=data.standard, total_assets=data.total_assets,
        total_debt=data.total_debt, total_revenue=data.total_revenue,
        haram_revenue=data.haram_revenue, market_cap=data.market_cap,
        interest_bearing_securities=data.interest_bearing_securities,
        cash_and_interest=data.cash_and_interest,
        receivables=data.receivables, result_json=results,
        overall_score=overall, is_compliant=ok,
    )
    db.add(row); db.commit(); db.refresh(row)
    return ScreeningResponse(
        id=row.id, company_name=row.company_name, ticker=row.ticker,
        standards=[StandardResult(**r) for r in results],
        overall_score=overall, is_compliant=ok,
        screened_at=row.screened_at,
    )


@router.get("/screening", response_model=List[ScreeningResponse])
def list_screenings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (db.query(IslamicScreening)
            .filter(IslamicScreening.user_id == current_user.id)
            .order_by(IslamicScreening.id.desc()).all())
    out = []
    for r in rows:
        stds = [StandardResult(**s) for s in (r.result_json or [])]
        out.append(ScreeningResponse(
            id=r.id, company_name=r.company_name, ticker=r.ticker,
            standards=stds, overall_score=r.overall_score or 0,
            is_compliant=r.is_compliant or False,
            screened_at=r.screened_at,
        ))
    return out


# ─── Zakat ──────────────────────────────────────────────
NISAB = {"gold": 85 * 65.0, "silver": 595 * 0.8}


@router.post("/zakat", response_model=ZakatResponse,
             status_code=status.HTTP_201_CREATED)
def calc_zakat(
    data: ZakatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_a = sum(float(v) for v in data.assets.values())
    total_l = sum(float(v) for v in (data.liabilities or {}).values())
    nisab = NISAB.get(data.nisab_type, NISAB["gold"])
    zakatable = max(total_a - total_l, 0)
    zakat_amt = round(zakatable * 0.025, 2) if zakatable >= nisab else 0
    row = ZakatCalculation(
        user_id=current_user.id, mode=data.mode, madhab=data.madhab,
        assets_json=data.assets, liabilities_json=data.liabilities,
        nisab_type=data.nisab_type, nisab_value=nisab,
        zakatable_amount=zakatable, zakat_amount=zakat_amt,
        currency=data.currency,
        hawl_start=data.hawl_start, hawl_end=data.hawl_end,
    )
    db.add(row); db.commit(); db.refresh(row)
    return ZakatResponse(
        id=row.id, mode=row.mode, madhab=row.madhab,
        nisab_type=row.nisab_type, nisab_value=row.nisab_value,
        zakatable_amount=row.zakatable_amount,
        zakat_amount=row.zakat_amount, currency=row.currency,
        hawl_start=row.hawl_start, hawl_end=row.hawl_end,
        created_at=row.created_at,
    )


@router.get("/zakat", response_model=List[ZakatResponse])
def list_zakat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (db.query(ZakatCalculation)
            .filter(ZakatCalculation.user_id == current_user.id)
            .order_by(ZakatCalculation.id.desc()).all())
    return [
        ZakatResponse(
            id=r.id, mode=r.mode, madhab=r.madhab,
            nisab_type=r.nisab_type, nisab_value=r.nisab_value,
            zakatable_amount=r.zakatable_amount,
            zakat_amount=r.zakat_amount, currency=r.currency,
            hawl_start=r.hawl_start, hawl_end=r.hawl_end,
            created_at=r.created_at,
        ) for r in rows
    ]


# ─── Purification ───────────────────────────────────────
@router.post("/purification", response_model=PurificationResponse,
             status_code=status.HTTP_201_CREATED)
def calc_purification(
    data: PurificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    amt = round(float(data.dividend_amount) * (data.haram_pct / 100), 2)
    row = PurificationRecord(
        user_id=current_user.id, portfolio_id=data.portfolio_id,
        position_name=data.position_name, haram_pct=data.haram_pct,
        dividend_amount=data.dividend_amount,
        purification_amount=amt,
        method=data.method, notes=data.notes,
    )
    db.add(row); db.commit(); db.refresh(row)
    return PurificationResponse(
        id=row.id, portfolio_id=row.portfolio_id,
        position_name=row.position_name, haram_pct=row.haram_pct,
        dividend_amount=row.dividend_amount,
        purification_amount=row.purification_amount,
        method=row.method, notes=row.notes,
        created_at=row.created_at,
    )


@router.get("/purification", response_model=List[PurificationResponse])
def list_purification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (db.query(PurificationRecord)
            .filter(PurificationRecord.user_id == current_user.id)
            .order_by(PurificationRecord.id.desc()).all())


# ─── Products (Contracts) ───────────────────────────────
@router.post("/products", response_model=ProductResponse,
             status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = {"product_type": data.product_type, "params": data.params,
              "calculated": True}
    schedule = None
    if data.product_type in ("murabaha", "ijarah", "istisna"):
        periods = int(data.params.get("periods", 12))
        amount = float(data.params.get("amount", 0))
        rate = float(data.params.get("rate", 0.05))
        total = amount * (1 + rate)
        pmt = round(total / max(periods, 1), 2)
        schedule = [{"period": i + 1, "payment": pmt} for i in range(periods)]
        result["total"] = round(total, 2)
        result["monthly_payment"] = pmt
    row = IslamicContract(
        user_id=current_user.id, product_type=data.product_type,
        title=data.title, params_json=data.params,
        result_json=result, schedule_json=schedule,
    )
    db.add(row); db.commit(); db.refresh(row)
    return ProductResponse(
        id=row.id, product_type=row.product_type, title=row.title,
        result=row.result_json, schedule=row.schedule_json,
        status=row.status,
    )


@router.get("/products", response_model=List[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (db.query(IslamicContract)
            .filter(IslamicContract.user_id == current_user.id)
            .order_by(IslamicContract.id.desc()).all())
    return [
        ProductResponse(
            id=r.id, product_type=r.product_type, title=r.title,
            result=r.result_json or {}, schedule=r.schedule_json,
            status=r.status,
        ) for r in rows
    ]


# ─── PoSC ───────────────────────────────────────────────
@router.post("/posc", response_model=PoSCResponse,
             status_code=status.HTTP_201_CREATED)
def create_posc(
    data: PoSCRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cats = {"governance": 4.0, "transparency": 3.5,
            "compliance": 4.5, "social_impact": 3.0, "risk": 4.0}
    score = round(sum(cats.values()) / len(cats), 2)
    findings = ["Auto-generated PoSC report"]
    doc_hash = (data.document_hash
                or hashlib.sha256(data.target_name.encode()).hexdigest()[:64])
    prev = (db.query(PoSCReport)
            .filter(PoSCReport.user_id == current_user.id)
            .order_by(PoSCReport.id.desc()).first())
    prev_h = prev.hash_chain if prev else "0" * 64
    chain = hashlib.sha256(f"{prev_h}{doc_hash}".encode()).hexdigest()[:64]
    row = PoSCReport(
        user_id=current_user.id, target_name=data.target_name,
        target_type=data.target_type, document_hash=doc_hash,
        score=score, category_scores_json=cats,
        findings_json=findings,
        hash_chain=chain, previous_hash=prev_h,
        status="completed",
    )
    db.add(row); db.commit(); db.refresh(row)
    return PoSCResponse(
        id=row.id, target_name=row.target_name, score=row.score,
        category_scores=row.category_scores_json,
        findings=row.findings_json,
        hash_chain=row.hash_chain, qr_code_url=row.qr_code_url,
        status=row.status,
    )


@router.get("/posc", response_model=List[PoSCResponse])
def list_posc(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (db.query(PoSCReport)
            .filter(PoSCReport.user_id == current_user.id)
            .order_by(PoSCReport.id.desc()).all())
    return [
        PoSCResponse(
            id=r.id, target_name=r.target_name,
            score=r.score or 0,
            category_scores=r.category_scores_json or {},
            findings=r.findings_json or [],
            hash_chain=r.hash_chain,
            qr_code_url=r.qr_code_url,
            status=r.status or "draft",
        ) for r in rows
    ]


# ─── SSB ────────────────────────────────────────────────
@router.post("/ssb/fatwas", response_model=SSBFatwaResponse,
             status_code=status.HTTP_201_CREATED)
def create_fatwa(
    data: SSBFatwaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = SSBFatwa(
        subject=data.subject, product_type=data.product_type,
        decision=data.decision, reasoning=data.reasoning,
        aaoifi_refs=data.aaoifi_refs, status="published",
    )
    db.add(row); db.commit(); db.refresh(row)
    return SSBFatwaResponse(
        id=row.id, subject=row.subject,
        product_type=row.product_type,
        decision=row.decision, aaoifi_refs=row.aaoifi_refs,
        status=row.status, issued_at=row.issued_at,
    )


@router.get("/ssb/fatwas", response_model=List[SSBFatwaResponse])
def list_fatwas(db: Session = Depends(get_db)):
    rows = db.query(SSBFatwa).order_by(SSBFatwa.id.desc()).all()
    return [
        SSBFatwaResponse(
            id=r.id, subject=r.subject,
            product_type=r.product_type,
            decision=r.decision, aaoifi_refs=r.aaoifi_refs,
            status=r.status, issued_at=r.issued_at,
        ) for r in rows
    ]


@router.get("/ssb/members", response_model=List[SSBMemberResponse])
def list_ssb_members(db: Session = Depends(get_db)):
    return (db.query(SSBMember)
            .filter(SSBMember.is_active == True).all())


# ─── Glossary ───────────────────────────────────────────
@router.get("/glossary", response_model=List[GlossaryResponse])
def list_glossary(
    q: Optional[str] = Query(None, description="Search"),
    db: Session = Depends(get_db),
):
    query = db.query(IslamicGlossary)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (IslamicGlossary.term_arabic.ilike(like)) |
            (IslamicGlossary.transliteration.ilike(like)) |
            (IslamicGlossary.term_ru.ilike(like)) |
            (IslamicGlossary.term_uz.ilike(like))
        )
    return query.order_by(IslamicGlossary.term_arabic).all()


# ─── Haram Industries ──────────────────────────────────
@router.get("/haram-industries",
            response_model=List[HaramIndustryResponse])
def list_haram_industries(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(HaramIndustryDB)
    if category:
        query = query.filter(HaramIndustryDB.category == category)
    return query.order_by(HaramIndustryDB.name_ru).all()


# ─── P2P ────────────────────────────────────────────────
@router.post("/p2p", response_model=P2PProjectResponse,
             status_code=status.HTTP_201_CREATED)
def create_p2p(
    data: P2PProjectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = IslamicP2PProject(
        user_id=current_user.id, title=data.title,
        description=data.description,
        target_amount=data.target_amount,
        product_type=data.product_type,
        profit_sharing_ratio=data.profit_sharing_ratio,
        duration_months=data.duration_months,
        risk_level=data.risk_level,
    )
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.get("/p2p", response_model=List[P2PProjectResponse])
def list_p2p(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    query = db.query(IslamicP2PProject)
    if status_filter:
        query = query.filter(IslamicP2PProject.status == status_filter)
    return query.order_by(IslamicP2PProject.id.desc()).all()
