"""
Сервис вычислений: Due Diligence Scoring.
Фаза 2, Сессия 3.

Реализация:
  - Скоринг по 6 категориям (финансы, юридические, операционные, рыночные, управление, ESG)
  - Автогенерация чеклиста из 30+ пунктов
  - Бенчмарки по отрасли и географии
  - Детекция красных флагов
  - Генерация рекомендаций
"""
import math
import random
from typing import Dict, Any, List, Optional


# ═══════════════════════════════════════════════════════════════
# ОТРАСЛЕВЫЕ БЕНЧМАРКИ
# ═══════════════════════════════════════════════════════════════

INDUSTRY_BENCHMARKS: Dict[str, Dict[str, float]] = {
    "Оптовая торговля продовольствием": {"financial": 62, "legal": 55, "operational": 60, "market": 65, "management": 58, "esg": 50},
    "Строительство и недвижимость": {"financial": 58, "legal": 50, "operational": 55, "market": 60, "management": 55, "esg": 45},
    "Производство и переработка": {"financial": 65, "legal": 60, "operational": 62, "market": 58, "management": 60, "esg": 55},
    "Транспорт и логистика": {"financial": 60, "legal": 58, "operational": 65, "market": 62, "management": 57, "esg": 48},
    "IT и технологии": {"financial": 70, "legal": 65, "operational": 72, "market": 75, "management": 68, "esg": 60},
    "Сельское хозяйство": {"financial": 55, "legal": 52, "operational": 58, "market": 60, "management": 53, "esg": 62},
    "Финансы и банкинг": {"financial": 72, "legal": 70, "operational": 68, "market": 65, "management": 70, "esg": 58},
    "Розничная торговля": {"financial": 60, "legal": 55, "operational": 62, "market": 68, "management": 58, "esg": 52},
    "Туризм и гостиничный бизнес": {"financial": 55, "legal": 52, "operational": 60, "market": 58, "management": 55, "esg": 55},
    "Образование": {"financial": 50, "legal": 60, "operational": 58, "market": 52, "management": 55, "esg": 65},
}

DEFAULT_BENCHMARK = {"financial": 60, "legal": 58, "operational": 60, "market": 62, "management": 58, "esg": 52}

GEOGRAPHY_MODIFIER: Dict[str, float] = {
    "Узбекистан": 1.0,
    "Казахстан": 1.02,
    "Кыргызстан": 0.95,
    "Таджикистан": 0.92,
    "Туркменистан": 0.88,
    "Россия": 0.90,
    "Турция": 1.05,
    "ОАЭ": 1.12,
    "Сингапур": 1.15,
    "США": 1.10,
}


# ═══════════════════════════════════════════════════════════════
# ЧЕКЛИСТ-ШАБЛОН
# ═══════════════════════════════════════════════════════════════

