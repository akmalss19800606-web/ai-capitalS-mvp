"""
CRM Adapter — управление контактами и сделками (dealflow).
Фаза 4, Сессия 3 — EXCH-ADAPT-001.3.

В MVP: внутренний CRM с CRUD.
В продакшене: синхронизация с HubSpot / Salesforce через API.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.models.market_adapters import CrmContact, CrmDeal


# ═══════════════════════════════════════════════════════════════
# CONTACTS
# ═══════════════════════════════════════════════════════════════

def create_contact(db: Session, user_id: int, **kwargs) -> CrmContact:
    contact = CrmContact(user_id=user_id, **kwargs)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def list_contacts(
    db: Session,
    user_id: int,
    contact_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
) -> List[CrmContact]:
    q = db.query(CrmContact).filter(CrmContact.user_id == user_id)
    if contact_type:
        q = q.filter(CrmContact.contact_type == contact_type)
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            or_(
                CrmContact.first_name.ilike(pattern),
                CrmContact.last_name.ilike(pattern),
                CrmContact.company.ilike(pattern),
                CrmContact.email.ilike(pattern),
            )
        )
    return q.order_by(CrmContact.updated_at.desc()).limit(limit).all()


def get_contact(db: Session, contact_id: int) -> Optional[CrmContact]:
    return db.query(CrmContact).filter(CrmContact.id == contact_id).first()


def update_contact(db: Session, contact_id: int, **kwargs) -> Optional[CrmContact]:
    contact = get_contact(db, contact_id)
    if not contact:
        return None
    for k, v in kwargs.items():
        if v is not None:
            setattr(contact, k, v)
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, contact_id: int):
    contact = get_contact(db, contact_id)
    if contact:
        db.delete(contact)
        db.commit()


# ═══════════════════════════════════════════════════════════════
# DEALS
# ═══════════════════════════════════════════════════════════════

def create_deal(db: Session, user_id: int, **kwargs) -> CrmDeal:
    deal = CrmDeal(user_id=user_id, **kwargs)
    db.add(deal)
    db.commit()
    db.refresh(deal)
    return deal


def list_deals(
    db: Session,
    user_id: int,
    stage: Optional[str] = None,
    contact_id: Optional[int] = None,
    limit: int = 100,
) -> List[CrmDeal]:
    q = db.query(CrmDeal).filter(CrmDeal.user_id == user_id)
    if stage:
        q = q.filter(CrmDeal.stage == stage)
    if contact_id:
        q = q.filter(CrmDeal.contact_id == contact_id)
    return q.order_by(CrmDeal.updated_at.desc()).limit(limit).all()


def get_deal(db: Session, deal_id: int) -> Optional[CrmDeal]:
    return db.query(CrmDeal).filter(CrmDeal.id == deal_id).first()


def update_deal(db: Session, deal_id: int, **kwargs) -> Optional[CrmDeal]:
    deal = get_deal(db, deal_id)
    if not deal:
        return None
    for k, v in kwargs.items():
        if v is not None:
            setattr(deal, k, v)
    db.commit()
    db.refresh(deal)
    return deal


def delete_deal(db: Session, deal_id: int):
    deal = get_deal(db, deal_id)
    if deal:
        db.delete(deal)
        db.commit()


def get_pipeline_summary(db: Session, user_id: int) -> Dict[str, Any]:
    """Сводка по pipeline сделок."""
    deals = db.query(CrmDeal).filter(CrmDeal.user_id == user_id).all()

    stages = {}
    total_amount = 0
    weighted_amount = 0

    for d in deals:
        stage = d.stage or "unknown"
        if stage not in stages:
            stages[stage] = {"count": 0, "amount": 0}
        stages[stage]["count"] += 1
        stages[stage]["amount"] += d.amount or 0
        total_amount += d.amount or 0
        weighted_amount += (d.amount or 0) * (d.probability or 0) / 100

    return {
        "total_deals": len(deals),
        "total_amount": round(total_amount, 2),
        "weighted_amount": round(weighted_amount, 2),
        "stages": stages,
    }
