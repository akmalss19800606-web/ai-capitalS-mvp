import os
import httpx

ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
BASE_URL = "https://www.alphavantage.co/query"

def get_stock_price(symbol: str) -> dict:
    params = {
        "function": "GLOBAL_QUOTE",
        "symbol": symbol,
        "apikey": ALPHA_VANTAGE_API_KEY
    }
    response = httpx.get(BASE_URL, params=params)
    data = response.json()
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

def get_market_overview(symbols: list) -> list:
    results = []
    for symbol in symbols:
        data = get_stock_price(symbol)
        results.append(data)
    return results
