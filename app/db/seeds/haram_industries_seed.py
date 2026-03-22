"""
Seed data for haram_industries_db table.
OKED-based classification of Shariah non-compliant industries.
"""
from sqlalchemy.orm import Session
from app.db.models.islamic_finance import HaramIndustryDB

HARAM_INDUSTRIES = [
    {"oked_code": "11.01", "name_ru": "Производство алкогольных напитков", "name_uz": "Spirtli ichimliklar ishlab chiqarish", "category": "alcohol", "reason": "Коран 5:90"},
    {"oked_code": "11.02", "name_ru": "Производство вина", "name_uz": "Vino ishlab chiqarish", "category": "alcohol", "reason": "Коран 5:90"},
    {"oked_code": "11.03", "name_ru": "Производство пива", "name_uz": "Pivo ishlab chiqarish", "category": "alcohol", "reason": "Коран 5:90"},
    {"oked_code": "46.34", "name_ru": "Оптовая торговля алкоголем", "name_uz": "Spirtli ichimliklar ulgurji savdosi", "category": "alcohol", "reason": "Торговля запрещённым"},
    {"oked_code": "47.25", "name_ru": "Розничная торговля алкоголем", "name_uz": "Spirtli ichimliklar chakana savdosi", "category": "alcohol", "reason": "Торговля запрещённым"},
    {"oked_code": "12.00", "name_ru": "Производство табачных изделий", "name_uz": "Tamaki mahsulotlari ishlab chiqarish", "category": "tobacco", "reason": "Вред здоровью"},
    {"oked_code": "46.35", "name_ru": "Оптовая торговля табаком", "name_uz": "Tamaki ulgurji savdosi", "category": "tobacco", "reason": "Вред здоровью"},
    {"oked_code": "47.26", "name_ru": "Розничная торговля табаком", "name_uz": "Tamaki chakana savdosi", "category": "tobacco", "reason": "Вред здоровью"},
    {"oked_code": "92.00", "name_ru": "Деятельность казино и залов игровых автоматов", "name_uz": "Kazino va slot-mashinalar faoliyati", "category": "gambling", "reason": "Коран 5:90-91 — майсир"},
    {"oked_code": "92.01", "name_ru": "Организация азартных игр", "name_uz": "Qimor oyinlarini tashkil etish", "category": "gambling", "reason": "Коран 5:90-91"},
    {"oked_code": "92.02", "name_ru": "Букмекерская деятельность и тотализаторы", "name_uz": "Bukmekerlik va totalizatorlar", "category": "gambling", "reason": "Коран 5:90-91"},
    {"oked_code": "10.11", "name_ru": "Переработка и консервирование свинины", "name_uz": "Cho'chqa go'shtini qayta ishlash", "category": "pork", "reason": "Коран 2:173, 5:3"},
    {"oked_code": "10.13", "name_ru": "Производство мясных изделий из свинины", "name_uz": "Cho'chqa go'shtidan mahsulotlar", "category": "pork", "reason": "Коран 2:173"},
    {"oked_code": "01.46", "name_ru": "Разведение свиней", "name_uz": "Cho'chqa boqish", "category": "pork", "reason": "Коран 2:173"},
    {"oked_code": "25.40", "name_ru": "Производство оружия и боеприпасов", "name_uz": "Qurol va o'q-dorilar ishlab chiqarish", "category": "weapons", "reason": "Содействие разрушению и гибели"},
    {"oked_code": "30.40", "name_ru": "Производство военной техники", "name_uz": "Harbiy texnika ishlab chiqarish", "category": "weapons", "reason": "Содействие разрушению"},
    {"oked_code": "47.78.1", "name_ru": "Торговля оружием", "name_uz": "Qurol savdosi", "category": "weapons", "reason": "Содействие разрушению"},
    {"oked_code": "64.19", "name_ru": "Банковская деятельность (конвенциональная)", "name_uz": "Bank faoliyati (an'anaviy)", "category": "conventional_finance", "reason": "Основана на рибе (процентах)"},
    {"oked_code": "64.91", "name_ru": "Финансовый лизинг (конвенциональный)", "name_uz": "Moliyaviy lizing (an'anaviy)", "category": "conventional_finance", "reason": "Содержит процентный элемент"},
    {"oked_code": "64.92", "name_ru": "Прочее кредитование (процентное)", "name_uz": "Boshqa kreditlash (foizli)", "category": "conventional_finance", "reason": "Основано на рибе"},
    {"oked_code": "65.11", "name_ru": "Страхование жизни (конвенциональное)", "name_uz": "Hayotni sug'urtalash (an'anaviy)", "category": "conventional_finance", "reason": "Содержит гарар и рибу"},
    {"oked_code": "65.12", "name_ru": "Страхование (не жизни, конвенциональное)", "name_uz": "Sug'urta (an'anaviy)", "category": "conventional_finance", "reason": "Содержит гарар и рибу"},
    {"oked_code": "66.12", "name_ru": "Брокерская деятельность с деривативами", "name_uz": "Derivativlar bilan brokerlik", "category": "conventional_finance", "reason": "Содержит гарар и майсир"},
    {"oked_code": "59.14", "name_ru": "Производство порнографического контента", "name_uz": "Pornografik kontent ishlab chiqarish", "category": "entertainment_haram", "reason": "Коран 24:30-31 — запрет непристойности"},
    {"oked_code": "59.20", "name_ru": "Производство контента для взрослых", "name_uz": "Kattalar uchun kontent ishlab chiqarish", "category": "entertainment_haram", "reason": "Запрет непристойности"},
]


def seed_haram_industries(db: Session):
    """Insert haram industries if table is empty."""
    count = db.query(HaramIndustryDB).count()
    if count > 0:
        return f"haram_industries_db already has {count} rows, skipping."
    for item in HARAM_INDUSTRIES:
        db.add(HaramIndustryDB(**item))
    db.commit()
    return f"Seeded {len(HARAM_INDUSTRIES)} haram industries."
