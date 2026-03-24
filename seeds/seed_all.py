"""
Seed script: loads all JSON seed files into the database.
Usage: python -m seeds.seed_all
"""
import json
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.db.models.islamic_products import IslamicProduct
from app.db.models.posc_rules import PoSCRuleSeed
from app.db.models.recommendation_rules import ProductRecommendationRule

SEEDS_DIR = Path(__file__).resolve().parent


def load_json(filename: str) -> list:
    filepath = SEEDS_DIR / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def seed_islamic_products(db: Session):
    data = load_json("islamic_products.json")
    for item in data:
        exists = db.query(IslamicProduct).filter_by(product_id=item["id"]).first()
        if not exists:
            db.add(IslamicProduct(
                product_id=item["id"],
                name=item["name"],
                name_ar=item.get("name_ar", ""),
                category=item["category"],
                description=item["description"],
                shariah_basis=item.get("shariah_basis", ""),
                risk_level=item.get("risk_level", "medium"),
                data_json=item
            ))
    db.commit()
    print(f"Seeded {len(data)} islamic products")


def seed_posc_rules(db: Session):
    data = load_json("posc_rules.json")
    for item in data:
        exists = db.query(PoSCRuleSeed).filter_by(rule_id=item["id"]).first()
        if not exists:
            db.add(PoSCRuleSeed(
                rule_id=item["id"],
                rule_name=item["rule_name"],
                category=item["category"],
                description=item["description"],
                severity=item["severity"],
                applicable_products=item["applicable_products"],
                references=item["references"],
                threshold=item.get("threshold")
            ))
    db.commit()
    print(f"Seeded {len(data)} PoSC rules")


def seed_recommendation_rules(db: Session):
    data = load_json("product_recommendation_rules.json")
    for item in data:
        exists = db.query(ProductRecommendationRule).filter_by(rule_id=item["id"]).first()
        if not exists:
            db.add(ProductRecommendationRule(
                rule_id=item["id"],
                investor_profile=item["investor_profile"],
                risk_tolerance=item["risk_tolerance"],
                recommended_products=item["recommended_products"],
                allocation_pct=item.get("allocation_pct"),
                notes=item.get("notes", "")
            ))
    db.commit()
    print(f"Seeded {len(data)} recommendation rules")


def seed_all():
    """Run all seed functions."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Starting seed process...")
        seed_islamic_products(db)
        seed_posc_rules(db)
        seed_recommendation_rules(db)
        print("All seeds completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
