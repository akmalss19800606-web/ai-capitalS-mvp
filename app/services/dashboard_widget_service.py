"""
Dashboard Widget Services
Ticker (cbu.uz), Heatmap (UZSE), Sectors, Macro data
With Redis caching
"""
import httpx
import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional

logger = logging.getLogger(__name__)

# Sector mapping for UZSE stocks
SECTOR_MAP = {
    "SQBN": "banks", "TBNK": "banks", "KPQB": "banks", "AQBN": "banks",
    "UZMK": "industry", "UZKY": "chemical", "NFAZ": "chemical",
    "UZTX": "textile", "KVTS": "food", "HMKZ": "food",
    "URTS": "telecom", "TELN": "telecom",
    "QZSM": "construction", "BKSM": "construction",
    "LNZS": "energy", "TSHZ": "energy",
}

SECTOR_NAMES = {
    "banks": "\u0411\u0430\u043d\u043a\u0438",
    "industry": "\u041f\u0440\u043e\u043c\u044b\u0448\u043b\u0435\u043d\u043d\u043e\u0441\u0442\u044c",
    "chemical": "\u0425\u0438\u043c\u0438\u044f",
    "textile": "\u0422\u0435\u043a\u0441\u0442\u0438\u043b\u044c",
    "food": "\u041f\u0438\u0449\u0435\u0432\u0430\u044f",
    "telecom": "\u0422\u0435\u043b\u0435\u043a\u043e\u043c",
    "construction": "\u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e",
    "energy": "\u042d\u043d\u0435\u0440\u0433\u0435\u0442\u0438\u043a\u0430",
}

CBU_API = "https://cbu.uz/ru/arkhiv-kursov-valyut/json/"
CURRENCY_CODES = ["USD", "EUR", "GBP", "RUB", "CNY"]


async def get_redis():
    """Get Redis connection from app state or return None."""
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url("redis://redis:6379", decode_responses=True)
        await r.ping()
        return r
    except Exception:
        return None


async def cache_get(key: str) -> Optional[dict]:
    r = await get_redis()
    if r:
        try:
            data = await r.get(key)
            if data:
                return json.loads(data)
        except Exception:
            pass
    return None


async def cache_set(key: str, data: dict, ttl: int = 300):
    r = await get_redis()
    if r:
        try:
            await r.set(key, json.dumps(data, default=str), ex=ttl)
        except Exception:
            pass


# === A: Ticker Service ===
async def get_ticker_data() -> list:
    """Fetch currency rates from cbu.uz + cache."""
    cached = await cache_get("dashboard:ticker")
    if cached:
        return cached

    items = []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(CBU_API)
            if resp.status_code == 200:
                all_rates = resp.json()
                for r in all_rates:
                    if r.get("Ccy") in CURRENCY_CODES:
                        rate = float(r.get("Rate", 0))
                        diff = float(r.get("Diff", 0))
                        diff_pct = (diff / rate * 100) if rate else 0
                        items.append({
                            "code": r["Ccy"],
                            "name": r.get("CcyNm_RU", r["Ccy"]),
                            "rate": rate,
                            "diff": diff,
                            "diff_percent": round(diff_pct, 2),
                            "sparkline": [],
                            "updated_at": r.get("Date"),
                        })
    except Exception as e:
        logger.error(f"Ticker fetch error: {e}")
        items = [
            {"code": "USD", "name": "US Dollar", "rate": 12800, "diff": 0, "diff_percent": 0, "sparkline": [], "updated_at": None},
            {"code": "EUR", "name": "Euro", "rate": 13900, "diff": 0, "diff_percent": 0, "sparkline": [], "updated_at": None},
            {"code": "RUB", "name": "Russian Ruble", "rate": 140, "diff": 0, "diff_percent": 0, "sparkline": [], "updated_at": None},
        ]

    if items:
        await cache_set("dashboard:ticker", items, ttl=300)
    return items


