"""
Decision Relationship model вЂ” РіСЂР°С„ РІР·Р°РёРјРѕСЃРІСЏР·РµР№ РјРµР¶РґСѓ СЂРµС€РµРЅРёСЏРјРё.
РџРѕРґРґРµСЂР¶РёРІР°РµРјС‹Рµ С‚РёРїС‹ СЃРІСЏР·РµР№: depends_on, conflicts_with, alternative_to, duplicates, enables, blocks.

Р¤Р°Р·Р° 1, РЎРµСЃСЃРёСЏ 2 вЂ” DM-GRAPH-001 (РіСЂР°С„ Р·Р°РІРёСЃРёРјРѕСЃС‚РµР№)
"""
import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class RelationshipType(str, enum.Enum):
    DEPENDS_ON = "depends_on"           # A Р·Р°РІРёСЃРёС‚ РѕС‚ B
    CONFLICTS_WITH = "conflicts_with"   # A РєРѕРЅС„Р»РёРєС‚СѓРµС‚ СЃ B
    ALTERNATIVE_TO = "alternative_to"   # A вЂ” Р°Р»СЊС‚РµСЂРЅР°С‚РёРІР° B
    DUPLICATES = "duplicates"           # A РґСѓР±Р»РёСЂСѓРµС‚ B
    ENABLES = "enables"                 # A РґРµР»Р°РµС‚ РІРѕР·РјРѕР¶РЅС‹Рј B
    BLOCKS = "blocks"                   # A Р±Р»РѕРєРёСЂСѓРµС‚ B


class DecisionRelationship(Base):
    """
    РќР°РїСЂР°РІР»РµРЅРЅР°СЏ СЃРІСЏР·СЊ РјРµР¶РґСѓ РґРІСѓРјСЏ СЂРµС€РµРЅРёСЏРјРё.
    from_decision_id в†’ to_decision_id СЃ С‚РёРїРѕРј СЃРІСЏР·Рё.
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
    description = Column(Text, nullable=True)       # РїРѕСЏСЃРЅРµРЅРёРµ СЃРІСЏР·Рё
    metadata_json = Column(JSON, nullable=True)      # РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Рµ РґР°РЅРЅС‹Рµ
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # РЈРЅРёРєР°Р»СЊРЅРѕСЃС‚СЊ: РѕРґРЅР° СЃРІСЏР·СЊ РѕРїСЂРµРґРµР»С‘РЅРЅРѕРіРѕ С‚РёРїР° РјРµР¶РґСѓ РїР°СЂРѕР№ СЂРµС€РµРЅРёР№
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