DD_CHECKLIST_TEMPLATE: List[Dict[str, str]] = [
    # Финансы
    {"id": "fin_01", "category": "Финансы", "item": "Аудированная финансовая отчётность за 3 года", "priority": "critical"},
    {"id": "fin_02", "category": "Финансы", "item": "Анализ движения денежных средств (cash flow)", "priority": "critical"},
    {"id": "fin_03", "category": "Финансы", "item": "Проверка кредиторской/дебиторской задолженности", "priority": "high"},
    {"id": "fin_04", "category": "Финансы", "item": "Налоговая история и отсутствие задолженностей", "priority": "high"},
    {"id": "fin_05", "category": "Финансы", "item": "Оценка активов и обязательств (balance sheet)", "priority": "high"},
    # Юридические
    {"id": "leg_01", "category": "Юридические", "item": "Проверка регистрационных документов", "priority": "critical"},
    {"id": "leg_02", "category": "Юридические", "item": "Анализ действующих контрактов и обязательств", "priority": "high"},
    {"id": "leg_03", "category": "Юридические", "item": "Проверка судебных споров и исков", "priority": "critical"},
    {"id": "leg_04", "category": "Юридические", "item": "Лицензии и разрешения (актуальность)", "priority": "high"},
    {"id": "leg_05", "category": "Юридические", "item": "Проверка интеллектуальной собственности", "priority": "medium"},
    # Операционные
    {"id": "ops_01", "category": "Операционные", "item": "Оценка бизнес-модели и unit-экономики", "priority": "critical"},
    {"id": "ops_02", "category": "Операционные", "item": "Проверка цепочки поставок", "priority": "high"},
    {"id": "ops_03", "category": "Операционные", "item": "Оценка технологической инфраструктуры", "priority": "medium"},
    {"id": "ops_04", "category": "Операционные", "item": "Анализ операционных рисков", "priority": "high"},
    {"id": "ops_05", "category": "Операционные", "item": "Проверка страхового покрытия", "priority": "medium"},
    # Рыночные
    {"id": "mkt_01", "category": "Рыночные", "item": "Анализ размера и динамики рынка (TAM/SAM/SOM)", "priority": "high"},
    {"id": "mkt_02", "category": "Рыночные", "item": "Конкурентный анализ (5 сил Портера)", "priority": "high"},
    {"id": "mkt_03", "category": "Рыночные", "item": "Проверка клиентской базы и концентрации", "priority": "high"},
    {"id": "mkt_04", "category": "Рыночные", "item": "Оценка барьеров входа и конкурентных преимуществ", "priority": "medium"},
    {"id": "mkt_05", "category": "Рыночные", "item": "Регуляторные риски и compliance", "priority": "high"},
    # Управление
    {"id": "mgm_01", "category": "Управление", "item": "Оценка команды менеджмента (опыт, track record)", "priority": "critical"},
    {"id": "mgm_02", "category": "Управление", "item": "Структура корпоративного управления", "priority": "high"},
    {"id": "mgm_03", "category": "Управление", "item": "Наличие независимых директоров", "priority": "medium"},
    {"id": "mgm_04", "category": "Управление", "item": "Проверка конфликтов интересов", "priority": "high"},
    {"id": "mgm_05", "category": "Управление", "item": "Планы преемственности и удержания ключевых кадров", "priority": "medium"},
    # ESG
    {"id": "esg_01", "category": "ESG", "item": "Экологическая политика и соответствие нормам", "priority": "medium"},
    {"id": "esg_02", "category": "ESG", "item": "Социальная ответственность и условия труда", "priority": "medium"},
    {"id": "esg_03", "category": "ESG", "item": "Антикоррупционная политика и этические стандарты", "priority": "high"},
    {"id": "esg_04", "category": "ESG", "item": "Прозрачность отчётности и раскрытие информации", "priority": "high"},
    {"id": "esg_05", "category": "ESG", "item": "Участие в устойчивом развитии (SDG)", "priority": "low"},
]


# ═══════════════════════════════════════════════════════════════
# ОСНОВНОЙ СКОРИНГ
# ═══════════════════════════════════════════════════════════════

