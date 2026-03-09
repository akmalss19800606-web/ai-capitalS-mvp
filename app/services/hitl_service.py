"""
Сервис Human-in-the-Loop + Объяснимость AI (9.2.1, 9.2.3).

Принципы:
- Система НЕ принимает автономных решений
- Все AI-выводы — рекомендательные
- Каждый AI-вывод сопровождается обоснованием
- Disclaimer-ы обязательны в UI и отчётах
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models.architectural_principles import HitlReview


# ── Стандартные disclaimers (9.4) ──────────────────────────────
DISCLAIMERS = [
    {
        "text": "Все результаты AI-анализа носят рекомендательный характер и не являются инвестиционными рекомендациями.",
        "category": "ai",
        "applies_to": "all_ai_outputs",
        "severity": "warning",
    },
    {
        "text": "Система не является торговой платформой и не осуществляет сделки.",
        "category": "general",
        "applies_to": "trading",
        "severity": "info",
    },
    {
        "text": "AI не является автономным агентом. Все решения принимаются пользователем.",
        "category": "ai",
        "applies_to": "decisions",
        "severity": "warning",
    },
    {
        "text": "Система не гарантирует финансовых результатов. Прошлая доходность не гарантирует будущих результатов.",
        "category": "financial",
        "applies_to": "analytics",
        "severity": "critical",
    },
    {
        "text": "Monte Carlo симуляция основана на стохастических моделях и имеет ограниченную предсказательную силу.",
        "category": "ai",
        "applies_to": "monte_carlo",
        "severity": "info",
    },
    {
        "text": "SHAP-анализ показывает вклад факторов в модель, а не причинно-следственные связи.",
        "category": "ai",
        "applies_to": "shap",
        "severity": "info",
    },
    {
        "text": "Стресс-тестирование моделирует экстремальные сценарии и не претендует на точность прогноза.",
        "category": "ai",
        "applies_to": "stress_test",
        "severity": "info",
    },
    {
        "text": "Due Diligence скоринг — автоматизированная оценка, требующая верификации экспертом.",
        "category": "ai",
        "applies_to": "dd_scoring",
        "severity": "warning",
    },
]


def get_disclaimers(applies_to: Optional[str] = None) -> List[Dict[str, str]]:
    """Получить список disclaimers с опциональной фильтрацией."""
    if applies_to:
        return [d for d in DISCLAIMERS if d["applies_to"] == applies_to or d["applies_to"] == "all_ai_outputs"]
    return DISCLAIMERS


def create_hitl_review(
    db: Session,
    user_id: int,
    ai_output_type: str,
    ai_output_id: Optional[int] = None,
    ai_output_summary: Optional[str] = None,
    ai_confidence: Optional[float] = None,
    explanation_text: Optional[str] = None,
    explanation_factors: Optional[List[Dict[str, Any]]] = None,
) -> HitlReview:
    """Создать HITL ревью для AI-вывода."""
    # Если объяснение не предоставлено, генерируем автоматическое
    if not explanation_text:
        explanation_text = _generate_explanation(ai_output_type, ai_confidence)

    review = HitlReview(
        user_id=user_id,
        ai_output_type=ai_output_type,
        ai_output_id=ai_output_id,
        ai_output_summary=ai_output_summary,
        ai_confidence=ai_confidence,
        status="pending",
        explanation_text=explanation_text,
        explanation_factors=explanation_factors,
        disclaimer_shown=True,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def list_hitl_reviews(
    db: Session,
    user_id: int,
    status: Optional[str] = None,
    ai_output_type: Optional[str] = None,
    limit: int = 50,
) -> List[HitlReview]:
    """Список HITL ревью с фильтрами."""
    q = db.query(HitlReview).filter(HitlReview.user_id == user_id)
    if status:
        q = q.filter(HitlReview.status == status)
    if ai_output_type:
        q = q.filter(HitlReview.ai_output_type == ai_output_type)
    return q.order_by(HitlReview.created_at.desc()).limit(limit).all()


def get_hitl_review(db: Session, review_id: int) -> Optional[HitlReview]:
    """Получить ревью по ID."""
    return db.query(HitlReview).filter(HitlReview.id == review_id).first()


def act_on_review(
    db: Session,
    review_id: int,
    status: str,
    comment: Optional[str] = None,
) -> Optional[HitlReview]:
    """Одобрить/отклонить/вернуть на доработку."""
    review = db.query(HitlReview).filter(HitlReview.id == review_id).first()
    if not review:
        return None

    review.status = status
    review.reviewer_comment = comment
    review.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(review)
    return review


def get_hitl_stats(db: Session, user_id: int) -> Dict[str, Any]:
    """Статистика HITL ревью."""
    q = db.query(HitlReview).filter(HitlReview.user_id == user_id)

    total = q.count()
    pending = q.filter(HitlReview.status == "pending").count()
    approved = q.filter(HitlReview.status == "approved").count()
    rejected = q.filter(HitlReview.status == "rejected").count()
    needs_revision = q.filter(HitlReview.status == "needs_revision").count()

    avg_confidence = db.query(func.avg(HitlReview.ai_confidence)).filter(
        HitlReview.user_id == user_id,
        HitlReview.ai_confidence.isnot(None),
    ).scalar()

    reviewed = approved + rejected
    approval_rate = (approved / reviewed * 100) if reviewed > 0 else None

    return {
        "total_reviews": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "needs_revision": needs_revision,
        "avg_confidence": round(avg_confidence, 2) if avg_confidence else None,
        "approval_rate": round(approval_rate, 1) if approval_rate else None,
    }


def _generate_explanation(ai_output_type: str, confidence: Optional[float]) -> str:
    """Автогенерация обоснования AI-вывода (9.2.3)."""
    conf_str = f" (уровень уверенности: {confidence:.0%})" if confidence else ""
    explanations = {
        "monte_carlo": f"Результат Monte Carlo симуляции{conf_str}. "
                       "Основан на стохастическом моделировании с заданными параметрами распределения. "
                       "Рекомендуется перепроверить входные параметры и сравнить с историческими данными.",
        "shap": f"SHAP-анализ вклада факторов{conf_str}. "
                "Показывает, какие параметры оказали наибольшее влияние на результат модели. "
                "Не является причинно-следственным анализом.",
        "efficient_frontier": f"Оптимизация портфеля по Марковицу{conf_str}. "
                              "Основана на исторической ковариации активов. "
                              "Реальная волатильность может отличаться от исторической.",
        "stress_test": f"Результат стресс-тестирования{conf_str}. "
                       "Моделирует экстремальные сценарии для оценки устойчивости. "
                       "Не является прогнозом вероятных событий.",
        "dd_scoring": f"Автоматический Due Diligence скоринг{conf_str}. "
                      "Комплексная оценка на основе финансовых, юридических и рыночных факторов. "
                      "Требует верификации квалифицированным специалистом.",
    }
    return explanations.get(
        ai_output_type,
        f"AI-анализ типа '{ai_output_type}'{conf_str}. "
        "Результат носит рекомендательный характер и требует экспертной проверки.",
    )
