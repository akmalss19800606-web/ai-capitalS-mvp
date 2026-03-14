import io
import math
import random
from typing import List, Optional, Dict, Any
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field
import httpx

from app.api.v1.deps import get_db

router = APIRouter(tags=["calculator"])


# ==================== MODELS ====================

class ProjectInput(BaseModel):
    name: str
    initial_investment: float
    currency: str = "USD"
    revenue_year1: float
    revenue_growth_rate: float = 0.10
    operating_margin: float = 0.20
    horizon_years: int = 5
    discount_rate: Optional[float] = None
    tax_rate: float = 0.15
    capex_annual: float = 0

class ProjectResult(BaseModel):
    name: str
    npv: float
    irr: float
    mirr: float
    payback_period: float
    discounted_payback: float
    profitability_index: float
    roi_pct: float
    total_revenue: float
    total_profit: float
    yearly_cashflows: List[float]

class CompareRequest(BaseModel):
    projects: List[ProjectInput] = Field(..., min_length=2, max_length=5)
    wacc: Optional[float] = None

class CompareResult(BaseModel):
    projects: List[ProjectResult]
    ranking: Dict[str, List[str]]
    recommendation: str
    timestamp: str

class BenchmarkData(BaseModel):
    cb_rate: float
    cb_rate_date: str
    inflation: float
    inflation_date: str
    lending_rate: float
    deposit_rate: float
    tsmi_index: float
    tsmi_ytd: float
    tsmi_date: str
    usd_uzs: float
    usd_uzs_date: str
    gov_bond_3y: float
    gov_bond_10y: float
    gov_debt_gdp: float
    gdp_growth: float

class SensitivityVariable(BaseModel):
    name: str
    base_value: float
    min_value: float
    max_value: float
    label: str

class TornadoItem(BaseModel):
    label: str
    npv_low: float
    npv_high: float
    npv_base: float
    swing: float

class SpiderPoint(BaseModel):
    variable: str
    pct_change: float
    npv: float

class DataTableCell(BaseModel):
    row_value: float
    col_value: float
    npv: float
    irr: float

class XAIResult(BaseModel):
    feature_importances: Dict[str, float]
    shap_values: Dict[str, float]
    key_drivers: List[str]
    explanation: str


# ==================== CALCULATION HELPERS ====================

def calc_cashflows(p: ProjectInput) -> List[float]:
    cfs = [-p.initial_investment]
    revenue = p.revenue_year1
    for y in range(1, p.horizon_years + 1):
        gross = revenue * p.operating_margin
        tax = gross * p.tax_rate if gross > 0 else 0
        net = gross - tax - p.capex_annual
        cfs.append(net)
        revenue *= (1 + p.revenue_growth_rate)
    return cfs

def calc_npv(cfs: List[float], rate: float) -> float:
    return sum(cf / (1 + rate) ** t for t, cf in enumerate(cfs))

def calc_irr(cfs: List[float], guess: float = 0.10, tol: float = 1e-8, max_iter: int = 200) -> float:
    rate = guess
    for _ in range(max_iter):
        npv = sum(cf / (1 + rate) ** t for t, cf in enumerate(cfs))
        dnpv = sum(-t * cf / (1 + rate) ** (t + 1) for t, cf in enumerate(cfs))
        if abs(dnpv) < 1e-12:
            break
        rate -= npv / dnpv
        if abs(npv) < tol:
            break
    return rate

def calc_mirr(cfs: List[float], finance_rate: float, reinvest_rate: float) -> float:
    n = len(cfs) - 1
    neg_pv = sum(cf / (1 + finance_rate) ** t for t, cf in enumerate(cfs) if cf < 0)
    pos_fv = sum(cf * (1 + reinvest_rate) ** (n - t) for t, cf in enumerate(cfs) if cf > 0)
    if neg_pv == 0 or pos_fv <= 0:
        return 0.0
    return (pos_fv / abs(neg_pv)) ** (1 / n) - 1

def calc_payback(cfs: List[float]) -> float:
    cumulative = 0
    for t, cf in enumerate(cfs):
        cumulative += cf
        if cumulative >= 0 and t > 0:
            prev = cumulative - cf
            return t - 1 + abs(prev) / cf if cf != 0 else float(t)
    return float(len(cfs))

