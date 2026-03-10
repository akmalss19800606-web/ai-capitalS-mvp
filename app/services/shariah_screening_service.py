"""
Шариат-скрининг инвестиций — автоматизированная фильтрация активов
на соответствие шариатским критериям.

Функционал:
  - Проверка отраслевых запретов (харам-индустрии)
  - Финансовые пороги AAOIFI: долг/активы < 33%, запрещённый доход < 5%
  - Интеграция с индексами DJIM и S&P Shariah
  - Комплексный скрининг портфеля с рекомендациями
  - Поддержка узбекских компаний (UZSE эмитенты)
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


# ─── Константы шариатского скрининга ──────────────────────────────────────────

class ComplianceStatus(str, Enum):
    COMPLIANT = "compliant"           # Халяль — полностью соответствует
    NON_COMPLIANT = "non_compliant"   # Харам — не соответствует
    DOUBTFUL = "doubtful"             # Сомнительный — требует ревизии шариатского совета
    NOT_SCREENED = "not_screened"     # Не проверено


# Запрещённые отрасли (харам) по стандартам AAOIFI и DJIM
HARAM_INDUSTRIES = {
    "alcohol": {
        "name_ru": "Алкоголь",
        "name_en": "Alcohol",
        "description": "Производство, дистрибуция и продажа алкогольной продукции",
        "keywords": ["алкоголь", "водка", "пиво", "вино", "спиртные", "alcohol", "beer", "wine", "spirits", "liquor"],
    },
    "gambling": {
        "name_ru": "Азартные игры",
        "name_en": "Gambling",
        "description": "Казино, лотереи, букмекерство, онлайн-гемблинг",
        "keywords": ["казино", "лотерея", "букмекер", "ставки", "gambling", "casino", "lottery", "betting"],
    },
    "pork": {
        "name_ru": "Свинина",
        "name_en": "Pork",
        "description": "Производство и переработка свинины и продуктов из неё",
        "keywords": ["свинина", "свиноводство", "pork", "swine", "pig"],
    },
    "tobacco": {
        "name_ru": "Табак",
        "name_en": "Tobacco",
        "description": "Производство и продажа табачной продукции",
        "keywords": ["табак", "сигареты", "tobacco", "cigarettes"],
    },
    "weapons": {
        "name_ru": "Вооружение",
        "name_en": "Weapons & Defense",
        "description": "Производство оружия массового уничтожения",
        "keywords": ["оружие", "боеприпасы", "weapons", "arms", "ammunition", "military"],
    },
    "conventional_banking": {
        "name_ru": "Конвенциональные банки",
        "name_en": "Conventional Banking",
        "description": "Банки с процентными ставками (риба)",
        "keywords": ["процентный", "риба", "interest-based", "conventional bank"],
    },
    "adult_entertainment": {
        "name_ru": "Развлечения для взрослых",
        "name_en": "Adult Entertainment",
        "description": "Порнография и связанные индустрии",
        "keywords": ["порнография", "adult entertainment", "pornography"],
    },
    "insurance_conventional": {
        "name_ru": "Конвенциональное страхование",
        "name_en": "Conventional Insurance",
        "description": "Страхование с элементами гарар (неопределённости)",
        "keywords": ["страхование обычное", "conventional insurance"],
    },
}

# Финансовые пороги по стандартам AAOIFI
AAOIFI_THRESHOLDS = {
    "debt_to_assets": {
        "max": 0.33,
        "name_ru": "Долг / Активы",
        "name_en": "Debt to Total Assets",
        "description": "Общий долг не должен превышать 33% от общих активов",
        "standard": "AAOIFI Shariah Standard No. 21",
    },
    "haram_income_ratio": {
        "max": 0.05,
        "name_ru": "Запрещённый доход",
        "name_en": "Non-Permissible Income Ratio",
        "description": "Доход от запрещённой деятельности не должен превышать 5% от общего дохода",
        "standard": "AAOIFI Shariah Standard No. 21",
    },
    "interest_bearing_securities": {
        "max": 0.33,
        "name_ru": "Процентные ценные бумаги / Активы",
        "name_en": "Interest-Bearing Securities to Total Assets",
        "description": "Процентные ценные бумаги не должны превышать 33% от общих активов",
        "standard": "DJIM Methodology",
    },
    "cash_and_interest_bearing": {
        "max": 0.33,
        "name_ru": "Денежные средства + процентные / Активы",
        "name_en": "Cash + Interest-Bearing to Total Assets",
        "description": "Сумма денежных средств и процентных активов < 33%",
        "standard": "S&P Shariah Index Methodology",
    },
    "receivables_to_assets": {
        "max": 0.49,
        "name_ru": "Дебиторская задолженность / Активы",
        "name_en": "Receivables to Total Assets",
        "description": "Дебиторская задолженность не должна превышать 49% от общих активов",
        "standard": "DJIM Methodology",
    },
}

# Шариатские индексы
SHARIAH_INDICES = {
    "DJIM": {
        "name": "Dow Jones Islamic Market Index",
        "provider": "S&P Dow Jones Indices",
        "methodology_url": "https://www.spglobal.com/spdji/en/index-family/shariah/",
        "description": "Крупнейший шариатский индекс, более 2400 компаний в 60+ странах",
    },
    "SP_SHARIAH": {
        "name": "S&P Shariah Index Series",
        "provider": "S&P Global",
        "methodology_url": "https://www.spglobal.com/spdji/en/index-family/shariah/",
        "description": "Серия шариатских индексов от S&P для различных регионов",
    },
    "FTSE_SHARIAH": {
        "name": "FTSE Shariah Index Series",
        "provider": "FTSE Russell",
        "methodology_url": "https://www.ftserussell.com/products/indices/shariah",
        "description": "Шариатские индексы FTSE, используемые в Юго-Восточной Азии",
    },
    "MSCI_ISLAMIC": {
        "name": "MSCI Islamic Index Series",
        "provider": "MSCI Inc.",
        "methodology_url": "https://www.msci.com/islamic-indexes",
        "description": "Индексы MSCI с шариатским скринингом по методологии MSCI",
    },
}


# ─── Скрининг отдельного актива ───────────────────────────────────────────────

def screen_asset_industry(
    company_name: str,
    industry: str = "",
    description: str = "",
    activities: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Проверка компании по отраслевым критериям (харам-индустрии).

    Args:
        company_name: Название компании.
        industry: Отрасль / сектор.
        description: Описание деятельности.
        activities: Список видов деятельности.

    Returns:
        Результат скрининга с деталями по каждому критерию.
    """
    combined_text = f"{company_name} {industry} {description} {' '.join(activities or [])}".lower()

    violations = []
    warnings = []

    for category_id, category in HARAM_INDUSTRIES.items():
        matched_keywords = [kw for kw in category["keywords"] if kw.lower() in combined_text]
        if matched_keywords:
            violations.append({
                "category_id": category_id,
                "category_name_ru": category["name_ru"],
                "category_name_en": category["name_en"],
                "description": category["description"],
                "matched_keywords": matched_keywords,
                "severity": "critical",
            })

    status = ComplianceStatus.COMPLIANT if not violations else ComplianceStatus.NON_COMPLIANT

    return {
        "company_name": company_name,
        "screening_type": "industry",
        "status": status.value,
        "violations_count": len(violations),
        "violations": violations,
        "warnings": warnings,
        "screened_at": datetime.now().isoformat(),
    }


