"""
Сервис системных ограничений (9.4).

Хранит и управляет disclaimer-ами и ограничениями системы.
Предзагрузка стандартных ограничений при первом запуске.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.models.architectural_principles import SystemConstraint


# Стандартные ограничения из ТЗ (9.4)
DEFAULT_CONSTRAINTS = [
    {
        "constraint_key": "not_trading_platform",
        "title": "Система не является торговой платформой",
        "description": "AI Capital Management — аналитическая платформа для поддержки принятия решений. "
                       "Система не выполняет и не может выполнять торговые операции, биржевые сделки "
                       "или иные финансовые транзакции от имени пользователя.",
        "category": "general",
        "severity": "critical",
    },
    {
        "constraint_key": "ai_not_autonomous",
        "title": "AI не является автономным агентом",
        "description": "Все AI-компоненты системы работают исключительно в рекомендательном режиме. "
                       "Система не принимает решений без участия человека (Human-in-the-Loop). "
                       "Окончательное решение всегда остаётся за пользователем.",
        "category": "ai",
        "severity": "critical",
    },
    {
        "constraint_key": "no_financial_guarantee",
        "title": "Система не гарантирует финансовых результатов",
        "description": "Прогнозы, оценки и рекомендации системы основаны на статистических моделях "
                       "и исторических данных. Прошлая доходность не гарантирует будущих результатов. "
                       "Пользователь несёт полную ответственность за свои инвестиционные решения.",
        "category": "financial",
        "severity": "critical",
    },
    {
        "constraint_key": "disclaimers_required",
        "title": "Disclaimers обязательны в UI и отчётах",
        "description": "Все страницы с AI-аналитикой, отчёты и экспортируемые документы должны "
                       "содержать соответствующие предупреждения об ограничениях системы. "
                       "Удаление или скрытие disclaimers запрещено.",
        "category": "legal",
        "severity": "warning",
    },
    {
        "constraint_key": "data_quality_dependency",
        "title": "Качество анализа зависит от входных данных",
        "description": "Точность AI-моделей и аналитических расчётов напрямую зависит от качества, "
                       "полноты и актуальности входных данных. Система не может компенсировать "
                       "неточности или пробелы в исходных данных.",
        "category": "ai",
        "severity": "info",
    },
    {
        "constraint_key": "event_sourcing_immutability",
        "title": "События не подлежат изменению или удалению",
        "description": "Все записанные системные события (Event Sourcing) являются иммутабельными. "
                       "Это обеспечивает полную аудиторскую trail и воспроизводимость. "
                       "Корректировки выполняются только через компенсирующие события.",
        "category": "general",
        "severity": "info",
    },
    {
        "constraint_key": "reproducibility_principle",
        "title": "Принцип воспроизводимости аналитики",
        "description": "Все аналитические расчёты должны быть воспроизводимы при тех же входных данных "
                       "и параметрах. Снапшоты аналитики сохраняют полный контекст (input, parameters, result) "
                       "и хэш результата для верификации.",
        "category": "ai",
        "severity": "info",
    },
]


def seed_default_constraints(db: Session) -> int:
    """Предзагрузка стандартных ограничений (идемпотентно)."""
    count = 0
    for c in DEFAULT_CONSTRAINTS:
        existing = db.query(SystemConstraint).filter(
            SystemConstraint.constraint_key == c["constraint_key"]
        ).first()
        if not existing:
            db.add(SystemConstraint(**c))
            count += 1
    if count > 0:
        db.commit()
    return count


def list_constraints(
    db: Session,
    category: Optional[str] = None,
    active_only: bool = True,
) -> List[SystemConstraint]:
    """Список ограничений."""
    q = db.query(SystemConstraint)
    if active_only:
        q = q.filter(SystemConstraint.is_active == True)
    if category:
        q = q.filter(SystemConstraint.category == category)
    return q.order_by(SystemConstraint.severity.desc(), SystemConstraint.id).all()


def get_constraint(db: Session, constraint_id: int) -> Optional[SystemConstraint]:
    return db.query(SystemConstraint).filter(SystemConstraint.id == constraint_id).first()


def create_constraint(db: Session, **kwargs) -> SystemConstraint:
    c = SystemConstraint(**kwargs)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def update_constraint(db: Session, constraint_id: int, **kwargs) -> Optional[SystemConstraint]:
    c = db.query(SystemConstraint).filter(SystemConstraint.id == constraint_id).first()
    if not c:
        return None
    for k, v in kwargs.items():
        if v is not None:
            setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


def delete_constraint(db: Session, constraint_id: int) -> bool:
    c = db.query(SystemConstraint).filter(SystemConstraint.id == constraint_id).first()
    if not c:
        return False
    db.delete(c)
    db.commit()
    return True


def get_ui_disclaimers(db: Session) -> List[Dict[str, Any]]:
    """Получить ограничения для отображения в UI."""
    constraints = db.query(SystemConstraint).filter(
        SystemConstraint.is_active == True,
        SystemConstraint.display_in_ui == True,
    ).all()
    return [
        {
            "key": c.constraint_key,
            "title": c.title,
            "description": c.description,
            "category": c.category,
            "severity": c.severity,
        }
        for c in constraints
    ]


def get_report_disclaimers(db: Session) -> List[Dict[str, str]]:
    """Получить ограничения для включения в отчёты."""
    constraints = db.query(SystemConstraint).filter(
        SystemConstraint.is_active == True,
        SystemConstraint.display_in_reports == True,
    ).all()
    return [
        {"title": c.title, "description": c.description, "severity": c.severity}
        for c in constraints
    ]
