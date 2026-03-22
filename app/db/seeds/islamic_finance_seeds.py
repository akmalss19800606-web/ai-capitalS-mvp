"""
Seed data for Islamic Finance module.
Run: python -m app.db.seeds.islamic_finance_seeds
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from app.db.session import SessionLocal
from app.db.models.islamic_finance import IslamicGlossary, HaramIndustryDB, SSBMember

GLOSSARY = [
    {"term_arabic": "\u0645\u0631\u0627\u0628\u062d\u0629", "transliteration": "Murabaha", "term_ru": "Мурабаха", "term_uz": "Murobaha", "definition": "Cost-plus financing where seller discloses cost and markup.", "aaoifi_ref": "SS 8"},
    {"term_arabic": "\u0645\u0636\u0627\u0631\u0628\u0629", "transliteration": "Mudaraba", "term_ru": "Мудараба", "term_uz": "Mudaraba", "definition": "Profit-sharing partnership: one provides capital, other manages.", "aaoifi_ref": "SS 13"},
    {"term_arabic": "\u0645\u0634\u0627\u0631\u0643\u0629", "transliteration": "Musharaka", "term_ru": "Мушарака", "term_uz": "Mushoraka", "definition": "Joint venture where all partners contribute capital and share profits/losses.", "aaoifi_ref": "SS 12"},
    {"term_arabic": "\u0625\u062c\u0627\u0631\u0629", "transliteration": "Ijarah", "term_ru": "Иджара", "term_uz": "Ijara", "definition": "Lease contract; ownership stays with lessor.", "aaoifi_ref": "SS 9"},
    {"term_arabic": "\u0633\u0644\u0645", "transliteration": "Salam", "term_ru": "Салам", "term_uz": "Salom", "definition": "Forward sale: full payment now, delivery later.", "aaoifi_ref": "SS 10"},
    {"term_arabic": "\u0627\u0633\u062a\u0635\u0646\u0627\u0639", "transliteration": "Istisna", "term_ru": "Истисна", "term_uz": "Istisno", "definition": "Manufacturing contract: payment in stages, delivery upon completion.", "aaoifi_ref": "SS 11"},
    {"term_arabic": "\u0635\u0643\u0648\u0643", "transliteration": "Sukuk", "term_ru": "Сукук", "term_uz": "Sukuk", "definition": "Islamic bonds backed by tangible assets.", "aaoifi_ref": "SS 17"},
    {"term_arabic": "\u062a\u0643\u0627\u0641\u0644", "transliteration": "Takaful", "term_ru": "Такафул", "term_uz": "Takaful", "definition": "Islamic cooperative insurance based on mutual assistance.", "aaoifi_ref": "SS 26"},
    {"term_arabic": "\u0631\u0628\u0627", "transliteration": "Riba", "term_ru": "Риба (ростовщичество)", "term_uz": "Ribo", "definition": "Interest/usury - strictly prohibited in Islam.", "aaoifi_ref": "SS 1"},
    {"term_arabic": "\u063a\u0631\u0631", "transliteration": "Gharar", "term_ru": "Гарар (неопределённость)", "term_uz": "G'aror", "definition": "Excessive uncertainty in contracts - prohibited.", "aaoifi_ref": "SS 1"},
    {"term_arabic": "\u0645\u064a\u0633\u0631", "transliteration": "Maysir", "term_ru": "Майсир (азартные игры)", "term_uz": "Maysir", "definition": "Gambling - prohibited in all forms.", "aaoifi_ref": "SS 1"},
    {"term_arabic": "\u0632\u0643\u0627\u0629", "transliteration": "Zakat", "term_ru": "Закят", "term_uz": "Zakot", "definition": "Obligatory alms (2.5% of wealth above nisab).", "aaoifi_ref": "SS 35"},
    {"term_arabic": "\u062d\u0648\u0644", "transliteration": "Hawl", "term_ru": "Хауль (лунный год)", "term_uz": "Havl", "definition": "One lunar year - minimum holding period for zakat obligation.", "aaoifi_ref": "SS 35"},
    {"term_arabic": "\u0646\u0635\u0627\u0628", "transliteration": "Nisab", "term_ru": "Нисаб", "term_uz": "Nisob", "definition": "Minimum wealth threshold for zakat (85g gold or 595g silver).", "aaoifi_ref": "SS 35"},
    {"term_arabic": "\u0648\u0642\u0641", "transliteration": "Waqf", "term_ru": "Вакф", "term_uz": "Vaqf", "definition": "Charitable endowment - dedicated asset for public benefit.", "aaoifi_ref": "SS 33"},
]

HARAM_INDUSTRIES = [
    {"oked_code": "1101", "name_ru": "Производство алкогольных напитков", "name_uz": "Spirtli ichimliklar ishlab chiqarish", "category": "alcohol", "reason": "Производство и торговля алкоголем запрещены (харам)"},
    {"oked_code": "1200", "name_ru": "Производство табачных изделий", "name_uz": "Tamaki mahsulotlari ishlab chiqarish", "category": "tobacco", "reason": "Табак наносит вред здоровью - макрух/харам"},
    {"oked_code": "9200", "name_ru": "Азартные игры и тотализаторы", "name_uz": "Qimor o'yinlari va totalizatorlar", "category": "gambling", "reason": "Майсир (азартные игры) категорически запрещён"},
    {"oked_code": "6419", "name_ru": "Обычные (процентные) банки", "name_uz": "Oddiy (foizli) banklar", "category": "conventional_finance", "reason": "Риба (процент) - основа деятельности"},
    {"oked_code": "6512", "name_ru": "Обычное страхование", "name_uz": "Oddiy sug'urta", "category": "conventional_insurance", "reason": "Содержит гарар и риба - только такафул допустим"},
    {"oked_code": "0150", "name_ru": "Свиноводство", "name_uz": "Cho'chqa boqish", "category": "pork", "reason": "Свинина и её производные запрещены"},
    {"oked_code": "5610", "name_ru": "Рестораны/бары с алкоголем", "name_uz": "Spirtli ichimliklar sotadigan restoranlar", "category": "alcohol", "reason": "Основной доход от продажи алкоголя"},
    {"oked_code": "2100", "name_ru": "Производство оружия массового поражения", "name_uz": "Ommaviy qirg'in qurollari ishlab chiqarish", "category": "weapons", "reason": "Оружие массового уничтожения запрещено"},
    {"oked_code": "5920", "name_ru": "Порнографическая продукция", "name_uz": "Pornografik mahsulotlar", "category": "adult_entertainment", "reason": "Категорически харам"},
    {"oked_code": "4635", "name_ru": "Торговля наркотическими веществами", "name_uz": "Narkotik moddalar savdosi", "category": "drugs", "reason": "Все виды наркотиков запрещены"},
]

SSB_MEMBERS = [
    {"full_name": "Dr. Muhammad Taqi Usmani", "qualifications": "Grand Mufti, AAOIFI Shariah Board Chairman", "is_active": True},
    {"full_name": "Sheikh Nizam Yaqubi", "qualifications": "Shariah scholar, 80+ board memberships globally", "is_active": True},
    {"full_name": "Dr. Hussain Hamed Hassan", "qualifications": "AAOIFI Shariah Board, pioneer of Islamic banking", "is_active": True},
    {"full_name": "Dr. Ali Muhyi Al-Din Qaradaghi", "qualifications": "Secretary General, International Union of Muslim Scholars", "is_active": True},
    {"full_name": "Sheikh Abdullah bin Sulaiman Al Manea", "qualifications": "Senior member Saudi Council of Scholars", "is_active": True},
]


def seed():
    db = SessionLocal()
    try:
        if db.query(IslamicGlossary).count() == 0:
            for g in GLOSSARY:
                db.add(IslamicGlossary(**g))
            print(f"[SEED] Added {len(GLOSSARY)} glossary terms")
        else:
            print("[SEED] Glossary already seeded")

        if db.query(HaramIndustryDB).count() == 0:
            for h in HARAM_INDUSTRIES:
                db.add(HaramIndustryDB(**h))
            print(f"[SEED] Added {len(HARAM_INDUSTRIES)} haram industries")
        else:
            print("[SEED] Haram industries already seeded")

        if db.query(SSBMember).count() == 0:
            for m in SSB_MEMBERS:
                db.add(SSBMember(**m))
            print(f"[SEED] Added {len(SSB_MEMBERS)} SSB members")
        else:
            print("[SEED] SSB members already seeded")

        db.commit()
        print("[SEED] Done!")
    except Exception as e:
        db.rollback()
        print(f"[SEED] Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