def run_dd_scoring(
    company_name: str,
    industry: Optional[str] = None,
    geography: str = "Узбекистан",
    revenue_mln: Optional[float] = None,
    profit_margin_pct: Optional[float] = None,
    debt_to_equity: Optional[float] = None,
    years_in_business: Optional[int] = None,
    employee_count: Optional[int] = None,
    # E3-02: Расширенные поля
    director_name: Optional[str] = None,
    legal_form: Optional[str] = None,
    authorized_capital: Optional[float] = None,
    founded_year: Optional[int] = None,
    licenses_info: Optional[str] = None,
    servicing_bank: Optional[str] = None,
    key_counterparties: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Автоматический DD-скоринг компании.

    Генерирует:
    - Скоры по 6 категориям (0-100)
    - Общий скоринг с весами
    - Детализация по подкатегориям
    - Чеклист из 30 пунктов
    - Бенчмарки по отрасли
    - Красные флаги
    - Рекомендацию
    """
    # Базовый скоринг по hash компании (детерминистический)
    seed = abs(hash(company_name + (industry or "") + geography)) % 10000
    rng = random.Random(seed)

    # Генерируем базовые скоры
    base_scores = _generate_base_scores(
        rng, revenue_mln, profit_margin_pct, debt_to_equity,
        years_in_business, employee_count,
        licenses_info=licenses_info, founded_year=founded_year,
    )

    # Модификация по географии
    geo_mod = GEOGRAPHY_MODIFIER.get(geography, 1.0)
    for k in base_scores:
        base_scores[k] = min(100, base_scores[k] * geo_mod)

    # Категорийные скоры
    financial = round(base_scores["financial"], 1)
    legal = round(base_scores["legal"], 1)
    operational = round(base_scores["operational"], 1)
    market = round(base_scores["market"], 1)
    management = round(base_scores["management"], 1)
    esg = round(base_scores["esg"], 1)

    # Веса категорий
    weights = {"financial": 0.25, "legal": 0.20, "operational": 0.15, "market": 0.15, "management": 0.15, "esg": 0.10}
    total = (
        financial * weights["financial"] +
        legal * weights["legal"] +
        operational * weights["operational"] +
        market * weights["market"] +
        management * weights["management"] +
        esg * weights["esg"]
    )
    total = round(total, 1)

    # Risk level
    risk_level = _risk_level(total)

    # Детализация по подкатегориям
    category_details = _generate_category_details(rng, financial, legal, operational, market, management, esg)

    # Чеклист
    checklist = _generate_checklist(rng)

    # Считаем completion
    completed = sum(1 for c in checklist if c["status"] in ("passed", "failed", "na"))
    checklist_pct = round(completed / len(checklist) * 100, 1) if checklist else 0

    # Бенчмарки
    benchmarks = _compute_benchmarks(
        industry, financial, legal, operational, market, management, esg, total
    )

    # Красные флаги
    red_flags = _detect_red_flags(
        rng, financial, legal, operational, market, management, esg,
        debt_to_equity, years_in_business
    )

    # Рекомендация
    recommendation = _generate_recommendation(total, risk_level, red_flags, company_name)

    return {
        "company_name": company_name,
        "industry": industry,
        "geography": geography,
        "total_score": total,
        "risk_level": risk_level,
        "financial_score": financial,
        "legal_score": legal,
        "operational_score": operational,
        "market_score": market,
        "management_score": management,
        "esg_score": esg,
        "category_details": category_details,
        "checklist": checklist,
        "checklist_completion_pct": checklist_pct,
        "benchmarks": benchmarks,
        "red_flags": red_flags,
        "recommendation": recommendation,
        # E3-02: Расширенные поля
        "director_name": director_name,
        "legal_form": legal_form,
        "authorized_capital": authorized_capital,
        "founded_year": founded_year,
        "licenses_info": licenses_info,
        "servicing_bank": servicing_bank,
        "key_counterparties": key_counterparties,
    }


# ═══════════════════════════════════════════════════════════════
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ═══════════════════════════════════════════════════════════════

def _generate_base_scores(
    rng: random.Random,
    revenue_mln: Optional[float],
    profit_margin_pct: Optional[float],
    debt_to_equity: Optional[float],
    years_in_business: Optional[int],
    employee_count: Optional[int],
    # E3-02: Расширенные поля для скоринга
    licenses_info: Optional[str] = None,
    founded_year: Optional[int] = None,
) -> Dict[str, float]:
    """Генерация базовых скоров с учётом финансовых показателей."""
    scores = {
        "financial": rng.uniform(45, 85),
        "legal": rng.uniform(40, 80),
        "operational": rng.uniform(45, 82),
        "market": rng.uniform(48, 85),
        "management": rng.uniform(42, 80),
        "esg": rng.uniform(35, 75),
    }

    # Корректировка по предоставленным данным
    if revenue_mln is not None:
        if revenue_mln > 100:
            scores["financial"] = min(100, scores["financial"] + 8)
            scores["market"] = min(100, scores["market"] + 5)
        elif revenue_mln < 5:
            scores["financial"] = max(10, scores["financial"] - 10)

    if profit_margin_pct is not None:
        if profit_margin_pct > 20:
            scores["financial"] = min(100, scores["financial"] + 10)
        elif profit_margin_pct < 0:
            scores["financial"] = max(10, scores["financial"] - 15)

    if debt_to_equity is not None:
        if debt_to_equity > 3.0:
            scores["financial"] = max(10, scores["financial"] - 15)
        elif debt_to_equity < 0.5:
            scores["financial"] = min(100, scores["financial"] + 5)

    if years_in_business is not None:
        if years_in_business > 10:
            scores["management"] = min(100, scores["management"] + 8)
            scores["operational"] = min(100, scores["operational"] + 5)
        elif years_in_business < 2:
            scores["management"] = max(10, scores["management"] - 12)
            scores["operational"] = max(10, scores["operational"] - 8)

    if employee_count is not None:
        if employee_count > 500:
            scores["operational"] = min(100, scores["operational"] + 6)
        elif employee_count < 10:
            scores["operational"] = max(10, scores["operational"] - 8)

    # E3-02: Наличие лицензий +5 к legal
    if licenses_info and licenses_info.strip():
        scores["legal"] = min(100, scores["legal"] + 5)

    # E3-02: Длительный стаж (>10 лет по году основания) +3 к management
    import datetime
    if founded_year is not None:
        company_age = datetime.date.today().year - founded_year
        if company_age > 10:
            scores["management"] = min(100, scores["management"] + 3)

    return scores


def _risk_level(total: float) -> str:
    if total >= 75:
        return "low"
    elif total >= 55:
        return "medium"
    elif total >= 35:
        return "high"
    return "critical"


def _generate_category_details(
    rng: random.Random,
    financial: float, legal: float, operational: float,
    market: float, management: float, esg: float,
) -> List[Dict[str, Any]]:
    """Подробная детализация по подкатегориям."""
    details = []

    # Финансы
    subs_fin = [
        ("Финансовая устойчивость", 0.30, "Анализ ликвидности и платёжеспособности"),
        ("Прибыльность", 0.25, "Маржинальность и динамика прибыли"),
        ("Денежный поток", 0.25, "Операционный и свободный cash flow"),
        ("Структура капитала", 0.20, "Долговая нагрузка и leverage"),
    ]
    for name, w, desc in subs_fin:
        sc = max(10, min(100, financial + rng.uniform(-12, 12)))
        details.append({
            "category": "Финансы", "subcategory": name,
            "score": round(sc, 1), "weight": w,
            "findings": desc,
            "recommendation": _sub_recommendation("Финансы", sc),
        })

    # Юридические
    subs_leg = [
        ("Корпоративное право", 0.30, "Регистрация, устав, акционерное соглашение"),
        ("Судебные риски", 0.30, "Текущие и потенциальные судебные разбирательства"),
        ("Лицензии и разрешения", 0.20, "Актуальность регуляторных документов"),
        ("Контрактные обязательства", 0.20, "Ключевые контракты и их условия"),
    ]
    for name, w, desc in subs_leg:
        sc = max(10, min(100, legal + rng.uniform(-12, 12)))
        details.append({
            "category": "Юридические", "subcategory": name,
            "score": round(sc, 1), "weight": w,
            "findings": desc,
            "recommendation": _sub_recommendation("Юридические", sc),
        })

    # Операционные
    subs_ops = [
        ("Бизнес-модель", 0.30, "Unit-экономика и масштабируемость"),
        ("Процессы и технологии", 0.25, "Автоматизация и IT-инфраструктура"),
        ("Цепочка поставок", 0.25, "Зависимость от поставщиков и логистика"),
        ("Риск-менеджмент", 0.20, "Страхование и BCP"),
    ]
    for name, w, desc in subs_ops:
        sc = max(10, min(100, operational + rng.uniform(-12, 12)))
        details.append({
            "category": "Операционные", "subcategory": name,
            "score": round(sc, 1), "weight": w,
            "findings": desc,
            "recommendation": _sub_recommendation("Операционные", sc),
        })

    # Рыночные
    subs_mkt = [
        ("Размер и динамика рынка", 0.30, "TAM/SAM/SOM и CAGR"),
        ("Конкуренция", 0.25, "Позиция на рынке, доля, барьеры"),
        ("Клиентская база", 0.25, "Концентрация и retention"),
        ("Регуляторная среда", 0.20, "Государственное регулирование отрасли"),
    ]
    for name, w, desc in subs_mkt:
        sc = max(10, min(100, market + rng.uniform(-12, 12)))
        details.append({
            "category": "Рыночные", "subcategory": name,
            "score": round(sc, 1), "weight": w,
            "findings": desc,
            "recommendation": _sub_recommendation("Рыночные", sc),
        })

    # Управление
    subs_mgm = [
        ("Команда менеджмента", 0.35, "Опыт, track record, квалификация"),
        ("Корпоративное управление", 0.25, "Совет директоров, прозрачность"),
        ("Организационная структура", 0.20, "Эффективность и масштабируемость"),
        ("HR и культура", 0.20, "Удержание кадров, корпоративная культура"),
    ]
    for name, w, desc in subs_mgm:
        sc = max(10, min(100, management + rng.uniform(-12, 12)))
        details.append({
            "category": "Управление", "subcategory": name,
            "score": round(sc, 1), "weight": w,
            "findings": desc,
            "recommendation": _sub_recommendation("Управление", sc),
        })

    # ESG
    subs_esg = [
        ("Экология (E)", 0.35, "Воздействие на окружающую среду"),
        ("Социальная ответственность (S)", 0.35, "Условия труда, community impact"),
        ("Управление (G)", 0.30, "Этика, антикоррупция, прозрачность"),
    ]
    for name, w, desc in subs_esg:
        sc = max(10, min(100, esg + rng.uniform(-12, 12)))
        details.append({
            "category": "ESG", "subcategory": name,
            "score": round(sc, 1), "weight": w,
            "findings": desc,
            "recommendation": _sub_recommendation("ESG", sc),
        })

    return details


def _sub_recommendation(category: str, score: float) -> str:
    if score >= 80:
        return "Отличные показатели. Мониторинг в стандартном режиме."
    elif score >= 60:
        return "Приемлемый уровень. Рекомендуется дополнительная проверка деталей."
    elif score >= 40:
        return "Выявлены риски. Необходима углублённая проверка и план митигации."
    return "Критический уровень. Требуется немедленное внимание и corrective actions."


def _generate_checklist(rng: random.Random) -> List[Dict[str, Any]]:
    """Генерация чеклиста на основе шаблона."""
    checklist = []
    for item in DD_CHECKLIST_TEMPLATE:
        # Часть пунктов случайно помечаем как выполненные для демо
        status = rng.choice(["pending", "pending", "pending", "passed", "passed"])
        checklist.append({
            "id": item["id"],
            "category": item["category"],
            "item": item["item"],
            "status": status,
            "priority": item["priority"],
            "note": None,
        })
    return checklist


def _compute_benchmarks(
    industry: Optional[str],
    financial: float, legal: float, operational: float,
    market: float, management: float, esg: float,
    total: float,
) -> List[Dict[str, Any]]:
    """Сравнение с отраслевыми бенчмарками."""
    bench = INDUSTRY_BENCHMARKS.get(industry, DEFAULT_BENCHMARK) if industry else DEFAULT_BENCHMARK

    results = []
    scores_map = {
        "Финансы": (financial, bench["financial"]),
        "Юридические": (legal, bench["legal"]),
        "Операционные": (operational, bench["operational"]),
        "Рыночные": (market, bench["market"]),
        "Управление": (management, bench["management"]),
        "ESG": (esg, bench["esg"]),
    }

    for name, (score, bench_score) in scores_map.items():
        delta = score - bench_score
        # Percentile: грубая оценка по нормальному распределению
        z = delta / 15.0  # std ~15
        percentile = min(99, max(1, round(50 + z * 30, 0)))
        results.append({
            "benchmark_name": f"{name} ({industry or 'Средний рынок'})",
            "benchmark_score": bench_score,
            "delta": round(delta, 1),
            "percentile": percentile,
        })

    # Общий бенчмарк
    avg_bench = sum(bench.values()) / len(bench)
    delta_total = total - avg_bench
    z_total = delta_total / 12.0
    pct_total = min(99, max(1, round(50 + z_total * 30, 0)))
    results.insert(0, {
        "benchmark_name": f"Общий скоринг ({industry or 'Средний рынок'})",
        "benchmark_score": round(avg_bench, 1),
        "delta": round(delta_total, 1),
        "percentile": pct_total,
    })

    return results


def _detect_red_flags(
    rng: random.Random,
    financial: float, legal: float, operational: float,
    market: float, management: float, esg: float,
    debt_to_equity: Optional[float] = None,
    years_in_business: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Обнаружение красных флагов."""
    flags = []

    if financial < 40:
        flags.append({
            "flag": "Слабое финансовое состояние",
            "severity": "critical",
            "description": f"Финансовый скоринг ({financial}) ниже критического порога. Высокий риск неплатёжеспособности.",
        })
    elif financial < 55:
        flags.append({
            "flag": "Финансовые риски",
            "severity": "high",
            "description": f"Финансовый скоринг ({financial}) ниже среднего. Рекомендуется углублённый финансовый аудит.",
        })

    if legal < 45:
        flags.append({
            "flag": "Юридические риски",
            "severity": "critical",
            "description": f"Юридический скоринг ({legal}) критически низкий. Возможны судебные споры или проблемы с лицензиями.",
        })

    if management < 40:
        flags.append({
            "flag": "Слабое управление",
            "severity": "high",
            "description": f"Скоринг управления ({management}) ниже нормы. Рекомендуется оценить key-man risk.",
        })

    if esg < 35:
        flags.append({
            "flag": "ESG-риски",
            "severity": "medium",
            "description": f"ESG-скоринг ({esg}) низкий. Потенциальные репутационные и регуляторные риски.",
        })

    if debt_to_equity is not None and debt_to_equity > 3.0:
        flags.append({
            "flag": "Высокая долговая нагрузка",
            "severity": "critical",
            "description": f"Коэффициент D/E = {debt_to_equity:.1f} значительно превышает норму (< 2.0).",
        })

    if years_in_business is not None and years_in_business < 2:
        flags.append({
            "flag": "Молодая компания",
            "severity": "medium",
            "description": f"Компания работает менее 2 лет ({years_in_business}). Ограниченная история и track record.",
        })

    # Низкий операционный скор — концентрация поставщиков
    if operational < 50:
        flags.append({
            "flag": "Операционная уязвимость",
            "severity": "high",
            "description": f"Операционный скоринг ({operational}) выявляет уязвимости в бизнес-процессах.",
        })

    return flags


def _generate_recommendation(
    total: float,
    risk_level: str,
    red_flags: List[Dict[str, Any]],
    company_name: str,
) -> str:
    """Генерация текстовой рекомендации."""
    critical_flags = [f for f in red_flags if f["severity"] == "critical"]
    high_flags = [f for f in red_flags if f["severity"] == "high"]

    if risk_level == "critical":
        rec = (
            f"РЕКОМЕНДАЦИЯ: Инвестиция в {company_name} несёт КРИТИЧЕСКИЙ уровень риска "
            f"(общий скоринг: {total}/100). Обнаружено {len(critical_flags)} критических и "
            f"{len(high_flags)} высоких красных флагов. "
            "Рекомендуется ОТКАЗ от инвестиции или существенное изменение условий сделки "
            "с обязательным требованием устранения критических рисков."
        )
    elif risk_level == "high":
        rec = (
            f"РЕКОМЕНДАЦИЯ: Инвестиция в {company_name} имеет ПОВЫШЕННЫЙ уровень риска "
            f"(общий скоринг: {total}/100). "
            "Рекомендуется проведение углублённого DD по выявленным проблемным категориям "
            "перед принятием решения. Рассмотрите возможность включения дополнительных "
            "защитных условий (covenants) в инвестиционное соглашение."
        )
    elif risk_level == "medium":
        rec = (
            f"РЕКОМЕНДАЦИЯ: {company_name} имеет УМЕРЕННЫЙ уровень риска "
            f"(общий скоринг: {total}/100). "
            "Компания в целом соответствует инвестиционным критериям. "
            "Рекомендуется завершить чеклист DD и верифицировать отмеченные риски "
            "до финального утверждения."
        )
    else:
        rec = (
            f"РЕКОМЕНДАЦИЯ: {company_name} демонстрирует НИЗКИЙ уровень риска "
            f"(общий скоринг: {total}/100). "
            "Компания прошла автоматический скоринг с хорошими показателями по всем категориям. "
            "Рекомендуется стандартная процедура завершения DD и утверждение инвестиции."
        )

    return rec
