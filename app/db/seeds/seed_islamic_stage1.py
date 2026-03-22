"""
Seed-скрипт для Этапа 1:
  - 30 терминов глоссария
  - 15 стандартов AAOIFI / IFSB в islamic_reference_registry
Запуск: python -m app.db.seeds.seed_islamic_stage1
"""
import sys
import os
sys.path.insert(0, "/app")

from app.db.session import SessionLocal

GLOSSARY_TERMS = [
    # contracts
    {"slug": "murabaha", "term_ru": "Мурабаха", "term_ar": "مرابحة", "transliteration": "Murabaha",
     "definition_ru": "Договор купли-продажи с фиксированной наценкой. Банк покупает товар и перепродаёт клиенту по цене с надбавкой. Используется как альтернатива кредиту.",
     "category": "contract", "standard_ref": "SS No. 8", "standard_org": "AAOIFI"},
    {"slug": "mudaraba", "term_ru": "Мудараба", "term_ar": "مضاربة", "transliteration": "Mudaraba",
     "definition_ru": "Договор доверительного управления: один партнёр предоставляет капитал (рабб аль-маль), другой — труд и управление (мудариб). Прибыль делится по договору, убытки несёт только инвестор.",
     "category": "contract", "standard_ref": "SS No. 13", "standard_org": "AAOIFI"},
    {"slug": "musharaka", "term_ru": "Мушарака", "term_ar": "مشاركة", "transliteration": "Musharaka",
     "definition_ru": "Совместное предприятие, где все партнёры вносят капитал и делят прибыль и убытки пропорционально участию. Исламский аналог акционерного общества.",
     "category": "contract", "standard_ref": "SS No. 12", "standard_org": "AAOIFI"},
    {"slug": "ijara", "term_ru": "Иджара", "term_ar": "إجارة", "transliteration": "Ijara",
     "definition_ru": "Договор аренды или лизинга. Финансовое учреждение покупает актив и сдаёт его в аренду клиенту. Исламский аналог лизинга.",
     "category": "contract", "standard_ref": "SS No. 9", "standard_org": "AAOIFI"},
    {"slug": "ijara-wa-iqtina", "term_ru": "Иджара ва иктина", "term_ar": "إجارة واقتناء", "transliteration": "Ijara wa Iqtina",
     "definition_ru": "Аренда с последующим выкупом. Арендатор в конце срока приобретает право собственности на актив.",
     "category": "contract", "standard_ref": "SS No. 9", "standard_org": "AAOIFI"},
    {"slug": "salam", "term_ru": "Салям", "term_ar": "سلم", "transliteration": "Salam",
     "definition_ru": "Договор авансовой оплаты: покупатель платит полную цену сейчас за товар, который будет поставлен в будущем. Разрешённое исключение из запрета неопределённости (гарар).",
     "category": "contract", "standard_ref": "SS No. 10", "standard_org": "AAOIFI"},
    {"slug": "istisna", "term_ru": "Истисна", "term_ar": "استصناع", "transliteration": "Istisna",
     "definition_ru": "Договор производства или строительства под заказ. Применяется в строительстве, производстве оборудования, судостроении.",
     "category": "contract", "standard_ref": "SS No. 11", "standard_org": "AAOIFI"},
    {"slug": "sukuk", "term_ru": "Сукук", "term_ar": "صكوك", "transliteration": "Sukuk",
     "definition_ru": "Исламские облигации, обеспеченные реальными активами. Не предусматривают выплату процентов; доход — арендные платежи или доля прибыли от активов.",
     "category": "instrument", "standard_ref": "SS No. 17", "standard_org": "AAOIFI"},
    {"slug": "takaful", "term_ru": "Такафул", "term_ar": "تكافل", "transliteration": "Takaful",
     "definition_ru": "Исламское страхование, основанное на взаимопомощи и разделении риска между участниками. Альтернатива традиционному страхованию.",
     "category": "instrument", "standard_ref": "SS No. 26", "standard_org": "AAOIFI"},
    {"slug": "waqf", "term_ru": "Вакф", "term_ar": "وقف", "transliteration": "Waqf",
     "definition_ru": "Благотворительный эндаумент — имущество, переданное на вечное богоугодное использование. Управляется назиром (попечителем) в интересах общества.",
     "category": "contract", "standard_ref": "SS No. 33", "standard_org": "AAOIFI"},
    # prohibitions
    {"slug": "riba", "term_ru": "Риба", "term_ar": "ربا", "transliteration": "Riba",
     "definition_ru": "Ростовщичество или процент. Строго запрещено в исламе. Включает любое предопределённое вознаграждение за ссуду денег.",
     "category": "prohibition", "standard_ref": None, "standard_org": None},
    {"slug": "gharar", "term_ru": "Гарар", "term_ar": "غرر", "transliteration": "Gharar",
     "definition_ru": "Чрезмерная неопределённость или неясность в договоре. Запрещена в исламских финансах для защиты сторон от эксплуатации.",
     "category": "prohibition", "standard_ref": "SS No. 31", "standard_org": "AAOIFI"},
    {"slug": "maysir", "term_ru": "Майсир", "term_ar": "ميسر", "transliteration": "Maysir",
     "definition_ru": "Азартные игры или спекуляция. Любая транзакция, исход которой полностью зависит от случая, запрещена как майсир.",
     "category": "prohibition", "standard_ref": "SS No. 31", "standard_org": "AAOIFI"},
    {"slug": "haram", "term_ru": "Харам", "term_ar": "حرام", "transliteration": "Haram",
     "definition_ru": "Запрещённое в исламе. В финансах — деятельность, инвестиции или доходы, связанные с алкоголем, табаком, свининой, оружием, азартными играми.",
     "category": "prohibition", "standard_ref": None, "standard_org": None},
    {"slug": "halal", "term_ru": "Халяль", "term_ar": "حلال", "transliteration": "Halal",
     "definition_ru": "Разрешённое в исламе. Финансовые инструменты и деятельность, соответствующие нормам шариата.",
     "category": "concept", "standard_ref": None, "standard_org": None},
    # regulatory / concepts
    {"slug": "shariah", "term_ru": "Шариат", "term_ar": "شريعة", "transliteration": "Shariah",
     "definition_ru": "Исламское право, основанное на Коране, Сунне, иджме (консенсусе) и кийасе (аналогии). Регулирует все аспекты жизни мусульман, включая финансы.",
     "category": "regulatory", "standard_ref": None, "standard_org": None},
    {"slug": "ssb", "term_ru": "ШСС — Наблюдательный совет по шариату", "term_ar": "هيئة الرقابة الشرعية", "transliteration": "Shariah Supervisory Board",
     "definition_ru": "Независимый орган исламских учёных, проверяющий соответствие продуктов и операций финансовой организации нормам шариата.",
     "category": "regulatory", "standard_ref": "GS-1", "standard_org": "AAOIFI"},
    {"slug": "fatwa", "term_ru": "Фатва", "term_ar": "فتوى", "transliteration": "Fatwa",
     "definition_ru": "Религиозное заключение или решение исламского учёного по конкретному вопросу. В финансах — разрешение или запрет на определённый продукт.",
     "category": "regulatory", "standard_ref": None, "standard_org": None},
    {"slug": "nisab", "term_ru": "Нисаб", "term_ar": "نصاب", "transliteration": "Nisab",
     "definition_ru": "Минимальный порог богатства, при превышении которого мусульманин обязан уплачивать закят. Равен стоимости 85 граммов золота или 595 граммов серебра.",
     "category": "concept", "standard_ref": None, "standard_org": None},
    {"slug": "zakat", "term_ru": "Закят", "term_ar": "زكاة", "transliteration": "Zakat",
     "definition_ru": "Обязательный религиозный налог — один из пяти столпов ислама. Составляет 2.5% от чистых активов, превышающих нисаб, за прошедший лунный год (хавль).",
     "category": "concept", "standard_ref": None, "standard_org": None},
    {"slug": "hawl", "term_ru": "Хавль", "term_ar": "حول", "transliteration": "Hawl",
     "definition_ru": "Лунный год (354 дня) — минимальный период владения активами, по истечении которого уплачивается закят.",
     "category": "concept", "standard_ref": None, "standard_org": None},
    {"slug": "aaoifi", "term_ru": "AAOIFI", "term_ar": "هيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية",
     "transliteration": "AAOIFI",
     "definition_ru": "Организация по бухгалтерскому учёту и аудиту исламских финансовых институтов. Разрабатывает международные стандарты для исламских финансов.",
     "category": "regulatory", "standard_ref": None, "standard_org": "AAOIFI"},
    {"slug": "ifsb", "term_ru": "IFSB", "term_ar": "مجلس الخدمات المالية الإسلامية",
     "transliteration": "IFSB",
     "definition_ru": "Совет по исламским финансовым услугам. Устанавливает пруденциальные стандарты для банков, страховых и рынков капитала в соответствии с шариатом.",
     "category": "regulatory", "standard_ref": None, "standard_org": "IFSB"},
    {"slug": "posc", "term_ru": "PoSC — Подтверждение соответствия шариату", "term_ar": None,
     "transliteration": "Proof of Shariah Compliance",
     "definition_ru": "Цифровой сертификат соответствия сделки или продукта нормам шариата. Аналог хэша в блокчейне для обеспечения неизменности аудиторского следа.",
     "category": "regulatory", "standard_ref": "GS-11", "standard_org": "AAOIFI"},
    {"slug": "purification", "term_ru": "Очищение дохода", "term_ar": "تطهير", "transliteration": "Tathir",
     "definition_ru": "Процедура выделения и пожертвования доли дохода от харам-деятельности. Применяется при инвестировании в компании с незначительной долей недозволенной выручки.",
     "category": "concept", "standard_ref": "SS No. 62", "standard_org": "AAOIFI"},
    {"slug": "rabb-al-mal", "term_ru": "Рабб аль-маль", "term_ar": "رب المال", "transliteration": "Rabb al-Mal",
     "definition_ru": "Инвестор (поставщик капитала) в договоре мудараба. Несёт финансовые убытки в случае провала предприятия.",
     "category": "concept", "standard_ref": "SS No. 13", "standard_org": "AAOIFI"},
    {"slug": "mudarib", "term_ru": "Мудариб", "term_ar": "مضارب", "transliteration": "Mudarib",
     "definition_ru": "Управляющий партнёр в договоре мудараба. Вносит знания и труд. Теряет только своё время в случае убытков.",
     "category": "concept", "standard_ref": "SS No. 13", "standard_org": "AAOIFI"},
    {"slug": "asset-based", "term_ru": "Asset-based финансирование", "term_ar": None, "transliteration": "Asset-based",
     "definition_ru": "Тип структуры, при которой активы служат обеспечением, но не переходят в собственность инвестора. Менее соответствует шариату, чем asset-backed.",
     "category": "concept", "standard_ref": "SS No. 62", "standard_org": "AAOIFI"},
    {"slug": "asset-backed", "term_ru": "Asset-backed финансирование", "term_ar": None, "transliteration": "Asset-backed",
     "definition_ru": "Тип структуры, при которой активы полностью переходят в собственность инвестора. Считается более предпочтительным с точки зрения шариата.",
     "category": "concept", "standard_ref": "SS No. 62", "standard_org": "AAOIFI"},
    {"slug": "uzse", "term_ru": "УзСЕ — Узбекская фондовая биржа", "term_ar": None, "transliteration": "UzSE",
     "definition_ru": "Республиканская фондовая биржа «Тошкент». Основная торговая площадка для акций и облигаций Узбекистана.",
     "category": "regulatory", "standard_ref": None, "standard_org": None},
]