def calc_discounted_payback(cfs: List[float], rate: float) -> float:
    cumulative = 0
    for t, cf in enumerate(cfs):
        dcf = cf / (1 + rate) ** t
        cumulative += dcf
        if cumulative >= 0 and t > 0:
            prev = cumulative - dcf
            return t - 1 + abs(prev) / dcf if dcf != 0 else float(t)
    return float(len(cfs))

def analyze_project(p: ProjectInput, wacc: Optional[float] = None) -> ProjectResult:
    rate = wacc or p.discount_rate or 0.14
    cfs = calc_cashflows(p)
    npv = calc_npv(cfs, rate)
    irr = calc_irr(cfs)
    mirr = calc_mirr(cfs, rate, rate)
    payback = calc_payback(cfs)
    disc_payback = calc_discounted_payback(cfs, rate)
    pi = (npv + p.initial_investment) / p.initial_investment if p.initial_investment else 0
    roi = (npv / p.initial_investment) * 100 if p.initial_investment else 0
    total_rev = sum(p.revenue_year1 * (1 + p.revenue_growth_rate) ** y for y in range(p.horizon_years))
    total_profit = sum(cfs[1:])

    return ProjectResult(
        name=p.name, npv=round(npv, 2), irr=round(irr, 4),
        mirr=round(mirr, 4), payback_period=round(payback, 2),
        discounted_payback=round(disc_payback, 2),
        profitability_index=round(pi, 3), roi_pct=round(roi, 2),
        total_revenue=round(total_rev, 2), total_profit=round(total_profit, 2),
        yearly_cashflows=[round(cf, 2) for cf in cfs]
    )


# ==================== #14 #17: COMPARE PROJECTS ====================

@router.post("/calculator/compare", response_model=CompareResult)
async def compare_projects(req: CompareRequest):
    """Сравнение 2-5 инвестиционных проектов side-by-side"""
    results = [analyze_project(p, req.wacc) for p in req.projects]

    ranking = {
        "by_npv": [r.name for r in sorted(results, key=lambda x: x.npv, reverse=True)],
        "by_irr": [r.name for r in sorted(results, key=lambda x: x.irr, reverse=True)],
        "by_payback": [r.name for r in sorted(results, key=lambda x: x.payback_period)],
        "by_pi": [r.name for r in sorted(results, key=lambda x: x.profitability_index, reverse=True)],
        "by_roi": [r.name for r in sorted(results, key=lambda x: x.roi_pct, reverse=True)],
    }

    best = sorted(results, key=lambda x: x.npv, reverse=True)[0]
    recommendation = (
        f"Рекомендация: {best.name} — лучший по NPV (${best.npv:,.0f}), "
        f"IRR {best.irr:.1%}, окупаемость {best.payback_period:.1f} лет, PI {best.profitability_index:.2f}"
    )

    return CompareResult(
        projects=results, ranking=ranking,
        recommendation=recommendation,
        timestamp=datetime.now().isoformat()
    )


# ==================== #20: BENCHMARKS ====================

@router.get("/calculator/benchmarks", response_model=BenchmarkData)
async def get_benchmarks():
    """Актуальные бенчмарки рынка Узбекистана: ставка ЦБ, инфляция, TSMI, облигации"""

    benchmarks = BenchmarkData(
        cb_rate=14.0,
        cb_rate_date="2026-01-28",
        inflation=7.2,
        inflation_date="2026-01",
        lending_rate=22.8,
        deposit_rate=21.0,
        tsmi_index=1221.6,
        tsmi_ytd=64.79,
        tsmi_date="2026-01-30",
        usd_uzs=12850.0,
        usd_uzs_date="2026-03",
        gov_bond_3y=15.5,
        gov_bond_10y=15.0,
        gov_debt_gdp=35.0,
        gdp_growth=7.2
    )

    # Пробуем получить свежие данные с cbu.uz
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("https://cbu.uz/ru/arkhiv-kursov-valyut/json/")
            if resp.status_code == 200:
                data = resp.json()
                for item in data:
                    if item.get("Ccy") == "USD":
                        benchmarks.usd_uzs = float(item.get("Rate", benchmarks.usd_uzs))
                        benchmarks.usd_uzs_date = item.get("Date", benchmarks.usd_uzs_date)
                        break
    except Exception:
        pass

    return benchmarks


