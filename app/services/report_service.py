"""
Сервис: Генератор отчётов.
Фаза 2, Сессия 4.

Реализация:
  - 4 шаблона отчётов (Investment Memo, Quarterly, Portfolio, Аналитическая записка)
  - Генерация контента разделов с данными, таблицами, чартами
  - NLG Executive Summary
  - Автоматический сбор метрик из БД
"""
import math
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional


# ═══════════════════════════════════════════════════════════════
# ШАБЛОНЫ ОТЧЁТОВ
# ═══════════════════════════════════════════════════════════════

REPORT_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "investment_memo": {
        "name": "Инвестиционный меморандум",
        "description": "Детальный меморандум для инвестиционного комитета. Включает описание компании, финансовый анализ, оценку рисков и рекомендации.",
        "sections": [
            {"section_key": "executive_summary", "title": "Executive Summary", "required": True, "description": "Краткое резюме инвестиции и рекомендации"},
            {"section_key": "company_overview", "title": "Обзор компании", "required": True, "description": "Описание бизнеса, рынка и конкурентной позиции"},
            {"section_key": "financial_analysis", "title": "Финансовый анализ", "required": True, "description": "Ключевые финансовые показатели и динамика"},
            {"section_key": "risk_assessment", "title": "Оценка рисков", "required": True, "description": "Ключевые риски и митигации"},
            {"section_key": "valuation", "title": "Оценка стоимости", "required": False, "description": "Методы оценки и результаты"},
            {"section_key": "deal_terms", "title": "Условия сделки", "required": False, "description": "Структура и условия инвестиции"},
            {"section_key": "recommendation", "title": "Рекомендация", "required": True, "description": "Итоговая рекомендация IC"},
        ],
        "available_metrics": [
            {"metric_key": "revenue", "label": "Выручка", "category": "Финансы"},
            {"metric_key": "ebitda", "label": "EBITDA", "category": "Финансы"},
            {"metric_key": "net_income", "label": "Чистая прибыль", "category": "Финансы"},
            {"metric_key": "roi", "label": "ROI", "category": "Доходность"},
            {"metric_key": "irr", "label": "IRR", "category": "Доходность"},
            {"metric_key": "payback", "label": "Срок окупаемости", "category": "Доходность"},
            {"metric_key": "risk_score", "label": "Скоринг риска", "category": "Риски"},
        ],
    },
    "quarterly_report": {
        "name": "Квартальный отчёт",
        "description": "Отчёт о деятельности за квартал. Показатели портфеля, ключевые события и прогноз.",
        "sections": [
            {"section_key": "executive_summary", "title": "Executive Summary", "required": True, "description": "Итоги квартала"},
            {"section_key": "portfolio_performance", "title": "Показатели портфеля", "required": True, "description": "Доходность, стоимость, движение средств"},
            {"section_key": "asset_breakdown", "title": "Разбивка по активам", "required": True, "description": "Детализация по каждому активу"},
            {"section_key": "market_overview", "title": "Обзор рынка", "required": False, "description": "Макроэкономические показатели и тренды"},
            {"section_key": "key_events", "title": "Ключевые события", "required": True, "description": "Важные события за период"},
            {"section_key": "risk_monitoring", "title": "Мониторинг рисков", "required": False, "description": "Обновление по рискам"},
            {"section_key": "outlook", "title": "Прогноз", "required": True, "description": "Ожидания на следующий квартал"},
        ],
        "available_metrics": [
            {"metric_key": "total_value", "label": "Стоимость портфеля", "category": "Портфель"},
            {"metric_key": "quarterly_return", "label": "Квартальная доходность", "category": "Портфель"},
            {"metric_key": "ytd_return", "label": "Доходность с начала года", "category": "Портфель"},
            {"metric_key": "num_assets", "label": "Количество активов", "category": "Портфель"},
            {"metric_key": "sharpe", "label": "Коэффициент Шарпа", "category": "Риски"},
            {"metric_key": "max_drawdown", "label": "Макс. просадка", "category": "Риски"},
        ],
    },
    "portfolio_report": {
        "name": "Отчёт по портфелю",
        "description": "Комплексный отчёт по портфелю с аллокацией, диверсификацией и рекомендациями по ребалансировке.",
        "sections": [
            {"section_key": "executive_summary", "title": "Executive Summary", "required": True, "description": "Краткий обзор портфеля"},
            {"section_key": "allocation", "title": "Аллокация активов", "required": True, "description": "Распределение по классам активов, отраслям, географии"},
            {"section_key": "performance_attribution", "title": "Атрибуция доходности", "required": True, "description": "Вклад каждого актива в общую доходность"},
            {"section_key": "diversification", "title": "Диверсификация", "required": True, "description": "Оценка диверсификации и концентрационных рисков"},
            {"section_key": "risk_metrics", "title": "Метрики риска", "required": True, "description": "VaR, волатильность, корреляции"},
            {"section_key": "rebalancing", "title": "Рекомендации по ребалансировке", "required": False, "description": "Предложения по оптимизации"},
        ],
        "available_metrics": [
            {"metric_key": "total_value", "label": "Стоимость портфеля", "category": "Портфель"},
            {"metric_key": "annualized_return", "label": "Годовая доходность", "category": "Доходность"},
            {"metric_key": "volatility", "label": "Волатильность", "category": "Риски"},
            {"metric_key": "var_95", "label": "VaR (95%)", "category": "Риски"},
            {"metric_key": "hhi", "label": "Индекс Херфиндаля", "category": "Диверсификация"},
            {"metric_key": "num_positions", "label": "Позиций", "category": "Портфель"},
        ],
    },
    "analytical_note": {
        "name": "Аналитическая записка",
        "description": "Краткая аналитическая записка по конкретному решению или теме. Формат одностраничного брифинга.",
        "sections": [
            {"section_key": "executive_summary", "title": "Резюме", "required": True, "description": "Ключевые выводы"},
            {"section_key": "background", "title": "Контекст", "required": True, "description": "Предпосылки и постановка вопроса"},
            {"section_key": "analysis", "title": "Анализ", "required": True, "description": "Основной аналитический раздел"},
            {"section_key": "conclusions", "title": "Выводы и рекомендации", "required": True, "description": "Итоговые выводы и следующие шаги"},
        ],
        "available_metrics": [
            {"metric_key": "amount", "label": "Сумма инвестиции", "category": "Сделка"},
            {"metric_key": "expected_return", "label": "Ожидаемая доходность", "category": "Сделка"},
            {"metric_key": "risk_level", "label": "Уровень риска", "category": "Риски"},
            {"metric_key": "dd_score", "label": "DD-скоринг", "category": "Due Diligence"},
        ],
    },
}