REFERENCE_STANDARDS = [
    {"registry_type": "aaoifi_standard", "code": "SS-62", "name_ru": "Стандарт AAOIFI SS No. 62 — Скрининг акций",
     "name_en": "AAOIFI SS No. 62 — Equity Screening", "topic": "screening",
     "description_ru": "Определяет критерии допустимости инвестиций в акции: лимиты харам-выручки (5%), долговой нагрузки (33%), процентных доходов (5%). Разграничивает asset-based и asset-backed структуры."},
    {"registry_type": "aaoifi_standard", "code": "GS-1-2024", "name_ru": "Стандарт AAOIFI GS-1 (2024) — Управление ШСС",
     "name_en": "AAOIFI GS-1 — Governance for SSB", "topic": "governance",
     "description_ru": "Устанавливает требования к составу, полномочиям и процедурам Наблюдательного совета по шариату (ШСС)."},
    {"registry_type": "aaoifi_standard", "code": "GS-9", "name_ru": "Стандарт AAOIFI GS-9 — Этика",
     "name_en": "AAOIFI GS-9 — Code of Ethics", "topic": "ethics",
     "description_ru": "Кодекс профессиональной этики для бухгалтеров и аудиторов исламских финансовых институтов."},
    {"registry_type": "aaoifi_standard", "code": "GS-11", "name_ru": "Стандарт AAOIFI GS-11 — Раскрытие информации",
     "name_en": "AAOIFI GS-11 — Disclosure", "topic": "transparency",
     "description_ru": "Требования к раскрытию информации об операциях и соответствии шариату."},
    {"registry_type": "aaoifi_standard", "code": "GS-18", "name_ru": "Стандарт AAOIFI GS-18 — Центральный ШСС",
     "name_en": "AAOIFI GS-18 — Central Shariah Board", "topic": "governance",
     "description_ru": "Регулирует создание и функционирование централизованных органов по контролю шариата на уровне государства."},
    {"registry_type": "aaoifi_standard", "code": "FAS-32", "name_ru": "Стандарт AAOIFI FAS No. 32 — Иджара",
     "name_en": "AAOIFI FAS No. 32 — Ijarah", "topic": "leasing",
     "description_ru": "Учётный стандарт для договоров иджара и иджара-мунтахийя-биттамлик (аренда с выкупом)."},
    {"registry_type": "aaoifi_standard", "code": "SS-26", "name_ru": "Стандарт AAOIFI SS No. 26 — Такафул",
     "name_en": "AAOIFI SS No. 26 — Takaful", "topic": "insurance",
     "description_ru": "Шариатские нормы для исламского страхования (такафул)."},
    {"registry_type": "ifsb_standard", "code": "IFSB-1", "name_ru": "IFSB-1 — Достаточность капитала",
     "name_en": "IFSB-1 — Capital Adequacy", "topic": "prudential",
     "description_ru": "Принципы достаточности капитала для банков, предоставляющих только исламские финансовые услуги."},
    {"registry_type": "ifsb_standard", "code": "IFSB-3", "name_ru": "IFSB-3 — Корпоративное управление",
     "name_en": "IFSB-3 — Corporate Governance", "topic": "governance",
     "description_ru": "Руководящие принципы корпоративного управления для исламских финансовых институтов."},
    {"registry_type": "ifsb_standard", "code": "IFSB-8", "name_ru": "IFSB-8 — Управление рисками такафул",
     "name_en": "IFSB-8 — Takaful Risk Management", "topic": "risk",
     "description_ru": "Принципы управления рисками для операторов такафул (исламского страхования)."},
    {"registry_type": "ifsb_standard", "code": "IFSB-12", "name_ru": "IFSB-12 — Ликвидность",
     "name_en": "IFSB-12 — Liquidity Risk Management", "topic": "risk",
     "description_ru": "Принципы управления риском ликвидности для исламских финансовых институтов."},
    {"registry_type": "ifsb_standard", "code": "IFSB-22", "name_ru": "IFSB-22 — Основные принципы",
     "name_en": "IFSB-22 — Core Principles", "topic": "prudential",
     "description_ru": "Основные принципы регулирования и надзора над исламскими финансовыми институтами."},
    {"registry_type": "ifsb_standard", "code": "IFSB-30", "name_ru": "IFSB-30 — DLT и финтех",
     "name_en": "IFSB-30 — DLT & FinTech", "topic": "fintech",
     "description_ru": "Стандарт для применения технологий распределённого реестра (DLT) в исламских финансах."},
    {"registry_type": "ifsb_standard", "code": "IFSB-31", "name_ru": "IFSB-31 — Цифровые финансы",
     "name_en": "IFSB-31 — Digital Finance", "topic": "fintech",
     "description_ru": "Принципы надзора за цифровыми финансовыми услугами, совместимыми с шариатом."},
    {"registry_type": "local_regulation", "code": "UZ-417-2023", "name_ru": "Закон РУз №417 (2023) — Исламские финансы",
     "name_en": "Republic of Uzbekistan Law No. 417 — Islamic Finance", "topic": "regulation",
     "description_ru": "Первый специальный закон Узбекистана, регулирующий исламские банковские услуги и финансовые инструменты."},
]


def run():
    db = SessionLocal()
    try:
        from app.db.models.islamic_stage1 import IslamicGlossaryTerm, IslamicReferenceRegistry

        # Seed глоссарий
        added_terms = 0
        for t in GLOSSARY_TERMS:
            exists = db.query(IslamicGlossaryTerm).filter(IslamicGlossaryTerm.slug == t["slug"]).first()
            if not exists:
                db.add(IslamicGlossaryTerm(**t))
                added_terms += 1
        db.commit()
        print(f"✅ Глоссарий: добавлено {added_terms} терминов")

        # Seed стандарты
        added_refs = 0
        for r in REFERENCE_STANDARDS:
            exists = db.query(IslamicReferenceRegistry).filter(
                IslamicReferenceRegistry.registry_type == r["registry_type"],
                IslamicReferenceRegistry.code == r["code"]
            ).first()
            if not exists:
                db.add(IslamicReferenceRegistry(
                    registry_type=r["registry_type"],
                    code=r["code"],
                    name_ru=r["name_ru"],
                    name_en=r.get("name_en"),
                    description_ru=r.get("description_ru"),
                    topic=r.get("topic"),
                ))
                added_refs += 1
        db.commit()
        print(f"✅ Стандарты: добавлено {added_refs} записей")

    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
