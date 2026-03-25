"""
Seed script: loads all JSON seed files into the database.
Usage: python -m seeds.seed_all
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.db.models.islamic_products import IslamicProduct
from app.db.models.islamic_stage2 import IslamicProductCatalog
from app.db.models.posc_rules import PoSCRuleSeed
from app.db.models.recommendation_rules import ProductRecommendationRule

SEEDS_DIR = Path(__file__).resolve().parent


def load_json(filename: str) -> list:
    with open(SEEDS_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)


def seed_islamic_products(db: Session):
    data = load_json("islamic_products.json")
    for item in data:
        slug = item["slug"]
        exists = db.query(IslamicProduct).filter_by(product_id=slug).first()
        if not exists:
            db.add(IslamicProduct(
                product_id=slug,
                name=item.get("name_ru", slug),
                name_ar=item.get("name_ar", ""),
                category=item.get("category", ""),
                description=item.get("description_ru", ""),
                shariah_basis=item.get("principle_ru", ""),
                risk_level=item.get("product_type", "medium"),
                data_json=item
            ))
    db.commit()
    print(f"Seeded {len(data)} islamic products")


def seed_islamic_product_catalog(db: Session):
    data = load_json("islamic_products.json")
    for item in data:
        slug = item["slug"]
        exists = db.query(IslamicProductCatalog).filter_by(slug=slug).first()
        if not exists:
            db.add(IslamicProductCatalog(
                slug=slug,
                name_ru=item.get("name_ru", slug),
                name_ar=item.get("name_ar", ""),
                transliteration=item.get("transliteration", ""),
                product_type=item.get("product_type", ""),
                category=item.get("category", ""),
                description_ru=item.get("description_ru", ""),
                principle_ru=item.get("principle_ru", ""),
                allowed_for=item.get("allowed_for", "both"),
                prohibited_elements=item.get("prohibited_elements", []),
                aaoifi_standard_code=item.get("aaoifi_standard_code", ""),
                ifsb_standard_code=item.get("ifsb_standard_code", ""),
                use_cases_ru=item.get("use_cases_ru", []),
                risks_ru=item.get("risks_ru", []),
                typical_tenure=item.get("typical_tenure", ""),
                is_published=item.get("is_published", True),
                sort_order=item.get("sort_order", 0),
            ))
    db.commit()
    print(f"Seeded {len(data)} islamic product catalog entries")


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
        goal = item["goal"]
        tenure = item["tenure"]
        risk = item["risk"]
        product = item["product"]
        rule_id = f"{goal}_{tenure}_{risk}"
        exists = db.query(ProductRecommendationRule).filter_by(rule_id=rule_id).first()
        if not exists:
            db.add(ProductRecommendationRule(
                rule_id=rule_id,
                investor_profile=goal,
                risk_tolerance=risk,
                recommended_products=[product],
                allocation_pct=None,
                notes=f"tenure: {tenure}"
            ))
    db.commit()
    print(f"Seeded {len(data)} recommendation rules")


def seed_all():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Starting seed process...")
        seed_islamic_products(db)
        seed_islamic_product_catalog(db)
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