@router.get("/calculator/benchmarks/compare")
async def compare_with_benchmarks(
    project_irr: float = Query(..., description="IRR проекта (десятичная дробь, напр. 0.25)"),
    project_npv: float = Query(0, description="NPV проекта"),
    currency: str = Query("UZS", description="Валюта проекта")
):
    """Сравнение IRR проекта с бенчмарками рынка Узбекистана"""

    b = await get_benchmarks()
    irr_pct = project_irr * 100

    comparisons = []

    if currency == "UZS":
        benchmarks_list = [
            {"name": "Ставка ЦБ (рефинансирования)", "rate": b.cb_rate, "type": "risk-free"},
            {"name": "Депозит UZS (средний)", "rate": b.deposit_rate, "type": "deposit"},
            {"name": "Кредитная ставка UZS", "rate": b.lending_rate, "type": "lending"},
            {"name": "ГКО 3 года UZS", "rate": b.gov_bond_3y, "type": "bond"},
            {"name": "ГКО 10 лет UZS", "rate": b.gov_bond_10y, "type": "bond"},
            {"name": "TSMI (YTD)", "rate": b.tsmi_ytd, "type": "equity"},
            {"name": "Инфляция (годовая)", "rate": b.inflation, "type": "inflation"},
        ]
    else:
        benchmarks_list = [
            {"name": "US Treasury 10Y", "rate": 4.3, "type": "risk-free"},
            {"name": "Евробонд УЗ 7Y USD", "rate": 6.95, "type": "bond"},
            {"name": "Кредит USD (средний)", "rate": 6.5, "type": "lending"},
            {"name": "S&P 500 (avg annual)", "rate": 10.0, "type": "equity"},
            {"name": "Инфляция (годовая)", "rate": b.inflation, "type": "inflation"},
        ]

    for bm in benchmarks_list:
        spread = irr_pct - bm["rate"]
        comparisons.append({
            "benchmark": bm["name"],
            "benchmark_rate": bm["rate"],
            "project_irr": round(irr_pct, 2),
            "spread": round(spread, 2),
            "verdict": "✅ Превышает" if spread > 0 else "⚠️ Ниже" if spread < -2 else "≈ На уровне",
            "type": bm["type"]
        })

    beats_all = all(c["spread"] > 0 for c in comparisons)
    beats_risk_free = all(c["spread"] > 0 for c in comparisons if c["type"] in ["risk-free", "bond"])

    if beats_all:
        verdict = "Проект превышает все бенчмарки — привлекательная инвестиция"
    elif beats_risk_free:
        verdict = "Проект превышает безрисковые ставки, но уступает некоторым альтернативам"
    else:
        verdict = "Проект не оправдывает риск — доходность ниже безрисковых альтернатив"

    return {
        "comparisons": comparisons,
        "project_irr_pct": round(irr_pct, 2),
        "currency": currency,
        "verdict": verdict,
        "data_date": datetime.now().strftime("%Y-%m-%d")
    }


# ==================== #15: API INTEGRATIONS ====================

@router.get("/reference/macro")
async def get_macro_data():
    """Актуальные макроданные Узбекистана из внешних API"""
    result = {
        "cb_rate": {"value": 14.0, "unit": "%", "source": "cbu.uz", "date": "2026-01-28"},
        "inflation": {"value": 7.2, "unit": "%", "source": "stat.uz", "date": "2026-01"},
        "gdp_growth": {"value": 7.2, "unit": "%", "source": "stat.uz", "date": "2025"},
        "usd_uzs": {"value": 12850, "unit": "UZS", "source": "cbu.uz", "date": "2026-03"},
        "lending_rate": {"value": 22.8, "unit": "%", "source": "cbu.uz", "date": "2025-Q3"},
        "deposit_rate": {"value": 21.0, "unit": "%", "source": "cbu.uz", "date": "2025-11"},
        "unemployment": {"value": 7.0, "unit": "%", "source": "stat.uz", "date": "2025"},
        "population": {"value": 37.1, "unit": "млн", "source": "stat.uz", "date": "2025"},
        "gov_debt_gdp": {"value": 35.0, "unit": "% ВВП", "source": "MOF", "date": "2024"},
    }

    # Live курс ЦБ
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("https://cbu.uz/ru/arkhiv-kursov-valyut/json/")
            if resp.status_code == 200:
                data = resp.json()
                currencies = {}
                for item in data:
                    ccy = item.get("Ccy", "")
                    if ccy in ["USD", "EUR", "RUB", "GBP", "CNY", "KZT"]:
                        currencies[ccy] = {
                            "rate": float(item["Rate"]),
                            "diff": item.get("Diff", "0"),
                            "date": item.get("Date", ""),
                        }
                result["exchange_rates"] = currencies
                if "USD" in currencies:
                    result["usd_uzs"]["value"] = currencies["USD"]["rate"]
                    result["usd_uzs"]["date"] = currencies["USD"]["date"]
                    result["usd_uzs"]["live"] = True
    except Exception:
        pass

    return result


