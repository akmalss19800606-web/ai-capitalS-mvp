"""
chart_service.py — Фаза 3, Сессия 1.
Подготовка данных для расширенных визуализаций:
  VIS-CHART-001.1  Waterfall (анализ изменений)
  VIS-CHART-001.2  Tornado  (чувствительность)
  VIS-CHART-001.3  Bubble   (многомерные данные)
  VIS-CHART-001.4  Heatmap  (корреляции / концентрации)

Данные берутся из существующих таблиц:
  - FactPortfolioSnapshot  (OLAP)
  - FactInvestmentPerformance
  - InvestmentDecision
  - Portfolio
"""

from typing import Any
from sqlalchemy.orm import Session
from sqlalchemy import func, text
import math
import random

from app.db.models.olap import (
    FactPortfolioSnapshot,
    FactInvestmentPerformance,
    DimCompany,
    DimCategory,
)
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.portfolio import Portfolio


# ─── helpers ──────────────────────────────────────────────────────────────────

def _round(v: float, n: int = 2) -> float:
    return round(v, n) if v is not None else 0.0


def _safe_div(a: float, b: float) -> float:
    return round(a / b, 4) if b else 0.0


# ─── VIS-CHART-001.1  Waterfall ──────────────────────────────────────────────

def build_waterfall(db: Session, portfolio_id: int | None = None) -> dict[str, Any]:
    """
    Каскадная диаграмма (Waterfall) — разбивка изменения стоимости портфеля
    по категориям решений.  Каждый столбик = вклад категории.
    Формат: [{name, value, cumulative, type: 'increase'|'decrease'|'total'}]
    """
    query = db.query(
        InvestmentDecision.category,
        func.sum(InvestmentDecision.total_value).label("total_ev"),
    ).group_by(InvestmentDecision.category)

    if portfolio_id:
        query = query.filter(InvestmentDecision.portfolio_id == portfolio_id)

    rows = query.all()

    if not rows or all(r.total_ev is None for r in rows):
        # Демо-данные, чтобы UI не был пустым
        return _waterfall_demo()

    items: list[dict] = []
    cumulative = 0.0
    for r in rows:
        v = _round(float(r.total_ev or 0))
        cumulative += v
        items.append({
            "name": r.category or "Другое",
            "value": v,
            "cumulative": _round(cumulative),
            "type": "increase" if v >= 0 else "decrease",
        })

    items.append({
        "name": "Итого",
        "value": _round(cumulative),
        "cumulative": _round(cumulative),
        "type": "total",
    })
    return {"items": items, "unit": "млн ₽"}


def _waterfall_demo() -> dict[str, Any]:
    cats = [
        ("Начальное значение", 100, "total"),
        ("Прямые инвестиции", 35, "increase"),
        ("Недвижимость", 22, "increase"),
        ("Венчурный капитал", -12, "decrease"),
        ("Операционные расходы", -18, "decrease"),
        ("Дивиденды", 15, "increase"),
        ("Переоценка активов", 8, "increase"),
    ]
    items = []
    cum = 0.0
    for name, val, tp in cats:
        if tp == "total" and not items:
            cum = val
            items.append({"name": name, "value": val, "cumulative": val, "type": "total"})
        else:
            cum += val
            items.append({"name": name, "value": val, "cumulative": _round(cum), "type": tp})
    items.append({"name": "Итого", "value": _round(cum), "cumulative": _round(cum), "type": "total"})
    return {"items": items, "unit": "млн ₽"}


# ─── VIS-CHART-001.2  Tornado ────────────────────────────────────────────────

def build_tornado(db: Session, portfolio_id: int | None = None) -> dict[str, Any]:
    """
    Tornado-диаграмма чувствительности.
    Для каждого фактора показываем влияние +/- отклонения на итоговый результат.
    Формат: [{factor, low, high, base}]
    """
    decisions = db.query(InvestmentDecision)
    if portfolio_id:
        decisions = decisions.filter(InvestmentDecision.portfolio_id == portfolio_id)
    decisions = decisions.all()

    if not decisions:
        return _tornado_demo()

    base_total = sum(float(d.total_value or 0) for d in decisions)
    if base_total == 0:
        return _tornado_demo()

    # Факторы чувствительности (симулируем ±20% каждого параметра)
    factors_map: dict[str, float] = {}
    for d in decisions:
        cat = d.category or "Другое"
        factors_map[cat] = factors_map.get(cat, 0) + float(d.total_value or 0)

    result = []
    for factor, contrib in sorted(factors_map.items(), key=lambda x: abs(x[1]), reverse=True):
        delta = abs(contrib) * 0.2
        result.append({
            "factor": factor,
            "low": _round(base_total - delta),
            "high": _round(base_total + delta),
            "base": _round(base_total),
            "delta": _round(delta),
        })

    return {"items": result[:8], "base": _round(base_total), "unit": "млн ₽"}


