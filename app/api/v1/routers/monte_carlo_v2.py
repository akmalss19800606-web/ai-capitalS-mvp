"""
Роутер Монте-Карло v2 — PORT-002, Фаза 4.
Калибровка под реальные параметры экономики Узбекистана.

Эндпоинт:
  POST /analytics/monte-carlo-v2 — запуск по сектору
"""

import logging
import math
import random

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Monte Carlo v2"])

# ── Параметры Узбекистана по секторам ────────────────────────────────────────

SECTOR_PARAMS = {
    "agriculture": {
        "name": "Сельское хозяйство",
        "mean_return": 0.18,
        "volatility": 0.35,
        "correlation_usd": 0.3,
    },
    "food_processing": {
        "name": "Пищевая промышленность",
        "mean_return": 0.20,
        "volatility": 0.28,
        "correlation_usd": 0.25,
    },
    "trade": {
        "name": "Торговля",
        "mean_return": 0.22,
        "volatility": 0.22,
        "correlation_usd": 0.4,
    },
    "construction": {
        "name": "Строительство и недвижимость",
        "mean_return": 0.25,
        "volatility": 0.30,
        "correlation_usd": 0.35,
    },
    "manufacturing": {
        "name": "Промышленность",
        "mean_return": 0.20,
        "volatility": 0.28,
        "correlation_usd": 0.3,
    },
    "it_services": {
        "name": "IT и услуги",
        "mean_return": 0.30,
        "volatility": 0.40,
        "correlation_usd": 0.5,
    },
    "transport": {
        "name": "Транспорт и логистика",
        "mean_return": 0.18,
        "volatility": 0.25,
        "correlation_usd": 0.35,
    },
    "tourism": {
        "name": "Туризм и общепит",
        "mean_return": 0.22,
        "volatility": 0.32,
        "correlation_usd": 0.3,
    },
}

# Макроэкономические параметры Узбекистана
UZ_INFLATION = 0.10
UZ_GDP_GROWTH = 0.06
UZ_EXCHANGE_VOLATILITY = 0.12
UZ_RISK_FREE_RATE = 0.14


class MonteCarloV2Request(BaseModel):
    investment_amount: float = Field(..., gt=0, description="Сумма инвестиции (млн UZS)")
    sector: str = Field(..., description="Код сектора")
    time_horizon_years: int = Field(5, ge=1, le=30, description="Горизонт (лет)")
    num_simulations: int = Field(10000, ge=100, le=50000, description="Кол-во симуляций")


@router.post("/monte-carlo-v2", summary="Монте-Карло v2 (по секторам Узбекистана)")
async def run_monte_carlo_v2(
    body: MonteCarloV2Request,
    _current_user=Depends(get_current_user),
):
    """
    Монте-Карло симуляция с реальными параметрами Узбекистана.
    Калибрована по секторам: доходность, волатильность, корреляция с курсом.
    """
    params = SECTOR_PARAMS.get(body.sector)
    if not params:
        raise HTTPException(
            status_code=400,
            detail=f"Неизвестный сектор: {body.sector}. "
                   f"Доступные: {', '.join(SECTOR_PARAMS.keys())}",
        )

    try:
        result = _simulate(
            investment=body.investment_amount,
            mean_return=params["mean_return"],
            volatility=params["volatility"],
            correlation_usd=params["correlation_usd"],
            years=body.time_horizon_years,
            n_sims=body.num_simulations,
        )
        result["sector"] = body.sector
        result["sector_name"] = params["name"]
        result["investment_amount"] = body.investment_amount
        return result
    except Exception as e:
        logger.error("Ошибка Монте-Карло v2: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка симуляции") from e


@router.get("/monte-carlo-v2/sectors", summary="Доступные секторы")
async def get_sectors(_current_user=Depends(get_current_user)):
    """Список доступных секторов с параметрами."""
    return {
        "sectors": [
            {"code": k, **v} for k, v in SECTOR_PARAMS.items()
        ],
        "macro_params": {
            "inflation": UZ_INFLATION,
            "gdp_growth": UZ_GDP_GROWTH,
            "exchange_volatility": UZ_EXCHANGE_VOLATILITY,
            "risk_free_rate": UZ_RISK_FREE_RATE,
        },
    }


def _simulate(
    investment: float,
    mean_return: float,
    volatility: float,
    correlation_usd: float,
    years: int,
    n_sims: int,
) -> dict:
    """Монте-Карло (GBM) с учётом инфляции и курсовых рисков."""
    results = []

    # Реальная доходность = номинальная - инфляция
    real_return = mean_return - UZ_INFLATION
    # Увеличиваем vol за счёт курсовых рисков
    total_vol = math.sqrt(
        volatility ** 2
        + (UZ_EXCHANGE_VOLATILITY * correlation_usd) ** 2
    )

    dt = 1.0  # годовой шаг
    drift = real_return - 0.5 * total_vol ** 2

    for _ in range(n_sims):
        value = investment
        for _ in range(years):
            shock = random.gauss(0, 1)
            value *= math.exp(drift * dt + total_vol * math.sqrt(dt) * shock)
        results.append(value)

    results.sort()
    n = len(results)

    def pct(p: float) -> float:
        idx = p / 100.0 * (n - 1)
        lo = int(math.floor(idx))
        hi = min(lo + 1, n - 1)
        frac = idx - lo
        return results[lo] * (1 - frac) + results[hi] * frac

    mean_val = sum(results) / n
    median_val = pct(50)
    variance = sum((x - mean_val) ** 2 for x in results) / n
    std_val = math.sqrt(variance)

    # Гистограмма
    num_bins = 25
    min_v, max_v = results[0], results[-1]
    bin_w = (max_v - min_v) / num_bins if max_v != min_v else 1
    histogram = []
    for i in range(num_bins):
        lo_b = min_v + i * bin_w
        hi_b = lo_b + bin_w
        count = sum(1 for x in results if lo_b <= x < hi_b) if i < num_bins - 1 \
            else sum(1 for x in results if x >= lo_b)
        histogram.append({
            "bin_start": round(lo_b, 2),
            "bin_end": round(hi_b, 2),
            "count": count,
            "frequency": round(count / n, 4),
        })

    p_loss = sum(1 for x in results if x < investment) / n
    expected_return = (mean_val - investment) / investment

    return {
        "num_simulations": n,
        "time_horizon_years": years,
        "percentiles": {
            "p5": round(pct(5), 2),
            "p25": round(pct(25), 2),
            "p50": round(pct(50), 2),
            "p75": round(pct(75), 2),
            "p95": round(pct(95), 2),
        },
        "statistics": {
            "mean": round(mean_val, 2),
            "median": round(median_val, 2),
            "std": round(std_val, 2),
            "min": round(results[0], 2),
            "max": round(results[-1], 2),
        },
        "probability_of_loss": round(p_loss, 4),
        "probability_of_loss_pct": f"{p_loss * 100:.1f}%",
        "expected_return": round(expected_return, 4),
        "expected_return_pct": f"{expected_return * 100:.1f}%",
        "var_95": round(investment - pct(5), 2),
        "histogram": histogram,
        "calibration": {
            "real_return": round(real_return, 4),
            "total_volatility": round(total_vol, 4),
            "inflation": UZ_INFLATION,
            "exchange_volatility": UZ_EXCHANGE_VOLATILITY,
            "risk_free_rate": UZ_RISK_FREE_RATE,
        },
    }
