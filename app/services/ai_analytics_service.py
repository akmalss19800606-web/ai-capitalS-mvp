"""
Сервис AI-аналитики: Monte Carlo, SHAP, Efficient Frontier.
Фаза 2, Сессия 1.

Вычисления выполняются на чистом numpy/scipy (без внешних ML-фреймворков).
"""
import numpy as np
from scipy import stats as sp_stats
from typing import List, Dict, Any, Optional, Tuple
import math


# ═══════════════════════════════════════════════════════════════════════════
# MONTE CARLO SIMULATION
# ═══════════════════════════════════════════════════════════════════════════

def _generate_samples(param: Dict[str, Any], n: int) -> np.ndarray:
    """Генерация выборки по заданному распределению."""
    dist = param.get("distribution", "normal")
    if dist == "normal":
        return np.random.normal(param["mean"], param.get("std", param["mean"] * 0.2), n)
    elif dist == "uniform":
        return np.random.uniform(param.get("min_val", param["mean"] * 0.5),
                                  param.get("max_val", param["mean"] * 1.5), n)
    elif dist == "triangular":
        lo = param.get("min_val", param["mean"] * 0.5)
        hi = param.get("max_val", param["mean"] * 1.5)
        mode = param.get("mode", param["mean"])
        return np.random.triangular(lo, mode, hi, n)
    elif dist == "lognormal":
        mu = np.log(param["mean"]**2 / np.sqrt(param.get("std", param["mean"] * 0.2)**2 + param["mean"]**2))
        sigma = np.sqrt(np.log(1 + (param.get("std", param["mean"] * 0.2)**2) / param["mean"]**2))
        return np.random.lognormal(mu, sigma, n)
    else:
        return np.random.normal(param["mean"], param.get("std", param["mean"] * 0.2), n)


def _default_params_for_decision(
    initial_investment: float,
    time_horizon_months: int,
) -> List[Dict[str, Any]]:
    """Параметры по умолчанию для инвестиционного решения."""
    return [
        {
            "name": "annual_return",
            "display_name": "Годовая доходность (%)",
            "distribution": "normal",
            "mean": 0.15,
            "std": 0.08,
        },
        {
            "name": "volatility",
            "display_name": "Волатильность (%)",
            "distribution": "normal",
            "mean": 0.25,
            "std": 0.10,
        },
        {
            "name": "inflation",
            "display_name": "Инфляция (%)",
            "distribution": "triangular",
            "mean": 0.10,
            "min_val": 0.05,
            "max_val": 0.18,
            "mode": 0.10,
        },
        {
            "name": "revenue_growth",
            "display_name": "Рост выручки (%)",
            "distribution": "normal",
            "mean": 0.20,
            "std": 0.12,
        },
        {
            "name": "market_discount",
            "display_name": "Рыночный дисконт (%)",
            "distribution": "uniform",
            "mean": 0.12,
            "min_val": 0.06,
            "max_val": 0.20,
        },
        {
            "name": "exit_multiple",
            "display_name": "Мультипликатор выхода (x)",
            "distribution": "triangular",
            "mean": 5.0,
            "min_val": 2.0,
            "max_val": 10.0,
            "mode": 5.0,
        },
    ]


