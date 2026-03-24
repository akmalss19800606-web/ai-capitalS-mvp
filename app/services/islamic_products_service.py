"""
Service layer for Islamic products, PoSC rules, and recommendation rules.
Provides CRUD operations for all three reference tables.
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from app.db.models.islamic_products import IslamicProduct
from app.db.models.posc_rules import PoSCRule
from app.db.models.recommendation_rules import ProductRecommendationRule


# --- Islamic Products ---
def get_all_islamic_products(db: Session) -> List[IslamicProduct]:
    return db.query(IslamicProduct).all()


def get_islamic_product_by_id(db: Session, product_id: str) -> Optional[IslamicProduct]:
    return db.query(IslamicProduct).filter(IslamicProduct.product_id == product_id).first()


def get_islamic_products_by_category(db: Session, category: str) -> List[IslamicProduct]:
    return db.query(IslamicProduct).filter(IslamicProduct.category == category).all()


# --- PoSC Rules ---
def get_all_posc_rules(db: Session) -> List[PoSCRule]:
    return db.query(PoSCRule).all()


def get_posc_rule_by_id(db: Session, rule_id: str) -> Optional[PoSCRule]:
    return db.query(PoSCRule).filter(PoSCRule.rule_id == rule_id).first()


def get_posc_rules_by_category(db: Session, category: str) -> List[PoSCRule]:
    return db.query(PoSCRule).filter(PoSCRule.category == category).all()


def get_posc_rules_by_severity(db: Session, severity: str) -> List[PoSCRule]:
    return db.query(PoSCRule).filter(PoSCRule.severity == severity).all()


# --- Recommendation Rules ---
def get_all_recommendation_rules(db: Session) -> List[ProductRecommendationRule]:
    return db.query(ProductRecommendationRule).all()


def get_recommendation_by_profile(db: Session, profile: str) -> List[ProductRecommendationRule]:
    return db.query(ProductRecommendationRule).filter(
        ProductRecommendationRule.investor_profile == profile
    ).all()


def get_recommendation_by_risk(db: Session, risk: str) -> List[ProductRecommendationRule]:
    return db.query(ProductRecommendationRule).filter(
        ProductRecommendationRule.risk_tolerance == risk
    ).all()