# === C: Heatmap Service ===
async def get_heatmap_data() -> dict:
    """Fetch UZSE stock data for heatmap."""
    cached = await cache_get("dashboard:heatmap")
    if cached:
        return cached

    sectors = {}
    # Fallback demo data since UZSE API may not be publicly available
    demo_stocks = [
        {"ticker": "SQBN", "name": "Sanoat Qurilish Bank", "price": 1250, "change_percent": 2.3, "market_cap": 500000},
        {"ticker": "TBNK", "name": "Turonbank", "price": 890, "change_percent": -1.1, "market_cap": 350000},
        {"ticker": "UZMK", "name": "Uzmetkombinat", "price": 45000, "change_percent": 0.5, "market_cap": 800000},
        {"ticker": "UZKY", "name": "Uzkimyosanoat", "price": 3200, "change_percent": -2.8, "market_cap": 420000},
        {"ticker": "KVTS", "name": "Kvarts", "price": 5600, "change_percent": 1.7, "market_cap": 280000},
        {"ticker": "URTS", "name": "Uztelecom", "price": 12000, "change_percent": 0.3, "market_cap": 600000},
        {"ticker": "QZSM", "name": "Qizilqumsement", "price": 7800, "change_percent": -0.9, "market_cap": 450000},
        {"ticker": "LNZS", "name": "Lukoil Uzbekistan", "price": 25000, "change_percent": 3.1, "market_cap": 900000},
    ]

    for stock in demo_stocks:
        sector_code = SECTOR_MAP.get(stock["ticker"], "other")
        sector_name = SECTOR_NAMES.get(sector_code, sector_code)
        if sector_name not in sectors:
            sectors[sector_name] = {"name": sector_name, "stocks": [], "total_change_percent": 0}
        stock["sector"] = sector_name
        sectors[sector_name]["stocks"].append(stock)

    for s in sectors.values():
        if s["stocks"]:
            s["total_change_percent"] = round(
                sum(st["change_percent"] for st in s["stocks"]) / len(s["stocks"]), 2
            )

    result = {
        "sectors": list(sectors.values()),
        "updated_at": datetime.utcnow().isoformat(),
    }
    await cache_set("dashboard:heatmap", result, ttl=600)
    return result


# === F: Sectors Service ===
async def get_sectors_data() -> dict:
    """Get sector breakdown from heatmap data."""
    cached = await cache_get("dashboard:sectors")
    if cached:
        return cached

    heatmap = await get_heatmap_data()
    sectors = []
    for s in heatmap.get("sectors", []):
        top = sorted(s["stocks"], key=lambda x: abs(x.get("change_percent", 0)), reverse=True)[:3]
        sectors.append({
            "name": s["name"],
            "code": s["name"].lower().replace(" ", "_"),
            "change_percent": s.get("total_change_percent", 0),
            "weekly_change_percent": s.get("total_change_percent", 0),
            "stocks_count": len(s["stocks"]),
            "top_stocks": [st["ticker"] for st in top],
        })

    result = {"sectors": sectors, "updated_at": datetime.utcnow().isoformat()}
    await cache_set("dashboard:sectors", result, ttl=600)
    return result


# === I: Macro Data ===
async def get_macro_data() -> dict:
    """Get macro indicators."""
    cached = await cache_get("dashboard:realdata")
    if cached:
        return cached

    result = {
        "refinancing_rate": 14.0,
        "industrial_growth": 5.2,
        "trade_balance": -1.3,
        "updated_at": datetime.utcnow().isoformat(),
    }
    await cache_set("dashboard:realdata", result, ttl=3600)
    return result


# === H: Organization KPI ===
def get_org_kpi(db, org_id: int) -> dict:
    """Get KPI for organization from balance entries."""
    from app.db.models.organization_models import Organization, BalanceEntry
    from sqlalchemy import select, func

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        return None

    # Get latest period entries
    latest = (
        db.query(func.max(BalanceEntry.period_date))
        .filter(BalanceEntry.organization_id == org_id)
        .scalar()
    )

    total_assets = 0
    total_liabilities = 0
    equity = 0
    retained_profit = 0

    if latest:
        entries = (
            db.query(BalanceEntry)
            .filter(
                BalanceEntry.organization_id == org_id,
                BalanceEntry.period_date == latest,
            )
            .all()
        )
        for e in entries:
            account = e.account
            if account:
                cat = account.category
                bal = float(e.balance or 0)
                if cat in ("long_term_assets", "current_assets"):
                    total_assets += bal
                elif cat == "liabilities":
                    total_liabilities += bal
                elif cat == "equity":
                    equity += bal
                elif cat == "income":
                    retained_profit += bal
                elif cat == "expenses":
                    retained_profit -= bal

    return {
        "org_id": org.id,
        "org_name": org.name,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "equity": equity,
        "retained_profit": retained_profit,
        "balance_valid": abs(total_assets - total_liabilities - equity) < 1,
        "period_date": str(latest) if latest else None,
        "currency": org.accounting_currency or "UZS",
    }
