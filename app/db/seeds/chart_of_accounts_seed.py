"""
Seed: План счетов НСБУ Узбекистана (основные группы)
Run: python -m app.db.seeds.chart_of_accounts
"""
NSBU_ACCOUNTS = [
    # I — Долгосрочные активы (0100-0900)
    {"code": "0100", "name_ru": "Основные средства", "name_uz": "Asosiy vositalar", "category": "long_term_assets", "level": 1, "parent_code": None,
     "description": "Земля, здания, машины, транспорт, оборудование"},
    {"code": "0110", "name_ru": "Земельные участки", "name_uz": "Yer uchastkalar", "category": "long_term_assets", "level": 2, "parent_code": "0100"},
    {"code": "0120", "name_ru": "Здания", "name_uz": "Binolar", "category": "long_term_assets", "level": 2, "parent_code": "0100"},
    {"code": "0130", "name_ru": "Машины и оборудование", "name_uz": "Mashinalar va uskunalar", "category": "long_term_assets", "level": 2, "parent_code": "0100"},
    {"code": "0140", "name_ru": "Транспортные средства", "name_uz": "Transport vositalari", "category": "long_term_assets", "level": 2, "parent_code": "0100"},
    {"code": "0150", "name_ru": "Компьютерное оборудование", "name_uz": "Kompyuter uskunalari", "category": "long_term_assets", "level": 2, "parent_code": "0100"},
    {"code": "0160", "name_ru": "Мебель и офисное оборудование", "name_uz": "Mebel va ofis jihozlari", "category": "long_term_assets", "level": 2, "parent_code": "0100"},
    {"code": "0170", "name_ru": "Рабочий и продуктивный скот", "name_uz": "Ishchi va mahsuldor chorva", "category": "long_term_assets", "level": 2, "parent_code": "0100"},
    {"code": "0190", "name_ru": "Прочие основные средства", "name_uz": "Boshqa asosiy vositalar", "category": "long_term_assets", "level": 2, "parent_code": "0100"},

    {"code": "0200", "name_ru": "Износ основных средств", "name_uz": "Asosiy vositalar eskirishi", "category": "long_term_assets", "level": 1, "parent_code": None,
     "description": "Амортизация ОС"},

    {"code": "0300", "name_ru": "ОС по финансовой аренде", "name_uz": "Moliyaviy ijara AV", "category": "long_term_assets", "level": 1, "parent_code": None,
     "description": "Лизинговое имущество"},

    {"code": "0400", "name_ru": "Нематериальные активы", "name_uz": "Nomoddiy aktivlar", "category": "long_term_assets", "level": 1, "parent_code": None,
     "description": "Патенты, лицензии, ПО, товарные знаки, гудвилл"},
    {"code": "0410", "name_ru": "Патенты и лицензии", "name_uz": "Patentlar va litsenziyalar", "category": "long_term_assets", "level": 2, "parent_code": "0400"},
    {"code": "0420", "name_ru": "Программное обеспечение", "name_uz": "Dasturiy taminot", "category": "long_term_assets", "level": 2, "parent_code": "0400"},
    {"code": "0430", "name_ru": "Товарные знаки", "name_uz": "Tovar belgilari", "category": "long_term_assets", "level": 2, "parent_code": "0400"},
    {"code": "0440", "name_ru": "Гудвилл", "name_uz": "Gudvill", "category": "long_term_assets", "level": 2, "parent_code": "0400"},

    {"code": "0500", "name_ru": "Амортизация НМА", "name_uz": "NMA amortizatsiyasi", "category": "long_term_assets", "level": 1, "parent_code": None},

    {"code": "0600", "name_ru": "Долгосрочные инвестиции", "name_uz": "Uzoq muddatli investitsiyalar", "category": "long_term_assets", "level": 1, "parent_code": None,
     "description": "Ценные бумаги, доли в дочерних/зависимых обществах"},
    {"code": "0610", "name_ru": "Ценные бумаги", "name_uz": "Qimmatli qogozlar", "category": "long_term_assets", "level": 2, "parent_code": "0600"},
    {"code": "0620", "name_ru": "Инвестиции в дочерние общества", "name_uz": "Shobay korxonalarga investitsiyalar", "category": "long_term_assets", "level": 2, "parent_code": "0600"},

    {"code": "0700", "name_ru": "Оборудование к установке", "name_uz": "Oʻrnatiladigan uskunalar", "category": "long_term_assets", "level": 1, "parent_code": None},
    {"code": "0800", "name_ru": "Капитальные вложения", "name_uz": "Kapital qoʻyilmalar", "category": "long_term_assets", "level": 1, "parent_code": None,
     "description": "Незавершённое строительство, приобретение ОС/НМА"},
    {"code": "0900", "name_ru": "Долгосрочная дебиторская задолженность", "name_uz": "Uzoq muddatli debitorlik", "category": "long_term_assets", "level": 1, "parent_code": None},

    # II — Текущие активы (1000-5900)
    {"code": "1000", "name_ru": "Материалы", "name_uz": "Materiallar", "category": "current_assets", "level": 1, "parent_code": None,
     "description": "Сырьё, топливо, запчасти, стройматериалы"},
    {"code": "1010", "name_ru": "Сырьё и материалы", "name_uz": "Xomashyo va materiallar", "category": "current_assets", "level": 2, "parent_code": "1000"},
    {"code": "1020", "name_ru": "Покупные полуфабрикаты", "name_uz": "Sotib olingan yarim fabrikatlar", "category": "current_assets", "level": 2, "parent_code": "1000"},
    {"code": "1030", "name_ru": "Топливо", "name_uz": "Yoqilgʻi", "category": "current_assets", "level": 2, "parent_code": "1000"},
    {"code": "1040", "name_ru": "Запасные части", "name_uz": "Ehtiyot qismlar", "category": "current_assets", "level": 2, "parent_code": "1000"},
    {"code": "1050", "name_ru": "Строительные материалы", "name_uz": "Qurilish materiallari", "category": "current_assets", "level": 2, "parent_code": "1000"},
    {"code": "1060", "name_ru": "Тара", "name_uz": "Idishlar", "category": "current_assets", "level": 2, "parent_code": "1000"},

    {"code": "2000", "name_ru": "Основное производство", "name_uz": "Asosiy ishlab chiqarish", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "2300", "name_ru": "Вспомогательное производство", "name_uz": "Yordamchi ishlab chiqarish", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "2500", "name_ru": "Общепроизводственные расходы", "name_uz": "Umumishlab chiqarish xarajatlari", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "2700", "name_ru": "Общехозяйственные расходы", "name_uz": "Umumxoʻjalik xarajatlari", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "2800", "name_ru": "Готовая продукция", "name_uz": "Tayyor mahsulot", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "2900", "name_ru": "Товары", "name_uz": "Tovarlar", "category": "current_assets", "level": 1, "parent_code": None},

    {"code": "3100", "name_ru": "Расходы будущих периодов", "name_uz": "Kelgusi davr xarajatlari", "category": "current_assets", "level": 1, "parent_code": None},

    {"code": "4000", "name_ru": "Счета к получению (покупатели)", "name_uz": "Oluvchilar (xaridorlar)", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "4100", "name_ru": "Авансы выданные", "name_uz": "Berilgan avanslar", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "4200", "name_ru": "Задолженность дочерних обществ", "name_uz": "Shobay korxonalar qarzi", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "4300", "name_ru": "Задолженность персонала", "name_uz": "Xodimlar qarzdorligi", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "4400", "name_ru": "Авансовые платежи в бюджет", "name_uz": "Byudjetga avans toʻlovlar", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "4800", "name_ru": "Прочая дебиторская задолженность", "name_uz": "Boshqa debitorlik qarzi", "category": "current_assets", "level": 1, "parent_code": None},

    {"code": "5000", "name_ru": "Касса", "name_uz": "Kassa", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "5010", "name_ru": "Касса в национальной валюте", "name_uz": "Milliy valyutadagi kassa", "category": "current_assets", "level": 2, "parent_code": "5000"},
    {"code": "5020", "name_ru": "Касса в иностранной валюте", "name_uz": "Xorijiy valyutadagi kassa", "category": "current_assets", "level": 2, "parent_code": "5000"},
    {"code": "5100", "name_ru": "Расчётный счёт", "name_uz": "Hisob-kitob schyoti", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "5200", "name_ru": "Валютные счета", "name_uz": "Valyuta schyotlari", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "5500", "name_ru": "Специальные счета", "name_uz": "Maxsus schyotlar", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "5700", "name_ru": "Переводы в пути", "name_uz": "Yoʻldagi oʻtkazmalar", "category": "current_assets", "level": 1, "parent_code": None},
    {"code": "5800", "name_ru": "Краткосрочные инвестиции", "name_uz": "Qisqa muddatli investitsiyalar", "category": "current_assets", "level": 1, "parent_code": None},

    # III — Обязательства (6000-7900)
    {"code": "6000", "name_ru": "Счета к оплате (поставщики)", "name_uz": "Yetkazuvchilarga toʻlov", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "6100", "name_ru": "Задолженность подразделениям", "name_uz": "Boʻlinmalarga qarzdorlik", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "6200", "name_ru": "Отсроченные обязательства", "name_uz": "Kechiktirilgan majburiyatlar", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "6300", "name_ru": "Полученные авансы", "name_uz": "Olingan avanslar", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "6400", "name_ru": "Задолженность по платежам в бюджет", "name_uz": "Byudjet toʻlovlari boʻyicha qarz", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "6500", "name_ru": "Задолженность по страхованию", "name_uz": "Sugʻurta boʻyicha qarz", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "6600", "name_ru": "Задолженность учредителям", "name_uz": "Taʻsischilarga qarzdorlik", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "6700", "name_ru": "Расчёты с персоналом по оплате труда", "name_uz": "Ish haqi boʻyicha hisob-kitob", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "6800", "name_ru": "Краткосрочные банковские кредиты", "name_uz": "Qisqa muddatli bank kreditlari", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "6900", "name_ru": "Прочие краткосрочные обязательства", "name_uz": "Boshqa qisqa muddatli majburiyatlar", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "7000", "name_ru": "Долгосрочная кредиторская задолженность", "name_uz": "Uzoq muddatli kreditorlik", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "7800", "name_ru": "Долгосрочные банковские кредиты", "name_uz": "Uzoq muddatli bank kreditlari", "category": "liabilities", "level": 1, "parent_code": None},
    {"code": "7900", "name_ru": "Долгосрочные обязательства по аренде", "name_uz": "Uzoq muddatli ijara majburiyatlari", "category": "liabilities", "level": 1, "parent_code": None},

    # IV — Собственный капитал (8300-8900)
    {"code": "8300", "name_ru": "Уставный капитал", "name_uz": "Ustav kapitali", "category": "equity", "level": 1, "parent_code": None},
    {"code": "8400", "name_ru": "Добавленный капитал", "name_uz": "Qoʻshilgan kapital", "category": "equity", "level": 1, "parent_code": None},
    {"code": "8500", "name_ru": "Резервный капитал", "name_uz": "Zaxira kapitali", "category": "equity", "level": 1, "parent_code": None},
    {"code": "8600", "name_ru": "Выкупленные собственные акции", "name_uz": "Sotib olingan oʻz aksiyalari", "category": "equity", "level": 1, "parent_code": None},
    {"code": "8700", "name_ru": "Нераспределённая прибыль", "name_uz": "Taqsimlanmagan foyda", "category": "equity", "level": 1, "parent_code": None},
    {"code": "8800", "name_ru": "Целевые поступления", "name_uz": "Maqsadli tushumlar", "category": "equity", "level": 1, "parent_code": None},
    {"code": "8900", "name_ru": "Резервы предстоящих расходов", "name_uz": "Kelgusi xarajatlar zaxiralari", "category": "equity", "level": 1, "parent_code": None},
]


async def seed_chart_of_accounts(db):
    """Seed chart of accounts into DB"""
    from app.db.models.organization_models import ChartOfAccounts
    from sqlalchemy import select

    existing = await db.execute(select(ChartOfAccounts).limit(1))
    if existing.scalar():
        print("Chart of accounts already seeded, skipping...")
        return

    for acc in NSBU_ACCOUNTS:
        account = ChartOfAccounts(
            code=acc["code"],
            name_ru=acc["name_ru"],
            name_uz=acc.get("name_uz", ""),
            parent_code=acc.get("parent_code"),
            category=acc["category"],
            level=acc.get("level", 1),
            description=acc.get("description", ""),
        )
        db.add(account)

    await db.commit()
    print(f"Seeded {len(NSBU_ACCOUNTS)} accounts into chart_of_accounts")
