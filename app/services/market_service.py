import os
import httpx

ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
BASE_URL = "https://www.alphavantage.co/query"

def get_stock_price(symbol: str) -> dict:
    try:
        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": symbol,
            "apikey": ALPHA_VANTAGE_API_KEY
        }
        response = httpx.get(BASE_URL, params=params, timeout=10)
        data = response.json()

        # Проверка на лимит API
        if "Note" in data or "Information" in data:
            # Возвращаем демо данные если лимит исчерпан
            demo = {
                "AAPL": {"price": 263.75, "change": "-0.97", "change_percent": "-0.37%", "volume": "38020971"},
                "MSFT": {"price": 415.20, "change": "+3.50", "change_percent": "+0.85%", "volume": "22100000"},
                "GOOGL": {"price": 172.45, "change": "+2.10", "change_percent": "+1.24%", "volume": "18500000"},
                "TSLA": {"price": 248.30, "change": "-5.20", "change_percent": "-2.05%", "volume": "55000000"},
                "AMZN": {"price": 198.60, "change": "+1.80", "change_percent": "+0.91%", "volume": "31000000"},
            }
            if symbol.upper() in demo:
                d = demo[symbol.upper()]
                return {
                    "symbol": symbol.upper(),
                    "price": d["price"],
                    "change": d["change"],
                    "change_percent": d["change_percent"],
                    "volume": d["volume"],
                    "note": "Demo data (API limit reached)"
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
            "volume": quote.get("06. volume", "0")
        }
    except Exception as e:
        return {"symbol": symbol, "price": None, "error": str(e)}

def get_market_overview(symbols: list) -> list:
    return [get_stock_price(s) for s in symbols]