@router.get("/reference/regions")
async def get_regions():
    """Регионы Узбекистана с данными GRP"""
    return [
        {"code": "TAS", "name": "Ташкент (город)", "grp_bln_uzs": 197260, "share_pct": 15.5, "population_mln": 3.0},
        {"code": "TAS_R", "name": "Ташкентская область", "grp_bln_uzs": 120450, "share_pct": 9.5, "population_mln": 2.9},
        {"code": "SAM", "name": "Самаркандская область", "grp_bln_uzs": 105800, "share_pct": 8.3, "population_mln": 4.0},
        {"code": "FER", "name": "Ферганская область", "grp_bln_uzs": 95600, "share_pct": 7.5, "population_mln": 3.8},
        {"code": "AND", "name": "Андижанская область", "grp_bln_uzs": 82300, "share_pct": 6.5, "population_mln": 3.2},
        {"code": "BUK", "name": "Бухарская область", "grp_bln_uzs": 78500, "share_pct": 6.2, "population_mln": 1.9},
        {"code": "KAS", "name": "Кашкадарьинская область", "grp_bln_uzs": 95200, "share_pct": 7.5, "population_mln": 3.3},
        {"code": "SUR", "name": "Сурхандарьинская область", "grp_bln_uzs": 62100, "share_pct": 4.9, "population_mln": 2.7},
        {"code": "NAM", "name": "Наманганская область", "grp_bln_uzs": 65400, "share_pct": 5.2, "population_mln": 2.9},
        {"code": "NAV", "name": "Навоийская область", "grp_bln_uzs": 98700, "share_pct": 7.8, "population_mln": 1.0},
        {"code": "XOR", "name": "Хорезмская область", "grp_bln_uzs": 48900, "share_pct": 3.9, "population_mln": 1.9},
        {"code": "JIZ", "name": "Джизакская область", "grp_bln_uzs": 42300, "share_pct": 3.3, "population_mln": 1.4},
        {"code": "SIR", "name": "Сырдарьинская область", "grp_bln_uzs": 35800, "share_pct": 2.8, "population_mln": 0.9},
        {"code": "KAR", "name": "Республика Каракалпакстан", "grp_bln_uzs": 42500, "share_pct": 3.3, "population_mln": 1.9},
    ]


@router.get("/reference/sez")
async def get_sez():
    """Список СЭЗ Узбекистана с налоговыми льготами"""
    return [
        {"code": "NAVOI", "name": "СЭЗ Навои", "region": "Навоийская", "tax_exempt_years": 10, "customs_exempt": True, "sectors": ["промышленность", "логистика", "IT"]},
        {"code": "ANGREN", "name": "СЭЗ Ангрен", "region": "Ташкентская", "tax_exempt_years": 10, "customs_exempt": True, "sectors": ["промышленность", "строительные материалы"]},
        {"code": "DJIZAK", "name": "СЭЗ Джизак", "region": "Джизакская", "tax_exempt_years": 10, "customs_exempt": True, "sectors": ["автомобилестроение", "текстиль"]},
        {"code": "KOKAND", "name": "СЭЗ Коканд", "region": "Ферганская", "tax_exempt_years": 7, "customs_exempt": True, "sectors": ["пищевая", "текстиль"]},
        {"code": "URGUT", "name": "СЭЗ Ургут", "region": "Самаркандская", "tax_exempt_years": 7, "customs_exempt": True, "sectors": ["лёгкая промышленность"]},
        {"code": "GIJDUVAN", "name": "СЭЗ Гиждуван", "region": "Бухарская", "tax_exempt_years": 7, "customs_exempt": True, "sectors": ["промышленность"]},
        {"code": "NUKUS", "name": "СЭЗ Нукус-фарм", "region": "Каракалпакстан", "tax_exempt_years": 10, "customs_exempt": True, "sectors": ["фармацевтика"]},
        {"code": "BUKHARA", "name": "СЭЗ Бухара-агро", "region": "Бухарская", "tax_exempt_years": 7, "customs_exempt": True, "sectors": ["агропромышленность"]},
        {"code": "TASHKENT", "name": "ТИДПЗ IT Park", "region": "Ташкент", "tax_exempt_years": 10, "customs_exempt": False, "sectors": ["IT", "software", "BPO"]},
    ]


