"""
Сервис рыночных данных — Alpha Vantage.
Фаза 0: Замена синхронного httpx.get() на async httpx.AsyncClient.
"""
import os
import httpx

ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
BASE_URL = "https://www.alphavantage.co/query"

# Демо-данные для fallback
DEMO_QUOTES = {
    "AAPL": {"price": 263.75, "change": "-0.97", "change_percent": "-0.37%", "volume": "38020971"},
    "MSFT": {"price": 415.20, "change": "+3.50", "change_percent": "+0.85%", "volume": "22100000"},
    "GOOGL": {"price": 172.45, "change": "+2.10", "change_percent": "+1.24%", "volume": "18500000"},
    "TSLA": {"price": 248.30, "change": "-5.20", "change_percent": "-2.05%", "volume": "55000000"},
    "AMZN": {"price": 198.60, "change": "+1.80", "change_percent": "+0.91%", "volume": "31000000"},
}


async def get_stock_price(symbol: str) -> dict:
    """Получить котировку акции (async)."""
    try:
        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": symbol,
            "apikey": ALPHA_VANTAGE_API_KEY,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

        # Проверка на лимит API
        if "Note" in data or "Information" in data:
            if symbol.upper() in DEMO_QUOTES:
                d = DEMO_QUOTES[symbol.upper()]
                return {
                    "symbol": symbol.upper(),
                    "price": d["price"],
                    "change": d["change"],
                    "change_percent": d["change_percent"],
                    "volume": d["volume"],
                    "note": "Demo data (API limit reached)",
                }
            return {"symbol": symbol, "price": None, "error": "API limit reached or symbol not found"}

        quote = data.get("Global Quote", {})
        if not quote:
            return {"symbol": symbol, "price": None, "error": "Symbol not found"}

        return {
            "symbol": symbol,
            "price": float(quote.get("05. price", 0)),
            "change": quote.get("09. change", "0"),
            "change_percent": quote.get("10. change percent", "0%"),
            "volume": quote.get("06. volume", "0"),
        }
    except httpx.TimeoutException:
        return {"symbol": symbol, "price": None, "error": "Request timeout"}
    except httpx.HTTPStatusError as e:
        return {"symbol": symbol, "price": None, "error": f"HTTP error: {e.response.status_code}"}
    except Exception as e:
        return {"symbol": symbol, "price": None, "error": str(e)}


async def get_market_overview(symbols: list) -> list:
    """Получить обзор рынка для списка символов (async)."""
    import asyncio
    results = await asyncio.gather(*[get_stock_price(s) for s in symbols])
    return list(results)