def screen_asset_financials(
    company_name: str,
    total_assets: float,
    total_debt: float,
    total_revenue: float,
    haram_revenue: float = 0.0,
    interest_bearing_securities: float = 0.0,
    cash_and_interest: float = 0.0,
    receivables: float = 0.0,
) -> Dict[str, Any]:
    """
    Финансовый скрининг по пороговым значениям AAOIFI / DJIM / S&P Shariah.

    Args:
        company_name: Название компании.
        total_assets: Общие активы.
        total_debt: Общий долг.
        total_revenue: Общий доход.
        haram_revenue: Доход от запрещённой деятельности.
        interest_bearing_securities: Процентные ценные бумаги.
        cash_and_interest: Денежные средства + процентные.
        receivables: Дебиторская задолженность.

    Returns:
        Результат финансового скрининга.
    """
    if total_assets <= 0:
        return {
            "company_name": company_name,
            "screening_type": "financial",
            "status": ComplianceStatus.NOT_SCREENED.value,
            "error": "Общие активы должны быть > 0",
            "screened_at": datetime.now().isoformat(),
        }

    checks = []
    violations = []

    # 1. Долг / Активы < 33%
    debt_ratio = total_debt / total_assets
    debt_check = {
        "criterion": "debt_to_assets",
        "name_ru": AAOIFI_THRESHOLDS["debt_to_assets"]["name_ru"],
        "value": round(debt_ratio, 4),
        "threshold": AAOIFI_THRESHOLDS["debt_to_assets"]["max"],
        "passed": debt_ratio < AAOIFI_THRESHOLDS["debt_to_assets"]["max"],
        "standard": AAOIFI_THRESHOLDS["debt_to_assets"]["standard"],
        "display": f"{debt_ratio*100:.1f}% (макс. {AAOIFI_THRESHOLDS['debt_to_assets']['max']*100:.0f}%)",
    }
    checks.append(debt_check)
    if not debt_check["passed"]:
        violations.append(debt_check)

    # 2. Запрещённый доход < 5%
    if total_revenue > 0:
        haram_ratio = haram_revenue / total_revenue
    else:
        haram_ratio = 0.0
    haram_check = {
        "criterion": "haram_income_ratio",
        "name_ru": AAOIFI_THRESHOLDS["haram_income_ratio"]["name_ru"],
        "value": round(haram_ratio, 4),
        "threshold": AAOIFI_THRESHOLDS["haram_income_ratio"]["max"],
        "passed": haram_ratio < AAOIFI_THRESHOLDS["haram_income_ratio"]["max"],
        "standard": AAOIFI_THRESHOLDS["haram_income_ratio"]["standard"],
        "display": f"{haram_ratio*100:.1f}% (макс. {AAOIFI_THRESHOLDS['haram_income_ratio']['max']*100:.0f}%)",
    }
    checks.append(haram_check)
    if not haram_check["passed"]:
        violations.append(haram_check)

    # 3. Процентные ценные бумаги / Активы < 33%
    if interest_bearing_securities > 0:
        ibs_ratio = interest_bearing_securities / total_assets
        ibs_check = {
            "criterion": "interest_bearing_securities",
            "name_ru": AAOIFI_THRESHOLDS["interest_bearing_securities"]["name_ru"],
            "value": round(ibs_ratio, 4),
            "threshold": AAOIFI_THRESHOLDS["interest_bearing_securities"]["max"],
            "passed": ibs_ratio < AAOIFI_THRESHOLDS["interest_bearing_securities"]["max"],
            "standard": AAOIFI_THRESHOLDS["interest_bearing_securities"]["standard"],
            "display": f"{ibs_ratio*100:.1f}% (макс. 33%)",
        }
        checks.append(ibs_check)
        if not ibs_check["passed"]:
            violations.append(ibs_check)

    # 4. Денежные + процентные / Активы < 33%
    if cash_and_interest > 0:
        cai_ratio = cash_and_interest / total_assets
        cai_check = {
            "criterion": "cash_and_interest_bearing",
            "name_ru": AAOIFI_THRESHOLDS["cash_and_interest_bearing"]["name_ru"],
            "value": round(cai_ratio, 4),
            "threshold": AAOIFI_THRESHOLDS["cash_and_interest_bearing"]["max"],
            "passed": cai_ratio < AAOIFI_THRESHOLDS["cash_and_interest_bearing"]["max"],
            "standard": AAOIFI_THRESHOLDS["cash_and_interest_bearing"]["standard"],
            "display": f"{cai_ratio*100:.1f}% (макс. 33%)",
        }
        checks.append(cai_check)
        if not cai_check["passed"]:
            violations.append(cai_check)

    # 5. Дебиторская задолженность / Активы < 49%
    if receivables > 0:
        rec_ratio = receivables / total_assets
        rec_check = {
            "criterion": "receivables_to_assets",
            "name_ru": AAOIFI_THRESHOLDS["receivables_to_assets"]["name_ru"],
            "value": round(rec_ratio, 4),
            "threshold": AAOIFI_THRESHOLDS["receivables_to_assets"]["max"],
            "passed": rec_ratio < AAOIFI_THRESHOLDS["receivables_to_assets"]["max"],
            "standard": AAOIFI_THRESHOLDS["receivables_to_assets"]["standard"],
            "display": f"{rec_ratio*100:.1f}% (макс. 49%)",
        }
        checks.append(rec_check)
        if not rec_check["passed"]:
            violations.append(rec_check)

    # Определяем статус
    if violations:
        status = ComplianceStatus.NON_COMPLIANT
    elif any(c["value"] > c["threshold"] * 0.8 for c in checks):
        status = ComplianceStatus.DOUBTFUL  # Близко к порогу — сомнительный
    else:
        status = ComplianceStatus.COMPLIANT

    return {
        "company_name": company_name,
        "screening_type": "financial",
        "status": status.value,
        "checks_count": len(checks),
        "violations_count": len(violations),
        "checks": checks,
        "violations": violations,
        "screened_at": datetime.now().isoformat(),
    }


