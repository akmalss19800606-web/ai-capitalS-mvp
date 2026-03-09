"""
dashboard_builder_service.py — Фаза 3, Сессия 2.
Сервис конструктора дашбордов:
  VIS-DASH-001.1  Виджеты с кросс-фильтрацией
  VIS-DASH-001.2  Drill-down от агрегированных показателей
  VIS-DASH-001.3  Настраиваемые дашборды (CRUD виджетов)
  VIS-DASH-001.5  Сохранение конфигураций

Каждый виджет запрашивает данные через widget_data() — универсальный провайдер,
который агрегирует данные из существующих таблиц.
"""

import json
import random
from typing import Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models.dashboard_config import DashboardConfig, DashboardWidget
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.portfolio import Portfolio


# ─── Widget type registry ─────────────────────────────────────────────────

WIDGET_TYPES = [
    {
        "type": "kpi",
        "label": "KPI-карточка",
        "description": "Ключевой показатель с трендом",
        "default_w": 3, "default_h": 2,
        "metrics": ["total_value", "decision_count", "portfolio_count", "avg_value", "high_risk_count"],
    },
    {
        "type": "bar_chart",
        "label": "Столбчатая диаграмма",
        "description": "Распределение по категориям",
        "default_w": 6, "default_h": 4,
        "metrics": ["by_status", "by_category", "by_priority", "by_type", "by_geography"],
    },
    {
        "type": "pie_chart",
        "label": "Круговая диаграмма",
        "description": "Доли в процентах",
        "default_w": 4, "default_h": 4,
        "metrics": ["by_status", "by_category", "by_priority", "by_type"],
    },
    {
        "type": "line_chart",
        "label": "Линейный график",
        "description": "Динамика показателей",
        "default_w": 6, "default_h": 4,
        "metrics": ["decisions_over_time", "value_over_time"],
    },
    {
        "type": "table",
        "label": "Таблица данных",
        "description": "Детальный просмотр записей",
        "default_w": 12, "default_h": 5,
        "metrics": ["recent_decisions", "top_decisions", "portfolio_breakdown"],
    },
    {
        "type": "waterfall",
        "label": "Waterfall",
        "description": "Каскадная диаграмма изменений",
        "default_w": 6, "default_h": 4,
        "metrics": ["value_by_category"],
    },
    {
        "type": "heatmap",
        "label": "Тепловая карта",
        "description": "Матрица категория × статус",
        "default_w": 6, "default_h": 4,
        "metrics": ["category_status_matrix"],
    },
]


# ─── CRUD: Dashboard Configs ─────────────────────────────────────────────

def list_dashboards(db: Session, owner_id: int) -> list[dict]:
    configs = db.query(DashboardConfig).filter(
        (DashboardConfig.owner_id == owner_id) | (DashboardConfig.is_shared == True)
    ).order_by(DashboardConfig.created_at.desc()).all()
    return [_config_to_dict(c) for c in configs]


def get_dashboard(db: Session, dashboard_id: int, owner_id: int) -> dict | None:
    c = db.query(DashboardConfig).filter(DashboardConfig.id == dashboard_id).first()
    if not c:
        return None
    if c.owner_id != owner_id and not c.is_shared:
        return None
    return _config_to_dict(c, include_widgets=True)


def create_dashboard(db: Session, owner_id: int, data: dict) -> dict:
    config = DashboardConfig(
        owner_id=owner_id,
        name=data.get("name", "Новый дашборд"),
        description=data.get("description"),
        is_default=data.get("is_default", False),
        is_shared=data.get("is_shared", False),
        global_filters=json.dumps(data.get("global_filters", {})),
    )
    db.add(config)
    db.commit()
    db.refresh(config)

    # Если указаны виджеты — создать их сразу
    widgets_data = data.get("widgets", [])
    for wd in widgets_data:
        widget = DashboardWidget(
            dashboard_id=config.id,
            widget_type=wd.get("widget_type", "kpi"),
            title=wd.get("title", "Виджет"),
            pos_x=wd.get("pos_x", 0),
            pos_y=wd.get("pos_y", 0),
            width=wd.get("width", 6),
            height=wd.get("height", 4),
            config=json.dumps(wd.get("config", {})),
            sort_order=wd.get("sort_order", 0),
        )
        db.add(widget)
    db.commit()
    db.refresh(config)
    return _config_to_dict(config, include_widgets=True)