# ==================== #18: SENSITIVITY EXTENDED ====================

@router.post("/calculator/sensitivity/tornado")
async def tornado_analysis(
    project: ProjectInput,
    variation_pct: float = Query(20.0, description="% отклонения параметров")
):
    """Tornado-диаграмма: чувствительность NPV к каждому параметру"""
    rate = project.discount_rate or 0.14
    base_cfs = calc_cashflows(project)
    base_npv = calc_npv(base_cfs, rate)

    variables = [
        ("revenue_year1", "Выручка Year 1", project.revenue_year1),
        ("revenue_growth_rate", "Темп роста выручки", project.revenue_growth_rate),
        ("operating_margin", "Операционная маржа", project.operating_margin),
        ("initial_investment", "Инвестиция", project.initial_investment),
        ("discount_rate", "Ставка дисконтирования", rate),
        ("tax_rate", "Ставка налога", project.tax_rate),
    ]

    tornado = []
    for field, label, base_val in variables:
        low_val = base_val * (1 - variation_pct / 100)
        high_val = base_val * (1 + variation_pct / 100)

        p_low = project.model_copy()
        p_high = project.model_copy()

        if field == "discount_rate":
            npv_low = calc_npv(calc_cashflows(project), low_val)
            npv_high = calc_npv(calc_cashflows(project), high_val)
        else:
            setattr(p_low, field, low_val)
            setattr(p_high, field, high_val)
            npv_low = calc_npv(calc_cashflows(p_low), rate)
            npv_high = calc_npv(calc_cashflows(p_high), rate)

        tornado.append(TornadoItem(
            label=label,
            npv_low=round(npv_low, 2),
            npv_high=round(npv_high, 2),
            npv_base=round(base_npv, 2),
            swing=round(abs(npv_high - npv_low), 2)
        ))

    tornado.sort(key=lambda x: x.swing, reverse=True)
    return {"base_npv": round(base_npv, 2), "variation_pct": variation_pct, "items": [t.model_dump() for t in tornado]}


@router.post("/calculator/sensitivity/spider")
async def spider_analysis(project: ProjectInput):
    """Spider-диаграмма: NPV при отклонении каждого параметра от -30% до +30%"""
    rate = project.discount_rate or 0.14
    steps = [-30, -20, -10, 0, 10, 20, 30]

    variables = [
        ("revenue_year1", "Выручка"),
        ("operating_margin", "Маржа"),
        ("revenue_growth_rate", "Рост"),
        ("discount_rate", "WACC"),
        ("initial_investment", "CAPEX"),
    ]

    spider_data = {}
    for field, label in variables:
        points = []
        base_val = getattr(project, field) if field != "discount_rate" else rate
        for pct in steps:
            new_val = base_val * (1 + pct / 100)
            if field == "discount_rate":
                npv = calc_npv(calc_cashflows(project), max(new_val, 0.01))
            else:
                p = project.model_copy()
                setattr(p, field, new_val)
                npv = calc_npv(calc_cashflows(p), rate)
            points.append({"pct_change": pct, "npv": round(npv, 2)})
        spider_data[label] = points

    return {"variables": spider_data}