def _tornado_demo() -> dict[str, Any]:
    base = 150.0
    factors = [
        ("Ставка дисконтирования", 28),
        ("Выручка", 22),
        ("Операционные расходы", 18),
        ("Темп роста", 15),
        ("Курс валюты", 12),
        ("Инфляция", 8),
        ("Стоимость капитала", 6),
    ]
    items = []
    for f, delta in factors:
        items.append({
            "factor": f,
            "low": _round(base - delta),
            "high": _round(base + delta),
            "base": _round(base),
            "delta": delta,
        })
    return {"items": items, "base": base, "unit": "млн ₽"}


# ─── VIS-CHART-001.3  Bubble ─────────────────────────────────────────────────

def build_bubble(db: Session, portfolio_id: int | None = None) -> dict[str, Any]:
    """
    Пузырьковая диаграмма — 3 оси:
      X = ожидаемая доходность (total_value)
      Y = уровень риска (risk_level → число)
      Size = объём инвестиции
    """
    query = db.query(InvestmentDecision)
    if portfolio_id:
        query = query.filter(InvestmentDecision.portfolio_id == portfolio_id)
    decisions = query.all()

    if not decisions:
        return _bubble_demo()

    risk_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    items = []
    for d in decisions:
        ev = float(d.total_value or 0)
        rl = risk_map.get((d.risk_level or "medium").lower(), 2)
        sz = abs(ev) if ev else 10
        items.append({
            "name": d.asset_name or f"Решение #{d.id}",
            "x": _round(ev),
            "y": rl,
            "z": _round(sz),
            "category": d.category or "Другое",
            "status": d.status or "draft",
        })

    if not items:
        return _bubble_demo()

    return {
        "items": items,
        "xLabel": "Ожидаемая доходность (млн ₽)",
        "yLabel": "Уровень риска",
        "zLabel": "Объём инвестиции",
    }


def _bubble_demo() -> dict[str, Any]:
    demo = [
        {"name": "Проект Альфа", "x": 45, "y": 2, "z": 30, "category": "Прямые инвестиции", "status": "approved"},
        {"name": "Проект Бета", "x": 80, "y": 3, "z": 55, "category": "Венчурный капитал", "status": "under_review"},
        {"name": "Проект Гамма", "x": 25, "y": 1, "z": 20, "category": "Недвижимость", "status": "approved"},
        {"name": "Проект Дельта", "x": 60, "y": 3, "z": 45, "category": "Прямые инвестиции", "status": "draft"},
        {"name": "Проект Эпсилон", "x": 15, "y": 1, "z": 60, "category": "Облигации", "status": "approved"},
        {"name": "Проект Зета", "x": 90, "y": 4, "z": 35, "category": "Венчурный капитал", "status": "under_review"},
        {"name": "Проект Эта", "x": 35, "y": 2, "z": 25, "category": "Фонды", "status": "approved"},
        {"name": "Проект Тета", "x": 70, "y": 3, "z": 40, "category": "Прямые инвестиции", "status": "draft"},
    ]
    return {
        "items": demo,
        "xLabel": "Ожидаемая доходность (млн ₽)",
        "yLabel": "Уровень риска",
        "zLabel": "Объём инвестиции",
    }


# ─── VIS-CHART-001.4  Heatmap ────────────────────────────────────────────────

def build_heatmap(db: Session, portfolio_id: int | None = None) -> dict[str, Any]:
    """
    Тепловая карта корреляций/концентраций.
    Строки = категории решений, столбцы = статусы, значения = суммарные total_value.
    """
    query = db.query(
        InvestmentDecision.category,
        InvestmentDecision.status,
        func.count(InvestmentDecision.id).label("cnt"),
        func.sum(InvestmentDecision.total_value).label("total_ev"),
    ).group_by(InvestmentDecision.category, InvestmentDecision.status)

    if portfolio_id:
        query = query.filter(InvestmentDecision.portfolio_id == portfolio_id)

    rows = query.all()

    if not rows:
        return _heatmap_demo()

    categories = sorted(set(r.category or "Другое" for r in rows))
    statuses = sorted(set(r.status or "draft" for r in rows))

    status_labels = {
        "draft": "Черновик",
        "under_review": "На рассмотрении",
        "approved": "Утверждено",
        "rejected": "Отклонено",
        "implemented": "Реализовано",
    }

    cells = []
    for r in rows:
        cells.append({
            "row": r.category or "Другое",
            "col": status_labels.get(r.status, r.status or "Другое"),
            "value": _round(float(r.total_ev or 0)),
            "count": r.cnt or 0,
        })

    return {
        "cells": cells,
        "rows": categories,
        "cols": [status_labels.get(s, s) for s in statuses],
        "unit": "млн ₽",
    }


def _heatmap_demo() -> dict[str, Any]:
    categories = ["Прямые инвестиции", "Недвижимость", "Венчурный капитал", "Облигации", "Фонды"]
    statuses = ["Черновик", "На рассмотрении", "Утверждено", "Реализовано"]
    cells = []
    random.seed(42)
    for cat in categories:
        for st in statuses:
            cells.append({
                "row": cat,
                "col": st,
                "value": round(random.uniform(5, 80), 1),
                "count": random.randint(1, 12),
            })
    return {
        "cells": cells,
        "rows": categories,
        "cols": statuses,
        "unit": "млн ₽",
    }
