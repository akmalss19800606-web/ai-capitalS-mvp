"""
Pydantic-схемы для аудита, версионирования и связей решений.
Фаза 1, Сессия 2
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel


# ─── Версионирование ──────────────────────────────────────────────────────────

class DecisionVersionRead(BaseModel):
    id: int
    decision_id: int
    version_number: int
    snapshot: Dict[str, Any]
    change_type: str
    changed_fields: Optional[List[str]] = None
    change_reason: Optional[str] = None
    changed_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class DecisionVersionListResponse(BaseModel):
    items: List[DecisionVersionRead]
    total: int


class DecisionDiffResponse(BaseModel):
    """Результат сравнения двух версий."""
    decision_id: int
    version_a: int
    version_b: int
    changes: List[Dict[str, Any]]
    # Каждый элемент: {"field": "amount", "old": 100, "new": 200}


class RollbackRequest(BaseModel):
    reason: Optional[str] = None


class RollbackResponse(BaseModel):
    decision_id: int
    rolled_back_to_version: int
    new_version_number: int
    message: str


# ─── Аудиторский след ─────────────────────────────────────────────────────────

class AuditEventRead(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    action: str
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    metadata_json: Optional[Dict[str, Any]] = None
    user_id: int
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditEventListResponse(BaseModel):
    items: List[AuditEventRead]
    total: int


# ─── Связи решений ────────────────────────────────────────────────────────────

class RelationshipCreate(BaseModel):
    to_decision_id: int
    relationship_type: str  # depends_on, conflicts_with, alternative_to, duplicates, enables, blocks
    description: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None


class RelationshipRead(BaseModel):
    id: int
    from_decision_id: int
    to_decision_id: int
    relationship_type: str
    description: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_by: int
    created_at: datetime
    # Дополнительно — данные связанного решения
    related_decision_name: Optional[str] = None
    related_decision_symbol: Optional[str] = None
    related_decision_status: Optional[str] = None

    class Config:
        from_attributes = True


class RelationshipListResponse(BaseModel):
    items: List[RelationshipRead]
    total: int


class GraphNode(BaseModel):
    """Узел графа для визуализации."""
    id: int
    asset_name: str
    asset_symbol: str
    status: str
    decision_type: str
    total_value: Optional[float] = None


class GraphEdge(BaseModel):
    """Ребро графа для визуализации."""
    source: int
    target: int
    relationship_type: str
    description: Optional[str] = None


class DecisionGraphResponse(BaseModel):
    """Полный граф зависимостей для визуализации."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