def screen_asset_full(
    company_name: str,
    industry: str = "",
    description: str = "",
    activities: Optional[List[str]] = None,
    total_assets: float = 0.0,
    total_debt: float = 0.0,
    total_revenue: float = 0.0,
    haram_revenue: float = 0.0,
    interest_bearing_securities: float = 0.0,
    cash_and_interest: float = 0.0,
    receivables: float = 0.0,
) -> Dict[str, Any]:
    """
    Полный шариатский скрининг — отраслевой + финансовый.

    Returns:
        Комплексный результат скрининга с рекомендациями.
    """
    industry_result = screen_asset_industry(
        company_name=company_name,
        industry=industry,
        description=description,
        activities=activities,
    )

    financial_result = None
    if total_assets > 0:
        financial_result = screen_asset_financials(
            company_name=company_name,
            total_assets=total_assets,
            total_debt=total_debt,
            total_revenue=total_revenue,
            haram_revenue=haram_revenue,
            interest_bearing_securities=interest_bearing_securities,
            cash_and_interest=cash_and_interest,
            receivables=receivables,
        )

    # Итоговый статус — наихудший из двух
    statuses = [industry_result["status"]]
    if financial_result:
        statuses.append(financial_result["status"])

    if ComplianceStatus.NON_COMPLIANT.value in statuses:
        overall_status = ComplianceStatus.NON_COMPLIANT
    elif ComplianceStatus.DOUBTFUL.value in statuses:
        overall_status = ComplianceStatus.DOUBTFUL
    elif ComplianceStatus.NOT_SCREENED.value in statuses:
        overall_status = ComplianceStatus.NOT_SCREENED
    else:
        overall_status = ComplianceStatus.COMPLIANT

    # Рекомендации
    recommendations = []
    if overall_status == ComplianceStatus.COMPLIANT:
        recommendations.append("Актив соответствует шариатским критериям. Можно включить в портфель.")
    elif overall_status == ComplianceStatus.DOUBTFUL:
        recommendations.append("Актив находится на границе допустимых значений.")
        recommendations.append("Рекомендуется пересмотр шариатским советом.")
        recommendations.append("Проведите дополнительный анализ финансовой отчётности.")
    elif overall_status == ComplianceStatus.NON_COMPLIANT:
        recommendations.append("Актив НЕ соответствует шариатским критериям.")
        recommendations.append("Рекомендуется исключить из портфеля или заменить альтернативой.")
        if industry_result["violations"]:
            recommendations.append("Обнаружена деятельность в запрещённой отрасли (харам).")
        if financial_result and financial_result.get("violations"):
            recommendations.append("Финансовые показатели превышают допустимые пороги AAOIFI.")

    return {
        "company_name": company_name,
        "overall_status": overall_status.value,
        "industry_screening": industry_result,
        "financial_screening": financial_result,
        "recommendations": recommendations,
        "methodology": "AAOIFI Shariah Standard No. 21 + DJIM + S&P Shariah",
        "screened_at": datetime.now().isoformat(),
    }


