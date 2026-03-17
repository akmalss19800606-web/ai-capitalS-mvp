"""
Seed demo data: chart_of_accounts + Islamic Finance
"""
from app.db.session import SessionLocal
from app.db.seeds.chart_of_accounts_seed import seed_chart_of_accounts


def seed_demo_data():
    db = SessionLocal()
    try:
        # 1. Chart of Accounts (NSBU)
        seed_chart_of_accounts(db)
        print("[OK] Chart of accounts seeded")

        # 2. Islamic Finance: Glossary
        from app.db.models.islamic_finance_models import (
            IslamicGlossary, HaramIndustry, SSBMember, SSBFatwa
        )
      
        glossary_terms = [
            {"term_ar": "Murabaha", "term_ru": "Мурабаха", "term_uz": "Murobaha", "definition": "Cost-plus financing", "category": "contract"},
            {"term_ar": "Ijara", "term_ru": "Иджара", "term_uz": "Ijara", "definition": "Lease financing", "category": "contract"},
            {"term_ar": "Sukuk", "term_ru": "Сукук", "term_uz": "Sukuk", "definition": "Islamic bonds", "category": "instrument"},
            {"term_ar": "Takaful", "term_ru": "Такафул", "term_uz": "Takaful", "definition": "Islamic insurance", "category": "instrument"},
            {"term_ar": "Musharaka", "term_ru": "Мушарака", "term_uz": "Musharaka", "definition": "Partnership", "category": "contract"},
            {"term_ar": "Mudaraba", "term_ru": "Мудараба", "term_uz": "Mudaraba", "definition": "Profit-sharing", "category": "contract"},
            {"term_ar": "Wakala", "term_ru": "Вакала", "term_uz": "Vakala", "definition": "Agency contract", "category": "contract"},
            {"term_ar": "Riba", "term_ru": "Риба", "term_uz": "Ribo", "definition": "Interest (prohibited)", "category": "prohibition"},
            {"term_ar": "Gharar", "term_ru": "Гарар", "term_uz": "G'aror", "definition": "Excessive uncertainty", "category": "prohibition"},
            {"term_ar": "Maysir", "term_ru": "Майсир", "term_uz": "Maysir", "definition": "Gambling (prohibited)", "category": "prohibition"},
        ]
              for t in glossary_terms:
            exists = db.query(IslamicGlossary).filter_by(term_ar=t["term_ar"]).first()
            if not exists:
                db.add(IslamicGlossary(**t))
        db.commit()
        print("[OK] Glossary seeded")

        # 3. Haram Industries
        haram_list = [
            {"name_en": "Alcohol", "name_ru": "Алкоголь", "category": "production"},
            {"name_en": "Tobacco", "name_ru": "Табак", "category": "production"},
            {"name_en": "Gambling", "name_ru": "Азартные игры", "category": "services"},
            {"name_en": "Pork", "name_ru": "Свинина", "category": "production"},
            {"name_en": "Weapons", "name_ru": "Оружие", "category": "production"},
            {"name_en": "Adult Entertainment", "name_ru": "Взрослые развлечения", "category": "services"},
            {"name_en": "Conventional Finance", "name_ru": "Конвенциональные финансы", "category": "finance"},
        ]
        for h in haram_list:
            exists = db.query(HaramIndustry).filter_by(name_en=h["name_en"]).first()
            if not exists:
                db.add(HaramIndustry(**h))
        db.commit()
        print("[OK] Haram industries seeded")
      
        # 4. SSB Members
        ssb_members = [
            {"name": "Dr. Ahmad Al-Raysuni", "role": "Chairman", "qualification": "PhD Islamic Jurisprudence"},
            {"name": "Dr. Muhammad Daud Bakar", "role": "Member", "qualification": "PhD Islamic Finance"},
            {"name": "Sheikh Nizam Yaquby", "role": "Member", "qualification": "Islamic Scholar"},
        ]
        for m in ssb_members:
            exists = db.query(SSBMember).filter_by(name=m["name"]).first()
            if not exists:
                db.add(SSBMember(**m))
        db.commit()
        print("[OK] SSB Members seeded")

        # 5. SSB Fatwas
        ssb_fatwas = [
            {"title": "Murabaha permissibility", "status": "approved", "category": "contract"},
            {"title": "Sukuk al-Ijara structure", "status": "approved", "category": "instrument"},
            {"title": "Takaful model review", "status": "under_review", "category": "insurance"},
        ]
        for f in ssb_fatwas:
            exists = db.query(SSBFatwa).filter_by(title=f["title"]).first()
            if not exists:
                db.add(SSBFatwa(**f))
        db.commit()
        print("[OK] SSB Fatwas seeded")
      
        print("\n=== All seed data loaded ===")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
