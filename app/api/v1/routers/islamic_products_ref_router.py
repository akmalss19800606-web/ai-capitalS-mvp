"""
API routers for Islamic products, PoSC rules, and recommendation rules.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.schemas.islamic_products import (
    IslamicProductOut, PoSCRuleOut, RecommendationRuleOut
)
from app.services.islamic_products_service import (
    get_all_islamic_products, get_islamic_product_by_id,
    get_islamic_products_by_category,
    get_all_posc_rules, get_posc_rule_by_id,
    get_posc_rules_by_category, get_posc_rules_by_severity,
    get_all_recommendation_rules, get_recommendation_by_profile,
    get_recommendation_by_risk
)

router = APIRouter()


# --- Islamic Products endpoints ---
@router.get("/products", response_model=List[IslamicProductOut])
def list_products(category: Optional[str] = None, db: Session = Depends(get_db)):
    if category:
        return get_islamic_products_by_category(db, category)
    return get_all_islamic_products(db)


@router.get("/products/{product_id}", response_model=IslamicProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = get_islamic_product_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# --- PoSC Rules endpoints ---
@router.get("/posc-rules", response_model=List[PoSCRuleOut])
def list_posc_rules(
    category: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if category:
        return get_posc_rules_by_category(db, category)
    if severity:
        return get_posc_rules_by_severity(db, severity)
    return get_all_posc_rules(db)


@router.get("/posc-rules/{rule_id}", response_model=PoSCRuleOut)
def get_posc_rule(rule_id: str, db: Session = Depends(get_db)):
    rule = get_posc_rule_by_id(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="PoSC rule not found")
    return rule


# --- Recommendation Rules endpoints ---
@router.get("/recommendations", response_model=List[RecommendationRuleOut])
def list_recommendations(
    profile: Optional[str] = None,
    risk: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if profile:
        return get_recommendation_by_profile(db, profile)
    if risk:
        return get_recommendation_by_risk(db, risk)
    return get_all_recommendation_rules(db)
