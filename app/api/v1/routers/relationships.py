"""
API роутер: граф взаимосвязей решений.
Фаза 1, Сессия 2 — DM-GRAPH-001

Endpoints:
  GET    /decisions/{id}/relationships      — список связей решения
  POST   /decisions/{id}/relationships      — создать связь
  DELETE /decisions/{id}/relationships/{rid} — удалить связь
  GET    /decisions/{id}/graph              — полный граф для визуализации
  GET    /decisions/{id}/impact             — impact analysis
"""
from collections import deque
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.decision_relationship import DecisionRelationship, RelationshipType
from app.db.models.decision_version import AuditEvent
from app.schemas.audit import (
    RelationshipCreate,
    RelationshipRead,
    RelationshipListResponse,
    DecisionGraphResponse,
    GraphNode,
    GraphEdge,
)
from app.api.v1.routers.audit import create_audit_event

router = APIRouter(tags=["relationships"])

RELATIONSHIP_LABELS = {
    "depends_on": "Зависит от",
    "conflicts_with": "Конфликтует с",
    "alternative_to": "Альтернатива",
    "duplicates": "Дублирует",
    "enables": "Делает возможным",
    "blocks": "Блокирует",
}


def _rel_to_read(rel: DecisionRelationship, perspective_id: int) -> dict:
    """Преобразовать ORM-объект связи в dict для RelationshipRead."""
    # Определить «связанное» решение — то, которое не совпадает с perspective_id
    if rel.from_decision_id == perspective_id:
        related = rel.to_decision
    else:
        related = rel.from_decision

    return {
        "id": rel.id,
        "from_decision_id": rel.from_decision_id,
        "to_decision_id": rel.to_decision_id,
        "relationship_type": rel.relationship_type.value if hasattr(rel.relationship_type, "value") else rel.relationship_type,
        "description": rel.description,
        "metadata_json": rel.metadata_json,
        "created_by": rel.created_by,
        "created_at": rel.created_at,
        "related_decision_name": related.asset_name if related else None,
        "related_decision_symbol": related.asset_symbol if related else None,
        "related_decision_status": (related.status.value if hasattr(related.status, "value") else related.status) if related else None,
    }