# ─── Скрининг портфеля ───────────────────────────────────────────────────────

def screen_portfolio(assets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Комплексный шариатский скрининг портфеля.

    Args:
        assets: Список активов с параметрами для скрининга.
            Каждый актив: {name, industry, total_assets, total_debt, ...}

    Returns:
        Результат скрининга портфеля с агрегированной статистикой.
    """
    results = []
    compliant_count = 0
    non_compliant_count = 0
    doubtful_count = 0

    for asset in assets:
        result = screen_asset_full(
            company_name=asset.get("name", "Unknown"),
            industry=asset.get("industry", ""),
            description=asset.get("description", ""),
            activities=asset.get("activities"),
            total_assets=asset.get("total_assets", 0),
            total_debt=asset.get("total_debt", 0),
            total_revenue=asset.get("total_revenue", 0),
            haram_revenue=asset.get("haram_revenue", 0),
            interest_bearing_securities=asset.get("interest_bearing_securities", 0),
            cash_and_interest=asset.get("cash_and_interest", 0),
            receivables=asset.get("receivables", 0),
        )
        results.append(result)

        if result["overall_status"] == ComplianceStatus.COMPLIANT.value:
            compliant_count += 1
        elif result["overall_status"] == ComplianceStatus.NON_COMPLIANT.value:
            non_compliant_count += 1
        elif result["overall_status"] == ComplianceStatus.DOUBTFUL.value:
            doubtful_count += 1

    total = len(assets)
    compliance_ratio = compliant_count / total if total > 0 else 0

    # Статус портфеля
    if non_compliant_count > 0:
        portfolio_status = "requires_attention"
        portfolio_recommendation = (
            f"Портфель содержит {non_compliant_count} несоответствующих активов. "
            "Рекомендуется заменить их на халяль-альтернативы."
        )
    elif doubtful_count > 0:
        portfolio_status = "review_recommended"
        portfolio_recommendation = (
            f"{doubtful_count} активов требуют дополнительной проверки шариатским советом."
        )
    else:
        portfolio_status = "fully_compliant"
        portfolio_recommendation = "Портфель полностью соответствует шариатским критериям."

    return {
        "portfolio_status": portfolio_status,
        "portfolio_recommendation": portfolio_recommendation,
        "total_assets": total,
        "compliant": compliant_count,
        "non_compliant": non_compliant_count,
        "doubtful": doubtful_count,
        "compliance_ratio": round(compliance_ratio, 4),
        "compliance_percentage": f"{compliance_ratio * 100:.1f}%",
        "asset_results": results,
        "methodology": "AAOIFI + DJIM + S&P Shariah",
        "screened_at": datetime.now().isoformat(),
    }


# ─── Справочная информация ───────────────────────────────────────────────────

def get_haram_industries() -> List[Dict[str, Any]]:
    """Список запрещённых отраслей."""
    return [
        {
            "id": k,
            "name_ru": v["name_ru"],
            "name_en": v["name_en"],
            "description": v["description"],
        }
        for k, v in HARAM_INDUSTRIES.items()
    ]


def get_financial_thresholds() -> List[Dict[str, Any]]:
    """Список финансовых пороговых значений."""
    return [
        {
            "id": k,
            "name_ru": v["name_ru"],
            "name_en": v["name_en"],
            "max_value": v["max"],
            "max_percentage": f"{v['max']*100:.0f}%",
            "description": v["description"],
            "standard": v["standard"],
        }
        for k, v in AAOIFI_THRESHOLDS.items()
    ]


def get_shariah_indices() -> List[Dict[str, Any]]:
    """Список шариатских индексов."""
    return [
        {
            "id": k,
            "name": v["name"],
            "provider": v["provider"],
            "methodology_url": v["methodology_url"],
            "description": v["description"],
        }
        for k, v in SHARIAH_INDICES.items()
    ]
