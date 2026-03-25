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
from app.db.models.islamic_stage1 import (
    IslamicGlossaryTerm,
    IslamicReferenceRegistry,
    ShariahScreeningCompany,
)

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


def seed_glossary_terms(db: Session):
    data = load_json("islamic_glossary_terms.json")
    for item in data:
        slug = item["slug"]
        exists = db.query(IslamicGlossaryTerm).filter_by(slug=slug).first()
        if not exists:
            db.add(IslamicGlossaryTerm(
                slug=slug,
                term_ru=item.get("term_ru", slug),
                term_ar=item.get("term_ar", ""),
                transliteration=item.get("transliteration", ""),
                definition_ru=item.get("definition_ru", ""),
                category=item.get("category", "concept"),
                standard_ref=item.get("standard_ref", ""),
                standard_org=item.get("standard_org", ""),
                is_published=item.get("is_published", True),
            ))
    db.commit()
    print(f"Seeded {len(data)} glossary terms")


def seed_reference_registry(db: Session):
    data = load_json("islamic_reference_registry.json")
    for item in data:
        code = item["code"]
        reg_type = item["registry_type"]
        exists = db.query(IslamicReferenceRegistry).filter_by(
            registry_type=reg_type, code=code
        ).first()
        if not exists:
            db.add(IslamicReferenceRegistry(
                registry_type=reg_type,
                code=code,
                name_ru=item.get("name_ru", code),
                name_en=item.get("name_en", ""),
                description_ru=item.get("description_ru", ""),
                topic=item.get("topic", ""),
                document_ref=item.get("document_ref", ""),
                is_active=item.get("is_active", True),
            ))
    db.commit()
    print(f"Seeded {len(data)} reference registry entries")


def seed_screening_companies(db: Session):
    data = load_json("shariah_screening_companies.json")
    for item in data:
        ticker = item.get("ticker", "")
        exists = db.query(ShariahScreeningCompany).filter_by(ticker=ticker).first()
        if not exists:
            db.add(ShariahScreeningCompany(
                name_ru=item.get("name_ru", ""),
                name_en=item.get("name_en", ""),
                ticker=ticker,
                isin=item.get("isin", ""),
                registration_no=item.get("registration_no", ""),
                market_type=item.get("market_type", "uzse"),
                sector=item.get("sector", ""),
                subsector=item.get("subsector", ""),
                country=item.get("country", "UZ"),
                source_url=item.get("source_url", ""),
                is_active=item.get("is_active", True),
            ))
    db.commit()
    print(f"Seeded {len(data)} screening companies")


def seed_all():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Starting seed process...")
        seed_islamic_products(db)
        seed_islamic_product_catalog(db)
        seed_posc_rules(db)
        seed_recommendation_rules(db)
        seed_glossary_terms(db)
        seed_reference_registry(db)
        seed_screening_companies(db)
        print("All seeds completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