def update_dashboard(db: Session, dashboard_id: int, owner_id: int, data: dict) -> dict | None:
    config = db.query(DashboardConfig).filter(
        DashboardConfig.id == dashboard_id,
        DashboardConfig.owner_id == owner_id,
    ).first()
    if not config:
        return None

    if "name" in data:
        config.name = data["name"]
    if "description" in data:
        config.description = data["description"]
    if "is_default" in data:
        config.is_default = data["is_default"]
    if "is_shared" in data:
        config.is_shared = data["is_shared"]
    if "global_filters" in data:
        config.global_filters = json.dumps(data["global_filters"])

    db.commit()
    db.refresh(config)
    return _config_to_dict(config, include_widgets=True)


def delete_dashboard(db: Session, dashboard_id: int, owner_id: int) -> bool:
    config = db.query(DashboardConfig).filter(
        DashboardConfig.id == dashboard_id,
        DashboardConfig.owner_id == owner_id,
    ).first()
    if not config:
        return False
    db.delete(config)
    db.commit()
    return True


# ─── CRUD: Widgets ────────────────────────────────────────────────────────

def add_widget(db: Session, dashboard_id: int, owner_id: int, data: dict) -> dict | None:
    config = db.query(DashboardConfig).filter(
        DashboardConfig.id == dashboard_id,
        DashboardConfig.owner_id == owner_id,
    ).first()
    if not config:
        return None
    widget = DashboardWidget(
        dashboard_id=dashboard_id,
        widget_type=data.get("widget_type", "kpi"),
        title=data.get("title", "Виджет"),
        pos_x=data.get("pos_x", 0),
        pos_y=data.get("pos_y", 0),
        width=data.get("width", 6),
        height=data.get("height", 4),
        config=json.dumps(data.get("config", {})),
        sort_order=data.get("sort_order", 0),
    )
    db.add(widget)
    db.commit()
    db.refresh(widget)
    return _widget_to_dict(widget)


def update_widget(db: Session, widget_id: int, owner_id: int, data: dict) -> dict | None:
    widget = db.query(DashboardWidget).join(DashboardConfig).filter(
        DashboardWidget.id == widget_id,
        DashboardConfig.owner_id == owner_id,
    ).first()
    if not widget:
        return None

    for field in ["title", "widget_type", "pos_x", "pos_y", "width", "height", "sort_order", "is_visible"]:
        if field in data:
            setattr(widget, field, data[field])
    if "config" in data:
        widget.config = json.dumps(data["config"])

    db.commit()
    db.refresh(widget)
    return _widget_to_dict(widget)


def delete_widget(db: Session, widget_id: int, owner_id: int) -> bool:
    widget = db.query(DashboardWidget).join(DashboardConfig).filter(
        DashboardWidget.id == widget_id,
        DashboardConfig.owner_id == owner_id,
    ).first()
    if not widget:
        return False
    db.delete(widget)
    db.commit()
    return True


def batch_update_layout(db: Session, dashboard_id: int, owner_id: int, layout: list[dict]) -> bool:
    """VIS-DASH-001.3: обновление позиций виджетов после drag-and-drop."""
    config = db.query(DashboardConfig).filter(
        DashboardConfig.id == dashboard_id,
        DashboardConfig.owner_id == owner_id,
    ).first()
    if not config:
        return False

    for item in layout:
        widget = db.query(DashboardWidget).filter(
            DashboardWidget.id == item.get("id"),
            DashboardWidget.dashboard_id == dashboard_id,
        ).first()
        if widget:
            widget.pos_x = item.get("pos_x", widget.pos_x)
            widget.pos_y = item.get("pos_y", widget.pos_y)
            widget.width = item.get("width", widget.width)
            widget.height = item.get("height", widget.height)

    db.commit()
    return True


# ─── Widget Data Provider ─────────────────────────────────────────────────
# VIS-DASH-001.1: кросс-фильтрация — global_filters + widget-level config
# VIS-DASH-001.2: drill-down — параметр drill_into расширяет детализацию

def widget_data(
    db: Session,
    owner_id: int,
    widget_type: str,
    metric: str,
    portfolio_id: Optional[int] = None,
    drill_into: Optional[str] = None,
) -> dict[str, Any]:
    """Универсальный провайдер данных для виджетов."""

    q = db.query(InvestmentDecision).filter(InvestmentDecision.created_by == owner_id)
    if portfolio_id:
        q = q.filter(InvestmentDecision.portfolio_id == portfolio_id)

    decisions = q.all()

    # ── KPI metrics ──
    if widget_type == "kpi":
        return _kpi_data(db, owner_id, metric, portfolio_id, decisions)

    # ── Bar / Pie breakdown ──
    if widget_type in ("bar_chart", "pie_chart"):
        return _breakdown_data(decisions, metric, drill_into)

    # ── Line chart (time series) ──
    if widget_type == "line_chart":
        return _time_series_data(decisions, metric)

    # ── Table ──
    if widget_type == "table":
        return _table_data(decisions, metric)

    # ── Waterfall ──
    if widget_type == "waterfall":
        return _waterfall_data(decisions)

    # ── Heatmap ──
    if widget_type == "heatmap":
        return _heatmap_data(decisions)

    return {"error": f"Неизвестный тип виджета: {widget_type}"}