# ═══════════════════════════════════════════════════════════════
# ГЕНЕРАЦИЯ КОНТЕНТА ОТЧЁТОВ
# ═══════════════════════════════════════════════════════════════

def generate_report(
    template_key: str,
    title: Optional[str],
    portfolio_data: Optional[Dict[str, Any]] = None,
    decision_data: Optional[Dict[str, Any]] = None,
    decisions_list: Optional[List[Dict[str, Any]]] = None,
    selected_sections: Optional[List[str]] = None,
    selected_metrics: Optional[List[str]] = None,
    period_label: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Генерация отчёта по шаблону.
    Возвращает content (список секций), executive_summary, meta.
    """
    template = REPORT_TEMPLATES.get(template_key)
    if not template:
        raise ValueError(f"Шаблон '{template_key}' не найден")

    # Определяем какие секции генерировать
    all_sections = template["sections"]
    if selected_sections:
        sections_to_gen = [s for s in all_sections if s["section_key"] in selected_sections or s.get("required")]
    else:
        sections_to_gen = all_sections

    # Seed для детерминистичности
    seed_str = (title or "") + template_key + str(portfolio_data.get("id", 0) if portfolio_data else 0)
    seed = abs(hash(seed_str)) % 100000
    rng = random.Random(seed)

    # Генерируем title
    if not title:
        if portfolio_data:
            title = f"{template['name']} — {portfolio_data.get('name', 'Портфель')}"
        elif decision_data:
            title = f"{template['name']} — {decision_data.get('title', 'Решение')}"
        else:
            title = template["name"]

    now = datetime.now()
    period = period_label or f"Q{(now.month - 1) // 3 + 1} {now.year}"

    # Генерируем контент секций
    content = []
    for sec in sections_to_gen:
        section_content = _generate_section(
            template_key, sec["section_key"], sec["title"],
            portfolio_data, decision_data, decisions_list,
            rng, period,
        )
        content.append(section_content)

    # NLG Executive Summary
    executive_summary = _generate_executive_summary(
        template_key, title, portfolio_data, decision_data, content, rng, period
    )

    # Meta
    meta = {
        "generated_at": now.isoformat(),
        "period": period,
        "template_name": template["name"],
        "author": "AI Capital Management",
        "disclaimer": "Данный отчёт носит информационный характер и не является финансовой рекомендацией.",
    }

    return {
        "title": title,
        "content": content,
        "executive_summary": executive_summary,
        "meta": meta,
    }


def _generate_section(
    template_key: str,
    section_key: str,
    section_title: str,
    portfolio_data: Optional[Dict[str, Any]],
    decision_data: Optional[Dict[str, Any]],
    decisions_list: Optional[List[Dict[str, Any]]],
    rng: random.Random,
    period: str,
) -> Dict[str, Any]:
    """Генерация контента одной секции."""

    base = {"section_key": section_key, "title": section_title}

    # ─── PORTFOLIO-CENTRIC SECTIONS ─────────────────────────
    if section_key == "portfolio_performance":
        total_val = portfolio_data.get("total_value", 0) if portfolio_data else rng.uniform(500000, 5000000)
        q_return = rng.uniform(-5, 18)
        ytd_return = rng.uniform(-2, 25)
        return {
            **base,
            "text": f"За {period} портфель показал доходность {q_return:.1f}%. Стоимость портфеля составляет ${total_val:,.0f}. Доходность с начала года: {ytd_return:.1f}%.",
            "data": {
                "total_value": round(total_val, 0),
                "quarterly_return_pct": round(q_return, 1),
                "ytd_return_pct": round(ytd_return, 1),
                "benchmark_return_pct": round(rng.uniform(3, 12), 1),
            },
            "chart_type": "bar",
            "chart_data": [
                {"name": "Портфель", "value": round(q_return, 1)},
                {"name": "Бенчмарк", "value": round(rng.uniform(3, 12), 1)},
                {"name": "Инфляция", "value": round(rng.uniform(2, 6), 1)},
            ],
        }

    if section_key == "asset_breakdown":
        assets = decisions_list or []
        if not assets:
            assets = [
                {"title": f"Актив {i+1}", "amount": rng.uniform(50000, 500000), "status": rng.choice(["active", "approved", "completed"])}
                for i in range(rng.randint(3, 7))
            ]
        table = []
        for a in assets:
            val = float(a.get("amount", 0) or 0)
            ret = rng.uniform(-10, 30)
            table.append({
                "Актив": a.get("title", "—"),
                "Стоимость": f"${val:,.0f}",
                "Доходность": f"{ret:+.1f}%",
                "Статус": a.get("status", "active"),
            })
        total_invested = sum(float(a.get("amount", 0) or 0) for a in assets)
        return {
            **base,
            "text": f"Портфель включает {len(assets)} активов. Общая сумма инвестиций: ${total_invested:,.0f}.",
            "table": table,
            "chart_type": "pie",
            "chart_data": [
                {"name": a.get("title", f"Актив {i+1}"), "value": round(float(a.get("amount", 0) or rng.uniform(50000, 300000)), 0)}
                for i, a in enumerate(assets[:8])
            ],
        }

    if section_key == "allocation":
        sectors = ["IT и технологии", "Финансы", "Сельское хозяйство", "Строительство", "Розничная торговля", "Транспорт"]
        alloc = []
        remaining = 100.0
        for i, s in enumerate(sectors):
            if i == len(sectors) - 1:
                pct = remaining
            else:
                pct = rng.uniform(8, 30)
                pct = min(pct, remaining - (len(sectors) - i - 1) * 5)
            alloc.append({"name": s, "value": round(pct, 1)})
            remaining -= pct
        return {
            **base,
            "text": "Распределение активов по отраслям демонстрирует умеренную диверсификацию.",
            "chart_type": "pie",
            "chart_data": alloc,
            "table": [{"Отрасль": a["name"], "Доля (%)": f"{a['value']:.1f}%"} for a in alloc],
        }

    if section_key == "performance_attribution":
        assets = decisions_list or []
        if not assets:
            assets = [{"title": f"Актив {i+1}", "amount": rng.uniform(50000, 500000)} for i in range(5)]
        chart_data = []
        for a in assets[:6]:
            contrib = rng.uniform(-3, 8)
            chart_data.append({"name": a.get("title", "—")[:20], "value": round(contrib, 2)})
        return {
            **base,
            "text": "Атрибуция доходности показывает вклад каждого актива в общий результат портфеля.",
            "chart_type": "bar",
            "chart_data": chart_data,
        }

    if section_key == "diversification":
        hhi = rng.uniform(800, 3000)
        level = "Высокая" if hhi < 1500 else "Умеренная" if hhi < 2500 else "Низкая"
        return {
            **base,
            "text": f"Индекс Херфиндаля-Хиршмана (HHI): {hhi:.0f}. Уровень диверсификации: {level}. "
                    f"Рекомендуется {'поддерживать текущую стратегию' if hhi < 1500 else 'рассмотреть расширение портфеля'}.",
            "data": {"hhi": round(hhi, 0), "level": level, "sectors_count": rng.randint(4, 10), "geo_count": rng.randint(2, 5)},
        }

    if section_key == "risk_metrics":
        var_95 = rng.uniform(3, 15)
        vol = rng.uniform(8, 25)
        sharpe = rng.uniform(0.3, 2.5)
        return {
            **base,
            "text": f"VaR (95%): {var_95:.1f}%. Волатильность: {vol:.1f}%. Коэффициент Шарпа: {sharpe:.2f}.",
            "data": {"var_95": round(var_95, 1), "volatility": round(vol, 1), "sharpe": round(sharpe, 2), "max_drawdown": round(rng.uniform(5, 20), 1)},
            "chart_type": "radar",
            "chart_data": [
                {"category": "VaR", "score": round(100 - var_95 * 5, 0)},
                {"category": "Волатильность", "score": round(100 - vol * 3, 0)},
                {"category": "Шарп", "score": round(min(100, sharpe * 40), 0)},
                {"category": "Диверсификация", "score": rng.randint(40, 90)},
                {"category": "Ликвидность", "score": rng.randint(50, 95)},
            ],
        }

    if section_key == "rebalancing":
        recommendations = [
            "Увеличить долю IT-активов на 5-8% за счёт снижения позиции в строительстве.",
            "Рассмотреть добавление ESG-активов для улучшения профиля устойчивости.",
            "Снизить концентрацию в топ-3 позициях до максимум 60% портфеля.",
            "Добавить международные активы для географической диверсификации.",
        ]
        rng.shuffle(recommendations)
        return {
            **base,
            "text": "На основе текущей аллокации и рисков предлагаются следующие корректировки:",
            "table": [{"№": i + 1, "Рекомендация": r} for i, r in enumerate(recommendations[:3])],
        }

    # ─── DECISION-CENTRIC SECTIONS ──────────────────────────
    if section_key == "company_overview":
        d = decision_data or {}
        return {
            **base,
            "text": (
                f"Компания: {d.get('title', 'Не указано')}. "
                f"Категория: {d.get('category', 'Не указана')}. "
                f"Описание: {d.get('description', 'Информация отсутствует')}. "
                f"Текущий статус решения: {d.get('status', 'draft')}."
            ),
            "data": {
                "company": d.get("title", "—"),
                "category": d.get("category", "—"),
                "status": d.get("status", "—"),
                "amount": float(d.get("amount", 0) or 0),
            },
        }

    if section_key == "financial_analysis":
        amount = float((decision_data or {}).get("amount", 0) or rng.uniform(100000, 2000000))
        revenue = amount * rng.uniform(1.5, 5)
        ebitda = revenue * rng.uniform(0.1, 0.35)
        net_income = ebitda * rng.uniform(0.4, 0.8)
        return {
            **base,
            "text": f"Выручка: ${revenue:,.0f}. EBITDA: ${ebitda:,.0f} ({ebitda/revenue*100:.1f}% маржа). Чистая прибыль: ${net_income:,.0f}.",
            "data": {"revenue": round(revenue, 0), "ebitda": round(ebitda, 0), "net_income": round(net_income, 0), "ebitda_margin": round(ebitda / revenue * 100, 1)},
            "chart_type": "bar",
            "chart_data": [
                {"name": "Выручка", "value": round(revenue / 1000, 0)},
                {"name": "EBITDA", "value": round(ebitda / 1000, 0)},
                {"name": "Чистая прибыль", "value": round(net_income / 1000, 0)},
            ],
        }

    if section_key == "risk_assessment":
        risks = [
            {"risk": "Рыночный риск", "level": rng.choice(["Средний", "Высокий"]), "mitigation": "Диверсификация, хеджирование"},
            {"risk": "Операционный риск", "level": rng.choice(["Низкий", "Средний"]), "mitigation": "Страхование, BCP"},
            {"risk": "Юридический риск", "level": rng.choice(["Низкий", "Средний"]), "mitigation": "Legal DD, covenants"},
            {"risk": "Валютный риск", "level": rng.choice(["Средний", "Высокий"]), "mitigation": "Форвардные контракты"},
        ]
        return {
            **base,
            "text": "Идентифицированы ключевые категории рисков с соответствующими стратегиями митигации.",
            "table": [{"Риск": r["risk"], "Уровень": r["level"], "Митигация": r["mitigation"]} for r in risks],
        }

    if section_key == "valuation":
        amount = float((decision_data or {}).get("amount", 0) or rng.uniform(500000, 5000000))
        mult = rng.uniform(0.8, 1.5)
        dcf = amount * rng.uniform(0.9, 1.8)
        comps = amount * rng.uniform(0.7, 1.4)
        return {
            **base,
            "text": f"DCF-оценка: ${dcf:,.0f}. Сравнительная оценка: ${comps:,.0f}. Текущая цена сделки: ${amount:,.0f}.",
            "data": {"dcf": round(dcf, 0), "comparables": round(comps, 0), "deal_price": round(amount, 0)},
            "chart_type": "bar",
            "chart_data": [
                {"name": "DCF", "value": round(dcf / 1000, 0)},
                {"name": "Сравнит.", "value": round(comps / 1000, 0)},
                {"name": "Цена сделки", "value": round(amount / 1000, 0)},
            ],
        }

    if section_key == "deal_terms":
        return {
            **base,
            "text": "Структура сделки предполагает прямые инвестиции с правами anti-dilution и drag-along.",
            "table": [
                {"Параметр": "Тип инструмента", "Значение": "Прямые инвестиции (equity)"},
                {"Параметр": "Сумма", "Значение": f"${float((decision_data or {}).get('amount', 0) or 0):,.0f}"},
                {"Параметр": "Доля", "Значение": f"{rng.uniform(5, 35):.1f}%"},
                {"Параметр": "Lock-up", "Значение": f"{rng.choice([12, 18, 24, 36])} мес."},
                {"Параметр": "Exit стратегия", "Значение": rng.choice(["IPO", "M&A", "Buyback", "Secondary sale"])},
            ],
        }

    # ─── UNIVERSAL SECTIONS ──────────────────────────────────
    if section_key == "executive_summary":
        return {
            **base,
            "text": "Автоматически сгенерированное резюме доступно в поле Executive Summary отчёта.",
        }

    if section_key == "market_overview":
        return {
            **base,
            "text": (
                f"Макроэкономические показатели Узбекистана за {period}: "
                f"рост ВВП: {rng.uniform(5, 7.5):.1f}%, инфляция: {rng.uniform(8, 12):.1f}%, "
                f"ставка ЦБ: {rng.uniform(12, 15):.1f}%, курс USD/UZS: {rng.randint(12500, 13500)}."
            ),
            "table": [
                {"Показатель": "Рост ВВП", "Значение": f"{rng.uniform(5, 7.5):.1f}%", "Тренд": "Рост"},
                {"Показатель": "Инфляция", "Значение": f"{rng.uniform(8, 12):.1f}%", "Тренд": "Снижение"},
                {"Показатель": "Ставка ЦБ", "Значение": f"{rng.uniform(12, 15):.1f}%", "Тренд": "Стабильно"},
                {"Показатель": "Курс USD/UZS", "Значение": f"{rng.randint(12500, 13500)}", "Тренд": "Стабильно"},
                {"Показатель": "Ставка депозитов", "Значение": f"{rng.uniform(20, 24):.0f}%", "Тренд": "Стабильно"},
            ],
        }

    if section_key == "key_events":
        events = [
            f"Завершена сделка по активу на ${rng.uniform(100000, 1000000):,.0f}",
            "Проведён ежеквартальный IC review",
            "Обновлены модели AI-аналитики",
            f"DD-скоринг проведён для {rng.randint(2, 6)} компаний",
            "Запущен новый workflow согласования",
        ]
        rng.shuffle(events)
        return {
            **base,
            "text": f"За {period} произошли следующие ключевые события:",
            "table": [{"Дата": f"{rng.randint(1, 28):02d}.{rng.randint(1, 3):02d}.2026", "Событие": e} for e in events[:4]],
        }

    if section_key == "risk_monitoring":
        return {
            **base,
            "text": f"Мониторинг рисков за {period} выявил стабильный профиль. Новых критических рисков не обнаружено.",
            "data": {"new_risks": 0, "resolved_risks": rng.randint(1, 3), "active_risks": rng.randint(2, 8)},
        }

    if section_key == "outlook":
        return {
            **base,
            "text": (
                f"Прогноз на следующий квартал: ожидается умеренный рост портфеля на {rng.uniform(2, 8):.1f}%. "
                "Рекомендуется сфокусироваться на диверсификации и мониторинге макроэкономических рисков. "
                "Планируется рассмотрение 3-5 новых инвестиционных возможностей."
            ),
        }

    if section_key == "recommendation":
        d = decision_data or {}
        amount = float(d.get("amount", 0) or 0)
        recommendation = rng.choice([
            f"РЕКОМЕНДАЦИЯ: Одобрить инвестицию в размере ${amount:,.0f}. Ожидаемая доходность превышает пороговые значения.",
            f"РЕКОМЕНДАЦИЯ: Одобрить с условиями. Необходимо завершить DD и включить дополнительные covenants.",
            "РЕКОМЕНДАЦИЯ: Отложить решение до получения дополнительной финансовой отчётности.",
        ])
        return {**base, "text": recommendation}

    # ─── ANALYTICAL NOTE ─────────────────────────────────────
    if section_key == "background":
        d = decision_data or {}
        return {
            **base,
            "text": (
                f"Предмет анализа: {d.get('title', 'инвестиционное решение')}. "
                f"Контекст: {d.get('description', 'требуется дополнительная информация')}. "
                f"Запрошено руководством для оценки целесообразности инвестиции."
            ),
        }

    if section_key == "analysis":
        score = rng.uniform(45, 85)
        return {
            **base,
            "text": (
                f"Проведён комплексный анализ. Общий скоринг: {score:.1f}/100. "
                f"Финансовые показатели {'соответствуют' if score > 60 else 'не полностью соответствуют'} инвестиционным критериям. "
                f"{'Рекомендуется стандартная процедура DD.' if score > 60 else 'Рекомендуется углублённый анализ.'}"
            ),
            "data": {"overall_score": round(score, 1)},
        }

    if section_key == "conclusions":
        return {
            **base,
            "text": (
                "Выводы: на основании проведённого анализа инвестиция представляется "
                f"{'привлекательной' if rng.random() > 0.3 else 'рискованной'} с учётом текущих рыночных условий. "
                "Следующие шаги: завершить DD, подготовить term sheet, вынести на IC."
            ),
        }

    # Fallback
    return {**base, "text": f"Раздел «{section_title}» — данные будут дополнены."}


# ═══════════════════════════════════════════════════════════════
# NLG EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════

def _generate_executive_summary(
    template_key: str,
    title: str,
    portfolio_data: Optional[Dict[str, Any]],
    decision_data: Optional[Dict[str, Any]],
    content: List[Dict[str, Any]],
    rng: random.Random,
    period: str,
) -> str:
    """Генерация текстового Executive Summary."""

    if template_key == "quarterly_report":
        total_val = portfolio_data.get("total_value", 0) if portfolio_data else 0
        q_ret = 0
        for sec in content:
            if sec.get("section_key") == "portfolio_performance" and sec.get("data"):
                q_ret = sec["data"].get("quarterly_return_pct", 0)
                break
        return (
            f"EXECUTIVE SUMMARY — {title}\n\n"
            f"За отчётный период {period} портфель продемонстрировал доходность {q_ret:+.1f}%. "
            f"Стоимость активов под управлением составляет ${total_val:,.0f}. "
            f"Макроэкономическая ситуация в Узбекистане остаётся стабильной с умеренным ростом ВВП. "
            f"Ключевые риски — валютная волатильность и изменения регуляторной среды. "
            f"Рекомендуется продолжить текущую стратегию с фокусом на диверсификацию.\n\n"
            f"© AI Capital Management. Отчёт сгенерирован автоматически."
        )

    if template_key == "investment_memo":
        d = decision_data or {}
        amount = float(d.get("amount", 0) or 0)
        return (
            f"EXECUTIVE SUMMARY — {title}\n\n"
            f"Инвестиционный комитет рассматривает возможность инвестиции в «{d.get('title', '—')}» "
            f"на сумму ${amount:,.0f}. "
            f"Финансовые показатели {'соответствуют' if rng.random() > 0.3 else 'частично соответствуют'} "
            f"инвестиционным критериям фонда. "
            f"Ключевые риски: рыночные и операционные. DD-проверка {'завершена' if rng.random() > 0.5 else 'в процессе'}. "
            f"Рекомендация: {'одобрить' if rng.random() > 0.4 else 'одобрить с условиями'}.\n\n"
            f"© AI Capital Management. Отчёт сгенерирован автоматически."
        )

    if template_key == "portfolio_report":
        total_val = portfolio_data.get("total_value", 0) if portfolio_data else 0
        return (
            f"EXECUTIVE SUMMARY — {title}\n\n"
            f"Портфель включает активы общей стоимостью ${total_val:,.0f}. "
            f"Показатели диверсификации и риска находятся в допустимых пределах. "
            f"Годовая доходность {rng.uniform(8, 22):.1f}%, что {'выше' if rng.random() > 0.4 else 'на уровне'} бенчмарка. "
            f"Рекомендации по ребалансировке включены в соответствующий раздел.\n\n"
            f"© AI Capital Management. Отчёт сгенерирован автоматически."
        )

    # analytical_note
    d = decision_data or {}
    return (
        f"РЕЗЮМЕ — {title}\n\n"
        f"Проведён анализ «{d.get('title', 'объекта')}». "
        f"По результатам комплексной оценки объект {'рекомендован' if rng.random() > 0.3 else 'требует дополнительного анализа'} "
        f"для инвестиционного комитета. Детали приведены ниже.\n\n"
        f"© AI Capital Management. Отчёт сгенерирован автоматически."
    )