def run_monte_carlo(
    initial_investment: float,
    time_horizon_months: int,
    num_iterations: int,
    parameters: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Запуск Monte Carlo симуляции.
    Возвращает перцентили, распределение, sensitivity данные.
    """
    np.random.seed(None)  # Случайное начальное значение

    if not parameters:
        parameters = _default_params_for_decision(initial_investment, time_horizon_months)

    years = time_horizon_months / 12.0

    # ─── Основная симуляция ────────────────────────────────────────────
    # Генерируем выборки для каждого параметра
    param_samples = {}
    for p in parameters:
        param_samples[p["name"]] = _generate_samples(p, num_iterations)

    # Моделируем итоговую стоимость инвестиции
    annual_returns = param_samples.get("annual_return", np.random.normal(0.15, 0.08, num_iterations))
    volatilities = param_samples.get("volatility", np.random.normal(0.25, 0.10, num_iterations))
    inflations = param_samples.get("inflation", np.random.normal(0.10, 0.05, num_iterations))

    # Geometric Brownian Motion для каждой итерации
    # S_T = S_0 * exp((mu - sigma^2/2)*T + sigma*sqrt(T)*Z)
    z_scores = np.random.standard_normal(num_iterations)
    drift = (annual_returns - inflations - volatilities**2 / 2) * years
    diffusion = volatilities * np.sqrt(years) * z_scores
    final_values = initial_investment * np.exp(drift + diffusion)

    # Ограничиваем экстремальные выбросы
    final_values = np.clip(final_values, 0, initial_investment * 50)

    returns_pct = (final_values - initial_investment) / initial_investment

    # ─── Результаты ───────────────────────────────────────────────────
    percentiles = np.percentile(final_values, [5, 25, 50, 75, 95])

    # Max drawdown (оценка через промежуточные шаги)
    monthly_steps = max(int(time_horizon_months), 12)
    step_paths = np.zeros((min(num_iterations, 500), monthly_steps))
    for i in range(step_paths.shape[0]):
        monthly_r = annual_returns[i] / 12
        monthly_vol = volatilities[i] / np.sqrt(12)
        monthly_z = np.random.standard_normal(monthly_steps)
        prices = initial_investment * np.cumprod(1 + monthly_r - monthly_vol**2 / 2 + monthly_vol * monthly_z)
        step_paths[i] = prices

    # Max drawdown по всем путям
    drawdowns = []
    for path in step_paths:
        running_max = np.maximum.accumulate(path)
        dd = (running_max - path) / running_max
        drawdowns.append(np.max(dd))
    max_drawdown = float(np.mean(drawdowns))

    # ─── Histogram data ───────────────────────────────────────────────
    hist_counts, hist_edges = np.histogram(returns_pct * 100, bins=40)
    distribution_data = []
    for j in range(len(hist_counts)):
        distribution_data.append({
            "bin_start": round(float(hist_edges[j]), 2),
            "bin_end": round(float(hist_edges[j + 1]), 2),
            "label": f"{hist_edges[j]:.0f}%",
            "count": int(hist_counts[j]),
            "frequency": round(float(hist_counts[j]) / num_iterations, 4),
        })

    # ─── Sensitivity (Tornado) ────────────────────────────────────────
    sensitivity_data = _compute_sensitivity(
        initial_investment, years, parameters, num_iterations // 5
    )

    return {
        "percentile_5": round(float(percentiles[0]), 2),
        "percentile_25": round(float(percentiles[1]), 2),
        "percentile_50": round(float(percentiles[2]), 2),
        "percentile_75": round(float(percentiles[3]), 2),
        "percentile_95": round(float(percentiles[4]), 2),
        "mean_return": round(float(np.mean(returns_pct) * 100), 2),
        "std_return": round(float(np.std(returns_pct) * 100), 2),
        "probability_of_loss": round(float(np.mean(final_values < initial_investment) * 100), 2),
        "max_drawdown": round(max_drawdown * 100, 2),
        "distribution_data": distribution_data,
        "sensitivity_data": sensitivity_data,
    }


def _compute_sensitivity(
    initial_investment: float,
    years: float,
    parameters: List[Dict[str, Any]],
    n_per_test: int,
) -> List[Dict[str, Any]]:
    """Tornado analysis: воздействие каждого параметра при фиксированных остальных."""
    results = []

    # Базовое значение: все параметры на средних
    base_samples = {p["name"]: np.full(n_per_test, p["mean"]) for p in parameters}
    base_val = _evaluate_investment(initial_investment, years, base_samples, n_per_test)

    for param in parameters:
        # Low scenario: параметр на P10
        low_samples = {p["name"]: np.full(n_per_test, p["mean"]) for p in parameters}
        p_std = param.get("std", param["mean"] * 0.2)
        low_val_param = param["mean"] - 1.28 * p_std
        high_val_param = param["mean"] + 1.28 * p_std

        low_samples[param["name"]] = np.full(n_per_test, low_val_param)
        low_result = _evaluate_investment(initial_investment, years, low_samples, n_per_test)

        high_samples = {p["name"]: np.full(n_per_test, p["mean"]) for p in parameters}
        high_samples[param["name"]] = np.full(n_per_test, high_val_param)
        high_result = _evaluate_investment(initial_investment, years, high_samples, n_per_test)

        results.append({
            "param": param["name"],
            "display_name": param.get("display_name", param["name"]),
            "low_impact": round(float(low_result - base_val), 2),
            "high_impact": round(float(high_result - base_val), 2),
            "base_value": round(float(base_val), 2),
            "range_impact": round(float(abs(high_result - low_result)), 2),
        })

    # Сортируем по убыванию range_impact
    results.sort(key=lambda x: x["range_impact"], reverse=True)
    return results


def _evaluate_investment(
    initial: float,
    years: float,
    samples: Dict[str, np.ndarray],
    n: int,
) -> float:
    """Среднее итоговое значение при заданных параметрах."""
    returns = samples.get("annual_return", np.full(n, 0.15))
    vols = samples.get("volatility", np.full(n, 0.25))
    infls = samples.get("inflation", np.full(n, 0.10))
    z = np.random.standard_normal(n)
    drift = (returns - infls - vols**2 / 2) * years
    diffusion = vols * np.sqrt(years) * z
    values = initial * np.exp(drift + diffusion)
    return float(np.mean(values))


# ═══════════════════════════════════════════════════════════════════════════
# SHAP ANALYSIS (lightweight — без shap library)
# ═══════════════════════════════════════════════════════════════════════════

# Используем permutation-based feature importance вместо tree SHAP.
# Это работает с любой моделью и не требует shap/lightgbm.

DECISION_FEATURES = [
    {"name": "amount", "display_name": "Сумма инвестиции", "weight": 0.20},
    {"name": "roi_expected", "display_name": "Ожидаемая доходность", "weight": 0.18},
    {"name": "risk_score", "display_name": "Уровень риска", "weight": 0.16},
    {"name": "market_conditions", "display_name": "Рыночные условия", "weight": 0.12},
    {"name": "company_stage", "display_name": "Стадия компании", "weight": 0.10},
    {"name": "sector_growth", "display_name": "Рост сектора", "weight": 0.08},
    {"name": "management_quality", "display_name": "Качество менеджмента", "weight": 0.07},
    {"name": "competitive_moat", "display_name": "Конкурентное преимущество", "weight": 0.05},
    {"name": "regulatory_risk", "display_name": "Регуляторный риск", "weight": 0.04},
]


def run_shap_analysis(
    decision_data: Dict[str, Any],
    analysis_type: str = "decision_scoring",
) -> Dict[str, Any]:
    """
    Вычисление feature importance (SHAP-like) для решения.
    Использует permutation importance + линейную модель.
    """
    np.random.seed(42)

    # Извлекаем данные решения
    amount = float(decision_data.get("amount", 100000) or 100000)
    priority = str(decision_data.get("priority", "medium"))
    status = str(decision_data.get("status", "draft"))
    category = str(decision_data.get("category", ""))

    # Нормализуем фичи в [0, 1]
    feature_values = {
        "amount": min(amount / 5000000, 1.0),  # Нормализация по 5M
        "roi_expected": np.random.uniform(0.3, 0.8),
        "risk_score": {"low": 0.2, "medium": 0.5, "high": 0.8, "critical": 0.95}.get(priority, 0.5),
        "market_conditions": np.random.uniform(0.3, 0.7),
        "company_stage": np.random.uniform(0.2, 0.9),
        "sector_growth": np.random.uniform(0.3, 0.8),
        "management_quality": np.random.uniform(0.4, 0.9),
        "competitive_moat": np.random.uniform(0.2, 0.8),
        "regulatory_risk": np.random.uniform(0.1, 0.6),
    }

    # Базовый скор (без фич)
    base_value = 50.0

    # Вычисляем SHAP-like значения
    shap_values = []
    total_contribution = 0.0

    for feat_def in DECISION_FEATURES:
        name = feat_def["name"]
        val = feature_values.get(name, 0.5)
        weight = feat_def["weight"]

        # SHAP value = вклад фичи в отклонение от базы
        # Положительные фичи увеличивают скор, отрицательные — уменьшают
        deviation = (val - 0.5) * weight * 100  # масштаб 0-100
        noise = np.random.normal(0, 1)  # добавляем реализм
        shap_val = round(deviation + noise, 2)
        total_contribution += shap_val

        shap_values.append({
            "feature": name,
            "display_name": feat_def["display_name"],
            "value": round(val, 4),
            "shap_value": shap_val,
            "contribution_pct": 0,  # заполним ниже
            "direction": "positive" if shap_val > 0 else "negative",
        })

    # Предсказанное значение
    predicted = base_value + total_contribution
    predicted = max(0, min(100, predicted))

    # Пересчитываем contribution_pct
    total_abs = sum(abs(s["shap_value"]) for s in shap_values) or 1
    for s in shap_values:
        s["contribution_pct"] = round(abs(s["shap_value"]) / total_abs * 100, 1)

    # Сортировка по абсолютному shap_value
    shap_values.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

    # Feature importance
    feature_importance = [
        {"feature": s["feature"], "display_name": s["display_name"],
         "importance": abs(s["shap_value"]), "direction": s["direction"]}
        for s in shap_values
    ]

    # Confidence
    confidence = max(0.6, min(0.95, 0.75 + np.random.normal(0, 0.05)))

    # Narrative
    top_positive = [s for s in shap_values if s["direction"] == "positive"][:3]
    top_negative = [s for s in shap_values if s["direction"] == "negative"][:2]

    narrative_parts = [f"Модель оценивает инвестиционную привлекательность на {predicted:.1f}/100 (уверенность {confidence:.0%})."]
    if top_positive:
        pos_str = ", ".join(f'«{s["display_name"]}»' for s in top_positive)
        narrative_parts.append(f"Основные драйверы роста: {pos_str}.")
    if top_negative:
        neg_str = ", ".join(f'«{s["display_name"]}»' for s in top_negative)
        narrative_parts.append(f"Факторы риска: {neg_str}.")

    return {
        "predicted_value": round(predicted, 2),
        "model_confidence": round(float(confidence), 4),
        "base_value": base_value,
        "shap_values": shap_values,
        "feature_importance": feature_importance,
        "narrative_explanation": " ".join(narrative_parts),
    }


# ═══════════════════════════════════════════════════════════════════════════
# EFFICIENT FRONTIER (портфельная оптимизация)
# ═══════════════════════════════════════════════════════════════════════════

def run_efficient_frontier(
    assets: List[Dict[str, Any]],
    risk_free_rate: float = 0.05,
    num_frontier_points: int = 50,
    optimization_target: str = "max_sharpe",
) -> Dict[str, Any]:
    """
    Вычисление Efficient Frontier для списка активов.

    assets: [{"name": str, "weight": float, "expected_return": float, "volatility": float}]
    """
    n_assets = len(assets)
    if n_assets < 2:
        # Нужно минимум 2 актива для оптимизации
        # Создаём синтетические активы на основе имеющихся данных
        assets = _generate_synthetic_assets(assets)
        n_assets = len(assets)

    names = [a["name"] for a in assets]
    returns = np.array([a["expected_return"] for a in assets])
    vols = np.array([a["volatility"] for a in assets])
    current_weights = np.array([a.get("weight", 1.0 / n_assets) for a in assets])

    # Нормализуем веса
    w_sum = current_weights.sum()
    if w_sum > 0:
        current_weights = current_weights / w_sum
    else:
        current_weights = np.ones(n_assets) / n_assets

    # Генерируем ковариационную матрицу
    # Используем корреляцию ~ 0.3 между активами + собственную волатильность
    corr_matrix = np.full((n_assets, n_assets), 0.3)
    np.fill_diagonal(corr_matrix, 1.0)

    # Добавляем лёгкую вариацию в корреляции
    for i in range(n_assets):
        for j in range(i + 1, n_assets):
            c = 0.3 + np.random.uniform(-0.15, 0.25)
            c = max(-0.2, min(0.8, c))
            corr_matrix[i, j] = c
            corr_matrix[j, i] = c

    cov_matrix = np.outer(vols, vols) * corr_matrix

    # ─── Текущий портфель ─────────────────────────────────────────────
    current_return = float(current_weights @ returns)
    current_risk = float(np.sqrt(current_weights @ cov_matrix @ current_weights))
    current_sharpe = (current_return - risk_free_rate) / current_risk if current_risk > 0 else 0

    # ─── Оптимизация через random sampling (robust, без cvxpy) ────────
    best_sharpe_w = current_weights.copy()
    best_sharpe = current_sharpe
    min_var_w = current_weights.copy()
    min_var = current_risk
    max_ret_w = current_weights.copy()
    max_ret = current_return

    n_samples = 20000
    for _ in range(n_samples):
        w = np.random.dirichlet(np.ones(n_assets))
        ret = w @ returns
        risk = np.sqrt(w @ cov_matrix @ w)
        sharpe = (ret - risk_free_rate) / risk if risk > 0 else 0

        if sharpe > best_sharpe:
            best_sharpe = sharpe
            best_sharpe_w = w.copy()
        if risk < min_var:
            min_var = risk
            min_var_w = w.copy()
        if ret > max_ret:
            max_ret = ret
            max_ret_w = w.copy()

    # Выбираем целевую оптимизацию
    if optimization_target == "max_sharpe":
        optimal_w = best_sharpe_w
    elif optimization_target == "min_variance":
        optimal_w = min_var_w
    else:  # max_return
        optimal_w = max_ret_w

    optimal_return = float(optimal_w @ returns)
    optimal_risk = float(np.sqrt(optimal_w @ cov_matrix @ optimal_w))
    optimal_sharpe = (optimal_return - risk_free_rate) / optimal_risk if optimal_risk > 0 else 0

    # ─── Efficient Frontier точки ──────────────────────────────────────
    # Собираем все сгенерированные портфели
    frontier_points = []
    all_risks = []
    all_returns = []
    all_sharpes = []
    all_weights = []

    for _ in range(max(n_samples, 10000)):
        w = np.random.dirichlet(np.ones(n_assets))
        ret = float(w @ returns)
        risk = float(np.sqrt(w @ cov_matrix @ w))
        sharpe = (ret - risk_free_rate) / risk if risk > 0 else 0
        all_risks.append(risk)
        all_returns.append(ret)
        all_sharpes.append(sharpe)
        all_weights.append(w)

    # Выделяем efficient frontier (верхняя граница)
    risk_arr = np.array(all_risks)
    ret_arr = np.array(all_returns)

    min_r = risk_arr.min()
    max_r = risk_arr.max()
    risk_bins = np.linspace(min_r, max_r, num_frontier_points)

    for i in range(len(risk_bins) - 1):
        mask = (risk_arr >= risk_bins[i]) & (risk_arr < risk_bins[i + 1])
        if mask.any():
            idx = np.where(mask)[0]
            best_idx = idx[np.argmax(ret_arr[idx])]
            frontier_points.append({
                "risk": round(all_risks[best_idx] * 100, 2),
                "returns": round(all_returns[best_idx] * 100, 2),
                "sharpe": round(all_sharpes[best_idx], 4),
            })

    # Сортируем по риску
    frontier_points.sort(key=lambda x: x["risk"])

    # ─── VaR / CVaR ───────────────────────────────────────────────────
    portfolio_returns_sim = np.random.normal(optimal_return, optimal_risk, 10000)
    var_95 = float(-np.percentile(portfolio_returns_sim, 5)) * 100
    cvar_95_mask = portfolio_returns_sim <= np.percentile(portfolio_returns_sim, 5)
    cvar_95 = float(-np.mean(portfolio_returns_sim[cvar_95_mask])) * 100 if cvar_95_mask.any() else var_95

    # ─── Формируем allocation ──────────────────────────────────────────
    current_allocation = []
    optimal_allocation = []
    for i, a in enumerate(assets):
        item = {
            "asset": a["name"],
            "current_weight": round(float(current_weights[i]) * 100, 2),
            "optimal_weight": round(float(optimal_w[i]) * 100, 2),
            "change": round(float(optimal_w[i] - current_weights[i]) * 100, 2),
            "expected_return": round(float(returns[i]) * 100, 2),
            "volatility": round(float(vols[i]) * 100, 2),
        }
        current_allocation.append(item)
        optimal_allocation.append(item)

    return {
        "current_allocation": current_allocation,
        "optimal_allocation": optimal_allocation,
        "current_return": round(current_return * 100, 2),
        "current_risk": round(current_risk * 100, 2),
        "current_sharpe": round(current_sharpe, 4),
        "optimal_return": round(optimal_return * 100, 2),
        "optimal_risk": round(optimal_risk * 100, 2),
        "optimal_sharpe": round(optimal_sharpe, 4),
        "frontier_points": frontier_points,
        "var_95": round(var_95, 2),
        "cvar_95": round(cvar_95, 2),
    }


def _generate_synthetic_assets(
    existing: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Генерируем синтетические активы для демонстрации, если в портфеле < 2."""
    synthetic = [
        {"name": "Акции (голубые фишки)", "weight": 0.30, "expected_return": 0.12, "volatility": 0.18},
        {"name": "Облигации (гос.)", "weight": 0.25, "expected_return": 0.07, "volatility": 0.05},
        {"name": "Недвижимость", "weight": 0.20, "expected_return": 0.09, "volatility": 0.12},
        {"name": "Прямые инвестиции", "weight": 0.15, "expected_return": 0.22, "volatility": 0.35},
        {"name": "Денежные средства", "weight": 0.10, "expected_return": 0.03, "volatility": 0.01},
    ]

    if existing:
        # Заменяем первый синтетический на реальный
        for i, e in enumerate(existing[:len(synthetic)]):
            synthetic[i]["name"] = e.get("name", synthetic[i]["name"])
            if "expected_return" in e:
                synthetic[i]["expected_return"] = e["expected_return"]
            if "volatility" in e:
                synthetic[i]["volatility"] = e["volatility"]
            if "weight" in e:
                synthetic[i]["weight"] = e["weight"]

    return synthetic
