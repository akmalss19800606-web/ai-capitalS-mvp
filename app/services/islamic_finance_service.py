"""
Islamic Finance Service Layer.
Business logic extracted from router for screening, zakat, purification, products, posc.
"""
import hashlib
import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.db.models.islamic_finance import (
    IslamicScreening, ZakatCalculation, PurificationRecord,
    IslamicContract, PoSCReport, SSBFatwa, SSBMember,
    IslamicGlossary, HaramIndustryDB, IslamicP2PProject,
)

logger = logging.getLogger(__name__)

# ─── Screening Thresholds ─────────────────────────────────
THRESHOLDS = {
    "AAOIFI": {"debt": 30, "interest": 30, "haram": 5, "recv": 49},
    "DJIM":   {"debt": 33, "interest": 33, "haram": 5, "recv": 33},
    "FTSE":   {"debt": 33, "interest": 33, "haram": 5, "recv": 50},
    "SP":     {"debt": 33, "interest": 33, "haram": 5, "recv": 49},
    "MSCI":   {"debt": 33.33, "interest": 33.33, "haram": 5, "recv": 33.33},
}

ALL_STANDARDS = ["AAOIFI", "DJIM", "FTSE", "SP", "MSCI"]


class ScreeningService:
    """Shariah screening across multiple standards."""

    @staticmethod
    def calc_ratios(
        total_debt: float,
        interest_bearing_securities: float,
        cash_and_interest: float,
        haram_revenue: float,
        receivables: float,
        market_cap: float,
        total_assets: float,
        total_revenue: float,
        standard: str,
    ) -> dict:
        mc = float(market_cap or total_assets) or 1
        tr = float(total_revenue) or 1
        t = THRESHOLDS.get(standard, THRESHOLDS["AAOIFI"])
        ratios = [
            {"ratio_name": "debt_ratio",
             "value": round(float(total_debt) / mc * 100, 2),
             "threshold": t["debt"]},
            {"ratio_name": "interest_ratio",
             "value": round((float(interest_bearing_securities) + float(cash_and_interest)) / mc * 100, 2),
             "threshold": t["interest"]},
            {"ratio_name": "haram_revenue",
             "value": round(float(haram_revenue) / tr * 100, 2),
             "threshold": t["haram"]},
            {"ratio_name": "receivables",
             "value": round(float(receivables) / mc * 100, 2),
             "threshold": t["recv"]},
        ]
        for r in ratios:
            r["passed"] = r["value"] <= r["threshold"]
        compliant = all(r["passed"] for r in ratios)
        score = round(sum(1 for r in ratios if r["passed"]) / len(ratios) * 100, 1)
        return {"standard": standard, "ratios": ratios, "is_compliant": compliant, "score": score}

    @staticmethod
    def run_screening(
        db: Session,
        user_id: int,
        company_name: str,
        ticker: Optional[str],
        standard: str,
        total_assets: float,
        total_debt: float,
        total_revenue: float,
        haram_revenue: float,
        market_cap: float,
        interest_bearing_securities: float,
        cash_and_interest: float,
        receivables: float,
    ) -> tuple:
        """Run screening, save to DB, return (row, results, overall, is_compliant)."""
        stds = [standard] if standard != "ALL" else ALL_STANDARDS
        results = []
        for s in stds:
            results.append(ScreeningService.calc_ratios(
                total_debt, interest_bearing_securities, cash_and_interest,
                haram_revenue, receivables, market_cap, total_assets,
                total_revenue, s,
            ))
        overall = round(sum(r["score"] for r in results) / len(results), 1)
        ok = all(r["is_compliant"] for r in results)

        row = IslamicScreening(
            user_id=user_id,
            company_name=company_name,
            ticker=ticker,
            standard=standard,
            total_assets=total_assets,
            total_debt=total_debt,
            total_revenue=total_revenue,
            haram_revenue=haram_revenue,
            market_cap=market_cap,
            interest_bearing_securities=interest_bearing_securities,
            cash_and_interest=cash_and_interest,
            receivables=receivables,
            result_json=results,
            overall_score=overall,
            is_compliant=ok,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row, results, overall, ok

    @staticmethod
    def list_screenings(db: Session, user_id: int) -> list:
        return (db.query(IslamicScreening)
                .filter(IslamicScreening.user_id == user_id)
                .order_by(IslamicScreening.id.desc()).all())


# ─── Zakat ──────────────────────────────────────────────
class ZakatService:
    NISAB_GOLD_GRAMS = 85
    NISAB_SILVER_GRAMS = 595
    ZAKAT_RATE = 0.025

    # Default prices (USD per gram) — will be replaced by live feed later
    DEFAULT_GOLD_PRICE = 65.0
    DEFAULT_SILVER_PRICE = 0.8

    CURRENCY_RATES = {"UZS": 12876.54, "USD": 1, "EUR": 0.92, "RUB": 92.5}

    @classmethod
    def get_nisab(cls, nisab_type: str = "gold", currency: str = "UZS") -> float:
        rate = cls.CURRENCY_RATES.get(currency, 1)
        if nisab_type == "silver":
            return round(cls.NISAB_SILVER_GRAMS * cls.DEFAULT_SILVER_PRICE * rate, 2)
        return round(cls.NISAB_GOLD_GRAMS * cls.DEFAULT_GOLD_PRICE * rate, 2)

    @classmethod
    def get_nisab_info(cls, currency: str = "UZS") -> dict:
        rate = cls.CURRENCY_RATES.get(currency, 1)
        gold_val = round(cls.NISAB_GOLD_GRAMS * cls.DEFAULT_GOLD_PRICE * rate, 2)
        silver_val = round(cls.NISAB_SILVER_GRAMS * cls.DEFAULT_SILVER_PRICE * rate, 2)
        return {
            "nisab_gold": {"grams": cls.NISAB_GOLD_GRAMS, "value": gold_val,
                           "display": f"{round(gold_val):,} {currency}"},
            "nisab_silver": {"grams": cls.NISAB_SILVER_GRAMS, "value": silver_val,
                             "display": f"{round(silver_val):,} {currency}"},
            "currency": currency,
        }

    @classmethod
    def calculate(cls, db: Session, user_id: int, mode: str, madhab: str,
                  assets: dict, liabilities: dict | None, nisab_type: str,
                  currency: str, hawl_start=None, hawl_end=None) -> ZakatCalculation:
        total_a = sum(float(v) for v in assets.values())
        total_l = sum(float(v) for v in (liabilities or {}).values())
        nisab = cls.get_nisab(nisab_type, currency)
        zakatable = max(total_a - total_l, 0)
        zakat_amt = round(zakatable * cls.ZAKAT_RATE, 2) if zakatable >= nisab else 0

        row = ZakatCalculation(
            user_id=user_id, mode=mode, madhab=madhab,
            assets_json=assets, liabilities_json=liabilities,
            nisab_type=nisab_type, nisab_value=nisab,
            zakatable_amount=zakatable, zakat_amount=zakat_amt,
            currency=currency, hawl_start=hawl_start, hawl_end=hawl_end,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def list_calculations(db: Session, user_id: int) -> list:
        return (db.query(ZakatCalculation)
                .filter(ZakatCalculation.user_id == user_id)
                .order_by(ZakatCalculation.id.desc()).all())


# ─── Purification ───────────────────────────────────────
class PurificationService:
    @staticmethod
    def calculate(db: Session, user_id: int, portfolio_id: int | None,
                  position_name: str, haram_pct: float,
                  dividend_amount: float, method: str, notes: str | None) -> PurificationRecord:
        amt = round(float(dividend_amount) * (haram_pct / 100), 2)
        row = PurificationRecord(
            user_id=user_id, portfolio_id=portfolio_id,
            position_name=position_name, haram_pct=haram_pct,
            dividend_amount=dividend_amount, purification_amount=amt,
            method=method, notes=notes,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def list_records(db: Session, user_id: int) -> list:
        return (db.query(PurificationRecord)
                .filter(PurificationRecord.user_id == user_id)
                .order_by(PurificationRecord.id.desc()).all())


# ─── Products ───────────────────────────────────────────
class ProductService:
    @staticmethod
    def create(db: Session, user_id: int, product_type: str,
               title: str | None, params: dict) -> IslamicContract:
        result = {"product_type": product_type, "params": params, "calculated": True}
        schedule = None
        if product_type in ("murabaha", "ijarah", "istisna"):
            periods = int(params.get("periods", 12))
            amount = float(params.get("amount", 0))
            rate = float(params.get("rate", 0.05))
            total = amount * (1 + rate)
            pmt = round(total / max(periods, 1), 2)
            schedule = [{"period": i + 1, "payment": pmt} for i in range(periods)]
            result["total"] = round(total, 2)
            result["monthly_payment"] = pmt

        row = IslamicContract(
            user_id=user_id, product_type=product_type,
            title=title, params_json=params,
            result_json=result, schedule_json=schedule,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def list_products(db: Session, user_id: int) -> list:
        return (db.query(IslamicContract)
                .filter(IslamicContract.user_id == user_id)
                .order_by(IslamicContract.id.desc()).all())


# ─── PoSC ───────────────────────────────────────────────
class PoSCService:
    DEFAULT_CATEGORIES = {
        "governance": 4.0, "transparency": 3.5,
        "compliance": 4.5, "social_impact": 3.0, "risk": 4.0,
    }

    @classmethod
    def create_report(cls, db: Session, user_id: int,
                      target_name: str, target_type: str | None,
                      document_hash: str | None) -> PoSCReport:
        cats = cls.DEFAULT_CATEGORIES.copy()
        score = round(sum(cats.values()) / len(cats), 2)
        findings = ["Auto-generated PoSC report"]
        doc_hash = document_hash or hashlib.sha256(target_name.encode()).hexdigest()[:64]

        prev = (db.query(PoSCReport)
                .filter(PoSCReport.user_id == user_id)
                .order_by(PoSCReport.id.desc()).first())
        prev_h = prev.hash_chain if prev else "0" * 64
        chain = hashlib.sha256(f"{prev_h}{doc_hash}".encode()).hexdigest()[:64]

        row = PoSCReport(
            user_id=user_id, target_name=target_name,
            target_type=target_type, document_hash=doc_hash,
            score=score, category_scores_json=cats,
            findings_json=findings, hash_chain=chain,
            previous_hash=prev_h, status="completed",
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def list_reports(db: Session, user_id: int) -> list:
        return (db.query(PoSCReport)
                .filter(PoSCReport.user_id == user_id)
                .order_by(PoSCReport.id.desc()).all())


# ─── Reference data queries ─────────────────────────────
class GlossaryService:
    @staticmethod
    def search(db: Session, q: str | None = None) -> list:
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


class HaramIndustryService:
    @staticmethod
    def list_industries(db: Session, category: str | None = None) -> list:
        query = db.query(HaramIndustryDB)
        if category:
            query = query.filter(HaramIndustryDB.category == category)
        return query.order_by(HaramIndustryDB.name_ru).all()
