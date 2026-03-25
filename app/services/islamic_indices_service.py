"""Islamic Finance Indices Service - market indices and risk metrics."""
import logging
from datetime import date, timedelta
from typing import Any

logger = logging.getLogger(__name__)


ISLAMIC_INDICES = [
    {"id": "DJIM", "name": "Dow Jones Islamic Market Index",
     "name_ru": "Индекс Dow Jones Islamic Market", "region": "global",
     "base_value": 3500.0, "currency": "USD"},
    {"id": "SP500S", "name": "S&P 500 Shariah Index",
     "name_ru": "Индекс S&P 500 Shariah", "region": "us",
     "base_value": 1800.0, "currency": "USD"},
    {"id": "FTSE_SI", "name": "FTSE Shariah All-World Index",
     "name_ru": "Индекс FTSE Shariah All-World", "region": "global",
     "base_value": 2200.0, "currency": "USD"},
    {"id": "MSCI_IS", "name": "MSCI Islamic Index Series",
     "name_ru": "Индекс MSCI Islamic", "region": "global",
     "base_value": 2800.0, "currency": "USD"},
    {"id": "UZ_IF", "name": "Uzbekistan Islamic Finance Index",
     "name_ru": "Индекс исламских финансов Узбекистана", "region": "uz",
     "base_value": 1000.0, "currency": "UZS"},
]


def _generate_history(base: float, days: int = 30) -> list[dict[str, Any]]:
    """Generate mock historical data for an index."""
    import random
    random.seed(42)
    history = []
    value = base
    today = date.today()
    for i in range(days, 0, -1):
        change = random.uniform(-0.015, 0.018)
        value = round(value * (1 + change), 2)
        history.append({
            "date": (today - timedelta(days=i)).isoformat(),
            "value": value,
            "change_pct": round(change * 100, 2),
        })
    return history


def get_indices() -> list[dict[str, Any]]:
    """Get all Islamic market indices with current values."""
    result = []
    for idx in ISLAMIC_INDICES:
        history = _generate_history(idx["base_value"], 30)
        current = history[-1]["value"] if history else idx["base_value"]
        prev = history[-2]["value"] if len(history) > 1 else current
        result.append({
            **idx,
            "current_value": current,
            "daily_change_pct": round((current - prev) / prev * 100, 2),
            "monthly_change_pct": round(
                (current - history[0]["value"]) / history[0]["value"] * 100, 2
            ) if history else 0,
        })
    return result


def get_index_history(index_id: str, days: int = 30) -> dict[str, Any] | None:
    """Get historical data for a specific index."""
    for idx in ISLAMIC_INDICES:
        if idx["id"] == index_id:
            return {
                **idx,
                "history": _generate_history(idx["base_value"], days),
            }
    return None


def assess_risk(portfolio_value: float, shariah_pct: float = 100.0) -> dict[str, Any]:
    """Assess risk for an Islamic portfolio."""
    non_compliant_pct = 100.0 - shariah_pct
    risk_score = round(min(100, non_compliant_pct * 2 + 10), 1)
    if risk_score <= 20:
        risk_level = "low"
    elif risk_score <= 50:
        risk_level = "medium"
    else:
        risk_level = "high"
    return {
        "portfolio_value": portfolio_value,
        "shariah_compliant_pct": shariah_pct,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "recommendations": [
            "Увеличьте долю шариат-комплаентных активов" if shariah_pct < 100 else "Портфель полностью соответствует шариату",
            "Регулярно проводите шариатский аудит",
            "Диверсифицируйте по секторам и регионам",
        ],
    }
