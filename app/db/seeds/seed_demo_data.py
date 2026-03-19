"""Seed demo data: chart_of_accounts + Islamic Finance"""
import asyncio
from app.db.session import SessionLocal
from app.db.seeds.chart_of_accounts_seed import seed_chart_of_accounts

def seed_demo_data():
    db = SessionLocal()
    try:
        asyncio.get_event_loop().run_until_complete(seed_chart_of_accounts(db))
        print("[OK] Chart of accounts seeded")
        from app.db.models.islamic_finance import (
            IslamicGlossary, HaramIndustryDB, SSBMember, SSBFatwa
        )
        glossary = [
            {"term_arabic": "مرابحة", "transliteration": "Murabaha", "term_ru": "Мурабаха", "term_uz": "Murobaha", "definition": "Cost-plus financing"},
            {"term_arabic": "إجارة", "transliteration": "Ijara", "term_ru": "Иджара", "term_uz": "Ijara", "definition": "Lease financing"},
            {"term_arabic": "صكوك", "transliteration": "Sukuk", "term_ru": "Сукук", "term_uz": "Sukuk", "definition": "Islamic bonds"},
            {"term_arabic": "تكافل", "transliteration": "Takaful", "term_ru": "Такафул", "term_uz": "Takaful", "definition": "Islamic insurance"},
            {"term_arabic": "مشاركة", "transliteration": "Musharaka", "term_ru": "Мушарака", "term_uz": "Musharaka", "definition": "Partnership"},
            {"term_arabic": "مضاربة", "transliteration": "Mudaraba", "term_ru": "Мудараба", "term_uz": "Mudaraba", "definition": "Profit-sharing"},
            {"term_arabic": "ربا", "transliteration": "Riba", "term_ru": "Риба", "term_uz": "Ribo", "definition": "Interest - prohibited"},
            {"term_arabic": "غرر", "transliteration": "Gharar", "term_ru": "Гарар", "term_uz": "Garor", "definition": "Excessive uncertainty"},
            {"term_arabic": "ميسر", "transliteration": "Maysir", "term_ru": "Майсир", "term_uz": "Maysir", "definition": "Gambling - prohibited"},
        ]
        for t in glossary:
            if not db.query(IslamicGlossary).filter_by(term_ru=t["term_ru"]).first():
                db.add(IslamicGlossary(**t))
        db.commit()
        print("[OK] Glossary seeded")
        haram = [
            {"name_ru": "Алкоголь", "name_uz": "Alkogol", "category": "production", "reason": "Haram substance"},
            {"name_ru": "Табак", "name_uz": "Tamaki", "category": "production", "reason": "Harmful substance"},
            {"name_ru": "Азартные игры", "name_uz": "Qimor", "category": "services", "reason": "Maysir"},
            {"name_ru": "Свинина", "name_uz": "Cho'chqa", "category": "production", "reason": "Haram food"},
            {"name_ru": "Оружие", "name_uz": "Qurol", "category": "production", "reason": "Harm to people"},
            {"name_ru": "Конв финансы", "name_uz": "Moliya", "category": "finance", "reason": "Riba-based"},
        ]
        for h in haram:
            if not db.query(HaramIndustryDB).filter_by(name_ru=h["name_ru"]).first():
                db.add(HaramIndustryDB(**h))
        db.commit()
        print("[OK] Haram industries seeded")
        ssb = [
            {"full_name": "Dr. Ahmad Al-Raysuni", "qualifications": "PhD Islamic Jurisprudence", "is_active": True},
            {"full_name": "Dr. Muhammad Daud Bakar", "qualifications": "PhD Islamic Finance", "is_active": True},
            {"full_name": "Sheikh Nizam Yaquby", "qualifications": "Islamic Scholar", "is_active": True},
        ]
        for m in ssb:
            if not db.query(SSBMember).filter_by(full_name=m["full_name"]).first():
                db.add(SSBMember(**m))
        db.commit()
        print("[OK] SSB Members seeded")
        fatwas = [
            {"subject": "Murabaha permissibility", "product_type": "contract", "decision": "Approved", "status": "approved"},
            {"subject": "Sukuk al-Ijara structure", "product_type": "instrument", "decision": "Approved", "status": "approved"},
            {"subject": "Takaful model review", "product_type": "insurance", "decision": "Under review", "status": "under_review"},
        ]
        for f in fatwas:
            if not db.query(SSBFatwa).filter_by(subject=f["subject"]).first():
                db.add(SSBFatwa(**f))
        db.commit()
        print("[OK] SSB Fatwas seeded")
        print("=== All seed data loaded ===")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