# ───────────────────────────────────────────────────────────────────────────────
# GET /decisions/{decision_id}/relationships
# ───────────────────────────────────────────────────────────────────────────────
@router.get("/decisions/{decision_id}/relationships", response_model=RelationshipListResponse)
def list_relationships(
    decision_id: int,
    relationship_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список всех связей решения (входящие + исходящие)."""
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")

    query = db.query(DecisionRelationship).filter(
        or_(
            DecisionRelationship.from_decision_id == decision_id,
            DecisionRelationship.to_decision_id == decision_id,
        )
    )

    if relationship_type:
        try:
            rt = RelationshipType(relationship_type)
            query = query.filter(DecisionRelationship.relationship_type == rt)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимый тип связи: {relationship_type}")

    items = query.order_by(DecisionRelationship.created_at.desc()).all()

    return RelationshipListResponse(
        items=[RelationshipRead(**_rel_to_read(r, decision_id)) for r in items],
        total=len(items),
    )


# ───────────────────────────────────────────────────────────────────────────────
# POST /decisions/{decision_id}/relationships
# ───────────────────────────────────────────────────────────────────────────────
@router.post("/decisions/{decision_id}/relationships", response_model=RelationshipRead, status_code=http_status.HTTP_201_CREATED)
def create_relationship(
    decision_id: int,
    rel_in: RelationshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать связь между текущим решением и другим."""
    # Проверка: оба решения принадлежат пользователю
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")

    target = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == rel_in.to_decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Целевое решение не найдено")

    if decision_id == rel_in.to_decision_id:
        raise HTTPException(status_code=400, detail="Нельзя создать связь решения с самим собой")

    # Валидация типа связи
    try:
        rt = RelationshipType(rel_in.relationship_type)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Недопустимый тип связи: {rel_in.relationship_type}. Допустимые: {[t.value for t in RelationshipType]}",
        )

    # Проверка на дубликат
    existing = (
        db.query(DecisionRelationship)
        .filter(
            DecisionRelationship.from_decision_id == decision_id,
            DecisionRelationship.to_decision_id == rel_in.to_decision_id,
            DecisionRelationship.relationship_type == rt,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Такая связь уже существует")

    rel = DecisionRelationship(
        from_decision_id=decision_id,
        to_decision_id=rel_in.to_decision_id,
        relationship_type=rt,
        description=rel_in.description,
        metadata_json=rel_in.metadata_json,
        created_by=current_user.id,
    )
    db.add(rel)

    # Аудит
    create_audit_event(
        db=db,
        entity_type="decision",
        entity_id=decision_id,
        action="relationship_add",
        user_id=current_user.id,
        new_values={
            "to_decision_id": rel_in.to_decision_id,
            "relationship_type": rt.value,
            "description": rel_in.description,
        },
    )

    db.commit()
    db.refresh(rel)

    return RelationshipRead(**_rel_to_read(rel, decision_id))


# ───────────────────────────────────────────────────────────────────────────────
# DELETE /decisions/{decision_id}/relationships/{relationship_id}
# ───────────────────────────────────────────────────────────────────────────────
@router.delete(
    "/decisions/{decision_id}/relationships/{relationship_id}",
    status_code=http_status.HTTP_204_NO_CONTENT,
)
def delete_relationship(
    decision_id: int,
    relationship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить связь."""
    rel = (
        db.query(DecisionRelationship)
        .filter(
            DecisionRelationship.id == relationship_id,
            or_(
                DecisionRelationship.from_decision_id == decision_id,
                DecisionRelationship.to_decision_id == decision_id,
            ),
        )
        .first()
    )
    if not rel:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Связь не найдена")

    # Аудит
    create_audit_event(
        db=db,
        entity_type="decision",
        entity_id=decision_id,
        action="relationship_remove",
        user_id=current_user.id,
        old_values={
            "from_decision_id": rel.from_decision_id,
            "to_decision_id": rel.to_decision_id,
            "relationship_type": rel.relationship_type.value if hasattr(rel.relationship_type, "value") else rel.relationship_type,
        },
    )

    db.delete(rel)
    db.commit()


# ───────────────────────────────────────────────────────────────────────────────
# GET /decisions/{decision_id}/graph — полный граф для визуализации
# ───────────────────────────────────────────────────────────────────────────────
@router.get("/decisions/{decision_id}/graph", response_model=DecisionGraphResponse)
def get_decision_graph(
    decision_id: int,
    depth: int = Query(2, ge=1, le=5, description="Глубина обхода графа"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Построить подграф зависимостей вокруг указанного решения.
    BFS обход до заданной глубины. Возвращает узлы и рёбра для D3.js визуализации.
    """
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")

    # BFS обход
    visited_ids: set[int] = set()
    queue: deque[tuple[int, int]] = deque()  # (decision_id, current_depth)
    queue.append((decision_id, 0))

    all_edges: list[DecisionRelationship] = []

    while queue:
        current_id, current_depth = queue.popleft()
        if current_id in visited_ids:
            continue
        visited_ids.add(current_id)

        if current_depth < depth:
            # Найти все связи текущего решения
            rels = (
                db.query(DecisionRelationship)
                .filter(
                    or_(
                        DecisionRelationship.from_decision_id == current_id,
                        DecisionRelationship.to_decision_id == current_id,
                    )
                )
                .all()
            )
            for r in rels:
                all_edges.append(r)
                neighbor = r.to_decision_id if r.from_decision_id == current_id else r.from_decision_id
                if neighbor not in visited_ids:
                    queue.append((neighbor, current_depth + 1))

    # Собрать узлы
    nodes: list[GraphNode] = []
    for nid in visited_ids:
        d = db.query(InvestmentDecision).filter(InvestmentDecision.id == nid).first()
        if d:
            nodes.append(GraphNode(
                id=d.id,
                asset_name=d.asset_name,
                asset_symbol=d.asset_symbol,
                status=d.status.value if hasattr(d.status, "value") else d.status,
                decision_type=d.decision_type.value if hasattr(d.decision_type, "value") else d.decision_type,
                total_value=d.total_value,
            ))

    # Собрать уникальные рёбра
    seen_edges: set[tuple[int, int, str]] = set()
    edges: list[GraphEdge] = []
    for r in all_edges:
        rt = r.relationship_type.value if hasattr(r.relationship_type, "value") else r.relationship_type
        key = (r.from_decision_id, r.to_decision_id, rt)
        if key not in seen_edges:
            seen_edges.add(key)
            edges.append(GraphEdge(
                source=r.from_decision_id,
                target=r.to_decision_id,
                relationship_type=rt,
                description=r.description,
            ))

    return DecisionGraphResponse(nodes=nodes, edges=edges)


# ───────────────────────────────────────────────────────────────────────────────
# GET /decisions/{decision_id}/impact — impact analysis
# ───────────────────────────────────────────────────────────────────────────────
@router.get("/decisions/{decision_id}/impact")
def get_impact_analysis(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Impact analysis — каскадный расчёт влияния изменений решения на связанные.
    Возвращает список решений, которые будут затронуты.
    """
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")

    # Собрать все решения, затронутые через depends_on, enables, blocks
    impactful_types = {
        RelationshipType.DEPENDS_ON,
        RelationshipType.ENABLES,
        RelationshipType.BLOCKS,
        RelationshipType.CONFLICTS_WITH,
    }

    visited: set[int] = set()
    queue: deque[int] = deque([decision_id])
    impacted: list[dict] = []

    while queue:
        current = queue.popleft()
        if current in visited:
            continue
        visited.add(current)

        # Исходящие связи
        rels = (
            db.query(DecisionRelationship)
            .filter(
                DecisionRelationship.from_decision_id == current,
                DecisionRelationship.relationship_type.in_(impactful_types),
            )
            .all()
        )

        # Входящие depends_on (если кто-то зависит от current)
        rels += (
            db.query(DecisionRelationship)
            .filter(
                DecisionRelationship.to_decision_id == current,
                DecisionRelationship.relationship_type == RelationshipType.DEPENDS_ON,
            )
            .all()
        )

        for r in rels:
            neighbor = r.to_decision_id if r.from_decision_id == current else r.from_decision_id
            if neighbor not in visited:
                queue.append(neighbor)
                d = db.query(InvestmentDecision).filter(InvestmentDecision.id == neighbor).first()
                if d:
                    rt = r.relationship_type.value if hasattr(r.relationship_type, "value") else r.relationship_type
                    impact_type = RELATIONSHIP_LABELS.get(rt, rt)
                    impacted.append({
                        "decision_id": d.id,
                        "asset_name": d.asset_name,
                        "asset_symbol": d.asset_symbol,
                        "status": d.status.value if hasattr(d.status, "value") else d.status,
                        "relationship_type": rt,
                        "impact_description": f"{impact_type}: {d.asset_name} ({d.asset_symbol})",
                        "total_value": d.total_value,
                    })

    total_impacted_value = sum(i.get("total_value") or 0 for i in impacted)

    return {
        "decision_id": decision_id,
        "decision_name": decision.asset_name,
        "total_impacted": len(impacted),
        "total_impacted_value": round(total_impacted_value, 2),
        "impacted_decisions": impacted,
    }
