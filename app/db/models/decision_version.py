"""
Decision Version model вЂ” С…СЂР°РЅРёС‚ РїРѕР»РЅС‹Рµ СЃРЅРёРјРєРё (snapshots) СЂРµС€РµРЅРёСЏ РїСЂРё РєР°Р¶РґРѕРј РёР·РјРµРЅРµРЅРёРё.
РџРѕР·РІРѕР»СЏРµС‚: РёСЃС‚РѕСЂРёСЋ РёР·РјРµРЅРµРЅРёР№, diff РјРµР¶РґСѓ РІРµСЂСЃРёСЏРјРё, rollback.

Р¤Р°Р·Р° 1, РЎРµСЃСЃРёСЏ 2 вЂ” DM-AUDIT-001 (РІРµСЂСЃРёРѕРЅРёСЂРѕРІР°РЅРёРµ Рё Р°СѓРґРёС‚)
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class DecisionVersion(Base):
    """
    РРјРјСѓС‚Р°Р±РµР»СЊРЅС‹Р№ СЃРЅРёРјРѕРє СЂРµС€РµРЅРёСЏ.
    РљР°Р¶РґС‹Р№ СЂР°Р· РїСЂРё РёР·РјРµРЅРµРЅРёРё СЂРµС€РµРЅРёСЏ СЃРѕР·РґР°С‘С‚СЃСЏ РЅРѕРІР°СЏ Р·Р°РїРёСЃСЊ СЃ РїРѕР»РЅС‹Рј СЃРЅРёРјРєРѕРј РІСЃРµС… РїРѕР»РµР№.
    """
    __tablename__ = "decision_versions"

    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("investment_decisions.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)  # 1, 2, 3, ...

    # РЎРЅРёРјРѕРє РІСЃРµС… РїРѕР»РµР№ СЂРµС€РµРЅРёСЏ РЅР° РјРѕРјРµРЅС‚ РІРµСЂСЃРёРё
    snapshot = Column(JSON, nullable=False)  # РїРѕР»РЅС‹Р№ dict РІСЃРµС… РїРѕР»РµР№

    # РњРµС‚Р°-РґР°РЅРЅС‹Рµ РёР·РјРµРЅРµРЅРёСЏ
    change_type = Column(String, nullable=False)  # created, updated, status_changed, rolledback
    changed_fields = Column(JSON, nullable=True)   # ["status", "amount", "price"] вЂ” РєР°РєРёРµ РїРѕР»СЏ РёР·РјРµРЅРёР»РёСЃСЊ
    change_reason = Column(Text, nullable=True)     # РїСЂРёС‡РёРЅР° РёР·РјРµРЅРµРЅРёСЏ (РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РјРѕР¶РµС‚ СѓРєР°Р·Р°С‚СЊ)

    # РљС‚Рѕ Рё РєРѕРіРґР°
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    decision = relationship("InvestmentDecision", backref="versions")
    author = relationship("User", foreign_keys=[changed_by])


class AuditEvent(Base):
    """
    Р Р°СЃС€РёСЂРµРЅРЅС‹Р№ Р°СѓРґРёС‚РѕСЂСЃРєРёР№ СЃР»РµРґ вЂ” РєС‚Рѕ, РєРѕРіРґР°, С‡С‚Рѕ, РїРѕС‡РµРјСѓ.
    Р—Р°РїРёСЃС‹РІР°РµС‚СЃСЏ РґР»СЏ РІСЃРµС… Р·РЅР°С‡РёРјС‹С… РґРµР№СЃС‚РІРёР№ РІ СЃРёСЃС‚РµРјРµ.
    """
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)

    # Р§С‚Рѕ РїСЂРѕРёР·РѕС€Р»Рѕ
    entity_type = Column(String, nullable=False, index=True)  # "decision", "portfolio", "user"
    entity_id = Column(Integer, nullable=False, index=True)
    action = Column(String, nullable=False)  # "create", "update", "delete", "status_change", "rollback", "relationship_add", "relationship_remove"

    # Р”РµС‚Р°Р»Рё РёР·РјРµРЅРµРЅРёСЏ
    old_values = Column(JSON, nullable=True)   # Р·РЅР°С‡РµРЅРёСЏ РґРѕ РёР·РјРµРЅРµРЅРёСЏ
    new_values = Column(JSON, nullable=True)   # Р·РЅР°С‡РµРЅРёСЏ РїРѕСЃР»Рµ РёР·РјРµРЅРµРЅРёСЏ
    metadata_json = Column(JSON, nullable=True)  # РґРѕРї. РєРѕРЅС‚РµРєСЃС‚

    # РљС‚Рѕ Рё РєРѕРіРґР°
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
