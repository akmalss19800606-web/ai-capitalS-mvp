"""
Decision Relationship model — граф взаимосвязей между решениями.
Поддерживаемые типы связей: depends_on, conflicts_with, alternative_to, duplicates, enables, blocks.

Фаза 1, Сессия 2 — DM-GRAPH-001 (граф зависимостей)
"""
import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class RelationshipType(str, enum.Enum):
    DEPENDS_ON = "depends_on"           # A зависит от B
    CONFLICTS_WITH = "conflicts_with"   # A конфликтует с B
    ALTERNATIVE_TO = "alternative_to"   # A — альтернатива B
    DUPLICATES = "duplicates"           # A дублирует B
    ENABLES = "enables"                 # A делает возможным B
    BLOCKS = "blocks"                   # A блокирует B


class DecisionRelationship(Base):
    """
    Направленная связь между двумя решениями.
    from_decision_id → to_decision_id с типом связи.
    """
    __tablename__ = "decision_relationships"

    id = Column(Integer, primary_key=True, index=True)
    from_decision_id = Column(
        Integer,
        ForeignKey("investment_decisions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_decision_id = Column(
        Integer,
        ForeignKey("investment_decisions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relationship_type = Column(Enum(RelationshipType), nullable=False)
    description = Column(Text, nullable=True)       # пояснение связи
    metadata_json = Column(JSON, nullable=True)      # дополнительные данные
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Уникальность: одна связь определённого типа между парой решений
    __table_args__ = (
        UniqueConstraint(
            "from_decision_id", "to_decision_id", "relationship_type",
            name="uq_decision_relationship",
        ),
    )

    # Relationships
    from_decision = relationship(
        "InvestmentDecision",
        foreign_keys=[from_decision_id],
        backref="outgoing_relationships",
    )
    to_decision = relationship(
        "InvestmentDecision",
        foreign_keys=[to_decision_id],
        backref="incoming_relationships",
    )
    creator = relationship("User", foreign_keys=[created_by])