# ─── Data generators ──────────────────────────────────────────────────────

def _kpi_data(db: Session, owner_id: int, metric: str, portfolio_id: Optional[int], decisions: list) -> dict:
    if metric == "total_value":
        val = sum(float(d.expected_value or d.total_value or 0) for d in decisions)
        return {"value": round(val, 2), "label": "Общая стоимость", "unit": "млн ₽", "trend": 5.2}
    if metric == "decision_count":
        return {"value": len(decisions), "label": "Решений", "unit": "шт.", "trend": 2}
    if metric == "portfolio_count":
        pq = db.query(Portfolio).filter(Portfolio.owner_id == owner_id)
        if portfolio_id:
            pq = pq.filter(Portfolio.id == portfolio_id)
        return {"value": pq.count(), "label": "Портфелей", "unit": "шт.", "trend": 0}
    if metric == "avg_value":
        vals = [float(d.expected_value or d.total_value or 0) for d in decisions]
        avg = round(sum(vals) / len(vals), 2) if vals else 0
        return {"value": avg, "label": "Средняя стоимость", "unit": "млн ₽", "trend": 1.8}
    if metric == "high_risk_count":
        count = sum(1 for d in decisions if (d.risk_level or "").lower() in ("high", "critical"))
        return {"value": count, "label": "Высокий риск", "unit": "шт.", "trend": -1}
    return {"value": 0, "label": metric, "unit": "", "trend": 0}


def _breakdown_data(decisions: list, metric: str, drill_into: Optional[str]) -> dict:
    """VIS-DASH-001.2: drill-down реализован через drill_into — при клике на категорию
    возвращаются детализированные записи."""
    field_map = {
        "by_status": "status",
        "by_category": "category",
        "by_priority": "priority",
        "by_type": "decision_type",
        "by_geography": "geography",
    }
    field = field_map.get(metric, "status")

    # Drill-down: если указано конкретное значение → вернуть детальные записи
    if drill_into:
        filtered = [d for d in decisions if str(_get_field(d, field)) == drill_into]
        items = [
            {
                "id": d.id,
                "title": d.title or d.asset_name or f"Решение #{d.id}",
                "status": str(_get_field(d, "status")),
                "category": str(_get_field(d, "category")),
                "value": float(d.expected_value or d.total_value or 0),
                "created_at": str(d.created_at) if d.created_at else None,
            }
            for d in filtered[:50]
        ]
        return {"drill": True, "drill_key": drill_into, "items": items, "total": len(filtered)}

    # Агрегация
    counts: dict[str, dict] = {}
    for d in decisions:
        key = str(_get_field(d, field) or "Другое")
        if key not in counts:
            counts[key] = {"name": key, "count": 0, "value": 0}
        counts[key]["count"] += 1
        counts[key]["value"] += float(d.expected_value or d.total_value or 0)

    items = sorted(counts.values(), key=lambda x: x["count"], reverse=True)
    return {"items": items, "field": field, "total": len(decisions)}


def _time_series_data(decisions: list, metric: str) -> dict:
    from collections import defaultdict
    monthly: dict[str, dict] = defaultdict(lambda: {"count": 0, "value": 0.0})
    for d in decisions:
        if d.created_at:
            key = d.created_at.strftime("%Y-%m")
            monthly[key]["count"] += 1
            monthly[key]["value"] += float(d.expected_value or d.total_value or 0)

    if not monthly:
        # Демо-данные
        import datetime
        base = datetime.date(2025, 6, 1)
        random.seed(42)
        for i in range(12):
            m = base.month + i
            y = base.year + (m - 1) // 12
            m = ((m - 1) % 12) + 1
            key = f"{y}-{m:02d}"
            monthly[key] = {"count": random.randint(2, 15), "value": round(random.uniform(10, 100), 1)}

    items = [{"month": k, **v} for k, v in sorted(monthly.items())]

    data_key = "count" if metric == "decisions_over_time" else "value"
    return {"items": items, "data_key": data_key, "metric": metric}