@router.post("/calculator/sensitivity/data-table")
async def two_way_data_table(
    project: ProjectInput,
    var1_field: str = Query("revenue_growth_rate", description="Переменная 1"),
    var2_field: str = Query("operating_margin", description="Переменная 2"),
    var1_steps: int = Query(5, description="Кол-во шагов по переменной 1"),
    var2_steps: int = Query(5, description="Кол-во шагов по переменной 2"),
    variation_pct: float = Query(30.0)
):
    """Two-Way Data Table: NPV/IRR при изменении двух переменных"""
    rate = project.discount_rate or 0.14

    base1 = getattr(project, var1_field) if var1_field != "discount_rate" else rate
    base2 = getattr(project, var2_field) if var2_field != "discount_rate" else rate

    range1 = [base1 * (1 + (i - var1_steps // 2) * variation_pct / 100 / (var1_steps // 2)) for i in range(var1_steps)]
    range2 = [base2 * (1 + (i - var2_steps // 2) * variation_pct / 100 / (var2_steps // 2)) for i in range(var2_steps)]

    table = []
    for v1 in range1:
        for v2 in range2:
            p = project.model_copy()
            r = rate
            if var1_field == "discount_rate":
                r = max(v1, 0.01)
            else:
                setattr(p, var1_field, v1)
            if var2_field == "discount_rate":
                r = max(v2, 0.01)
            else:
                setattr(p, var2_field, v2)

            cfs = calc_cashflows(p)
            npv = calc_npv(cfs, r)
            irr = calc_irr(cfs)
            table.append(DataTableCell(row_value=round(v1, 4), col_value=round(v2, 4), npv=round(npv, 2), irr=round(irr, 4)))

    return {
        "var1": var1_field, "var2": var2_field,
        "var1_values": [round(v, 4) for v in range1],
        "var2_values": [round(v, 4) for v in range2],
        "cells": [c.model_dump() for c in table]
    }


# ==================== #21: XAI (SHAP/LIME-like) ====================

@router.post("/calculator/xai", response_model=XAIResult)
async def explain_investment(project: ProjectInput):
    """XAI: объяснимость инвестиционного решения (SHAP-like анализ)"""
    rate = project.discount_rate or 0.14
    base_cfs = calc_cashflows(project)
    base_npv = calc_npv(base_cfs, rate)

    # Feature importance через one-at-a-time perturbation (SHAP-like)
    features = {
        "Выручка Year 1": ("revenue_year1", project.revenue_year1),
        "Темп роста": ("revenue_growth_rate", project.revenue_growth_rate),
        "Операционная маржа": ("operating_margin", project.operating_margin),
        "Инвестиция (CAPEX)": ("initial_investment", project.initial_investment),
        "Ставка дисконтирования": ("discount_rate", rate),
        "Ставка налога": ("tax_rate", project.tax_rate),
        "Горизонт (лет)": ("horizon_years", project.horizon_years),
    }

    importances = {}
    shap_values = {}

    for label, (field, base_val) in features.items():
        if base_val == 0:
            importances[label] = 0
            shap_values[label] = 0
            continue

        delta = base_val * 0.01  # 1% perturbation
        if field == "horizon_years":
            delta = 1

        # NPV при +delta
        p_up = project.model_copy()
        if field == "discount_rate":
            npv_up = calc_npv(calc_cashflows(project), rate + delta)
        elif field == "horizon_years":
            p_up.horizon_years = project.horizon_years + 1
            npv_up = calc_npv(calc_cashflows(p_up), rate)
        else:
            setattr(p_up, field, base_val + delta)
            npv_up = calc_npv(calc_cashflows(p_up), rate)

        # NPV при -delta
        p_dn = project.model_copy()
        if field == "discount_rate":
            npv_dn = calc_npv(calc_cashflows(project), max(rate - delta, 0.01))
        elif field == "horizon_years":
            p_dn.horizon_years = max(project.horizon_years - 1, 1)
            npv_dn = calc_npv(calc_cashflows(p_dn), rate)
        else:
            setattr(p_dn, field, max(base_val - delta, 0))
            npv_dn = calc_npv(calc_cashflows(p_dn), rate)

        sensitivity = abs(npv_up - npv_dn)
        shap_val = (npv_up - npv_dn) / 2  # marginal contribution

        importances[label] = round(sensitivity, 2)
        shap_values[label] = round(shap_val, 2)

    # Normalize importances to percentages
    total = sum(importances.values()) or 1
    feature_importances = {k: round(v / total * 100, 1) for k, v in importances.items()}

    # Sort and get top drivers
    sorted_features = sorted(feature_importances.items(), key=lambda x: x[1], reverse=True)
    key_drivers = [f[0] for f in sorted_features[:3]]

    # Generate explanation
    top3 = sorted_features[:3]
    explanation = f"NPV проекта ({base_npv:,.0f}) наиболее чувствителен к: "
    explanation += ", ".join(f"{name} ({pct:.0f}%)" for name, pct in top3)
    explanation += ". "

    if base_npv > 0:
        explanation += "Проект показывает положительную NPV — рекомендуется к инвестированию."
    else:
        explanation += "NPV отрицательна — проект не оправдывает инвестиции при текущих параметрах."

    # Risk assessment
    if shap_values.get("Ставка дисконтирования", 0) < -1000:
        explanation += " ⚠️ Высокая чувствительность к ставке дисконтирования — рассмотрите хеджирование."

    return XAIResult(
        feature_importances=feature_importances,
        shap_values=shap_values,
        key_drivers=key_drivers,
        explanation=explanation
    )
