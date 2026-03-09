"""
Сервис воспроизводимости аналитики (9.2.4).

Принципы:
- Каждый расчёт сохраняет input_data + parameters + result_data
- Результат хэшируется (SHA-256) для верификации
- Можно повторить расчёт и сравнить хэши
- Фиксируется версия движка расчёта
"""
import json
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.models.architectural_principles import AnalyticsSnapshot


def compute_result_hash(result_data: Dict[str, Any]) -> str:
    """Вычислить SHA-256 хэш результата для верификации."""
    # Сортируем ключи для детерминированного хэширования
    canonical = json.dumps(result_data, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def create_snapshot(
    db: Session,
    user_id: int,
    analysis_type: str,
    input_data: Dict[str, Any],
    parameters: Dict[str, Any],
    result_data: Dict[str, Any],
    analysis_id: Optional[int] = None,
    engine_version: Optional[str] = None,
    notes: Optional[str] = None,
) -> AnalyticsSnapshot:
    """Создать снапшот аналитики."""
    result_hash = compute_result_hash(result_data)

    snapshot = AnalyticsSnapshot(
        user_id=user_id,
        analysis_type=analysis_type,
        analysis_id=analysis_id,
        input_data=input_data,
        parameters=parameters,
        result_data=result_data,
        result_hash=result_hash,
        engine_version=engine_version or "1.0.0-mvp",
        is_reproducible=True,
        notes=notes,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def list_snapshots(
    db: Session,
    user_id: int,
    analysis_type: Optional[str] = None,
    limit: int = 50,
) -> List[AnalyticsSnapshot]:
    """Список снапшотов."""
    q = db.query(AnalyticsSnapshot).filter(AnalyticsSnapshot.user_id == user_id)
    if analysis_type:
        q = q.filter(AnalyticsSnapshot.analysis_type == analysis_type)
    return q.order_by(desc(AnalyticsSnapshot.created_at)).limit(limit).all()


def get_snapshot(db: Session, snapshot_id: int) -> Optional[AnalyticsSnapshot]:
    """Получить снапшот по ID."""
    return db.query(AnalyticsSnapshot).filter(AnalyticsSnapshot.id == snapshot_id).first()


def reproduce_analysis(db: Session, snapshot_id: int) -> Dict[str, Any]:
    """
    Воспроизвести аналитику по снапшоту.
    Пересчитывает хэш текущих данных и сравнивает с оригиналом.
    В реальном продакшене здесь будет повторный вызов расчётного движка.
    Для MVP — верифицируем хэш сохранённого результата.
    """
    snapshot = db.query(AnalyticsSnapshot).filter(AnalyticsSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise ValueError("Снапшот не найден")

    # Пересчитываем хэш из сохранённых данных
    new_hash = compute_result_hash(snapshot.result_data)
    is_match = new_hash == snapshot.result_hash

    # Обновляем статистику воспроизводимости
    snapshot.reproduced_at = datetime.now(timezone.utc)
    snapshot.reproduction_count = (snapshot.reproduction_count or 0) + 1
    snapshot.is_reproducible = is_match
    db.commit()
    db.refresh(snapshot)

    return {
        "snapshot_id": snapshot.id,
        "original_hash": snapshot.result_hash,
        "new_hash": new_hash,
        "is_match": is_match,
        "reproduction_count": snapshot.reproduction_count,
        "reproduced_at": snapshot.reproduced_at,
    }


def get_snapshot_stats(db: Session, user_id: int) -> Dict[str, Any]:
    """Статистика снапшотов."""
    q = db.query(AnalyticsSnapshot).filter(AnalyticsSnapshot.user_id == user_id)

    total = q.count()
    reproducible = q.filter(AnalyticsSnapshot.is_reproducible == True).count()
    total_reproductions = db.query(func.sum(AnalyticsSnapshot.reproduction_count)).filter(
        AnalyticsSnapshot.user_id == user_id,
    ).scalar() or 0

    # По типам аналитики
    by_type = {}
    for row in (
        db.query(AnalyticsSnapshot.analysis_type, func.count(AnalyticsSnapshot.id))
        .filter(AnalyticsSnapshot.user_id == user_id)
        .group_by(AnalyticsSnapshot.analysis_type)
        .all()
    ):
        by_type[row[0]] = row[1]

    return {
        "total_snapshots": total,
        "reproducible": reproducible,
        "not_reproducible": total - reproducible,
        "total_reproductions": total_reproductions,
        "reproducibility_rate": round(reproducible / total * 100, 1) if total > 0 else None,
        "by_analysis_type": by_type,
    }