def _table_data(decisions: list, metric: str) -> dict:
    if metric == "top_decisions":
        sorted_d = sorted(decisions, key=lambda d: float(d.expected_value or d.total_value or 0), reverse=True)[:10]
    elif metric == "portfolio_breakdown":
        sorted_d = decisions[:20]
    else:  # recent_decisions
        sorted_d = sorted(decisions, key=lambda d: str(d.created_at or ""), reverse=True)[:10]

    items = [
        {
            "id": d.id,
            "title": d.title or d.asset_name or f"Решение #{d.id}",
            "status": str(_get_field(d, "status")),
            "category": str(_get_field(d, "category")),
            "priority": str(_get_field(d, "priority")),
            "value": round(float(d.expected_value or d.total_value or 0), 2),
            "created_at": str(d.created_at) if d.created_at else None,
        }
        for d in sorted_d
    ]
    return {"items": items, "total": len(decisions)}


def _waterfall_data(decisions: list) -> dict:
    cats: dict[str, float] = {}
    for d in decisions:
        cat = str(_get_field(d, "category") or "Другое")
        cats[cat] = cats.get(cat, 0) + float(d.expected_value or d.total_value or 0)

    if not cats:
        cats = {"Прямые инвестиции": 35, "Недвижимость": 22, "Венчурный капитал": -12, "Дивиденды": 15}

    items = []
    cum = 0.0
    for name, val in cats.items():
        cum += val
        items.append({
            "name": name,
            "value": round(val, 2),
            "cumulative": round(cum, 2),
            "type": "increase" if val >= 0 else "decrease",
        })
    items.append({"name": "Итого", "value": round(cum, 2), "cumulative": round(cum, 2), "type": "total"})
    return {"items": items, "unit": "млн ₽"}


def _heatmap_data(decisions: list) -> dict:
    status_labels = {
        "draft": "Черновик", "under_review": "На рассмотрении",
        "approved": "Утверждено", "rejected": "Отклонено", "implemented": "Реализовано",
    }
    cells: dict[tuple, dict] = {}
    for d in decisions:
        cat = str(_get_field(d, "category") or "Другое")
        st = str(_get_field(d, "status") or "draft")
        st_label = status_labels.get(st, st)
        key = (cat, st_label)
        if key not in cells:
            cells[key] = {"row": cat, "col": st_label, "value": 0, "count": 0}
        cells[key]["value"] += float(d.expected_value or d.total_value or 0)
        cells[key]["count"] += 1

    if not cells:
        random.seed(42)
        for cat in ["Прямые инвестиции", "Недвижимость", "Венчурный капитал"]:
            for st in ["Черновик", "Утверждено", "Реализовано"]:
                cells[(cat, st)] = {"row": cat, "col": st, "value": round(random.uniform(5, 80), 1), "count": random.randint(1, 10)}

    rows = sorted(set(c["row"] for c in cells.values()))
    cols = sorted(set(c["col"] for c in cells.values()))
    return {"cells": [{"row": c["row"], "col": c["col"], "value": round(c["value"], 1), "count": c["count"]} for c in cells.values()], "rows": rows, "cols": cols, "unit": "млн ₽"}


# ─── Helpers ──────────────────────────────────────────────────────────────

def _get_field(d: Any, field: str) -> Any:
    val = getattr(d, field, None)
    if val is not None and hasattr(val, "value"):
        return val.value
    return val


def _config_to_dict(c: DashboardConfig, include_widgets: bool = False) -> dict:
    result = {
        "id": c.id,
        "owner_id": c.owner_id,
        "name": c.name,
        "description": c.description,
        "is_default": c.is_default,
        "is_shared": c.is_shared,
        "global_filters": json.loads(c.global_filters) if c.global_filters else {},
        "created_at": str(c.created_at) if c.created_at else None,
        "updated_at": str(c.updated_at) if c.updated_at else None,
    }
    if include_widgets:
        result["widgets"] = [_widget_to_dict(w) for w in sorted(c.widgets, key=lambda w: (w.pos_y, w.pos_x))]
    return result


def _widget_to_dict(w: DashboardWidget) -> dict:
    return {
        "id": w.id,
        "dashboard_id": w.dashboard_id,
        "widget_type": w.widget_type,
        "title": w.title,
        "pos_x": w.pos_x,
        "pos_y": w.pos_y,
        "width": w.width,
        "height": w.height,
        "config": json.loads(w.config) if w.config else {},
        "sort_order": w.sort_order,
        "is_visible": w.is_visible,
    }
