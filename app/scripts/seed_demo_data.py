"""
DEMO-001: Скрипт загрузки демо-данных для презентации инвесторам.

Идемпотентный — безопасно запускать повторно.
Создаёт демо-пользователя, 5 портфелей, 12 инвестиционных решений,
а также курсы валют, данные ИПЦ, биржевые котировки и макропоказатели.
"""

import logging
from datetime import date

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.models.cpi_data import CPIRecord
from app.db.models.currency_rate import CurrencyRate
from app.db.models.investment_decision import (
    DecisionCategory,
    DecisionPriority,
    DecisionStatus,
    DecisionType,
    InvestmentDecision,
)
from app.db.models.macro_data import MacroIndicator
from app.db.models.portfolio import Portfolio
from app.db.models.stock_exchange import StockEmitter, StockQuote
from app.db.models.user import User
from app.db.models.organization_models import ChartOfAccounts
from app.db.seeds.chart_of_accounts_seed import NSBU_ACCOUNTS

logger = logging.getLogger(__name__)

DEMO_EMAIL = "demo@ai-capital.uz"
DEMO_PASSWORD = "DemoPass2026!"
DEMO_NAME = "Демо Инвестор"


def seed_demo_data(db: Session) -> dict:
    """
    Загрузить демо-данные. Идемпотентно: если данные уже есть, обновляет.

    Returns:
        dict со статистикой загруженных данных
    """
    stats = {"user": False, "portfolios": 0, "decisions": 0}

        # ── 0. План счетов НСБУ (Chart of Accounts) ──
    stats["chart_of_accounts"] = 0
    existing_coa = db.query(ChartOfAccounts).first()
    if not existing_coa:
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
        db.flush()
        stats["chart_of_accounts"] = len(NSBU_ACCOUNTS)
        logger.info("План счетов НСБУ загружен: %d счетов", len(NSBU_ACCOUNTS))
    else:
        logger.info("План счетов уже существует, пропуск")

    # ── 1. Демо-пользователь ──
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if not user:
        user = User(
            email=DEMO_EMAIL,
            full_name=DEMO_NAME,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            is_active=True,
        )
        db.add(user)
        db.flush()
        stats["user"] = True
        logger.info("Демо-пользователь создан: %s", DEMO_EMAIL)
    else:
        logger.info("Демо-пользователь уже существует: %s", DEMO_EMAIL)

    # ── 2. Портфели ──
    portfolios_data = [
        {
            "name": "Агротех Узбекистан",
            "description": "Инвестиции в агротехнологические компании: хлопок, фрукты, зерно",
            "total_value": 8_500_000_000,
        },
        {
            "name": "IT Park Стартапы",
            "description": "Финтех, EdTech, e-commerce стартапы IT Park Ташкент",
            "total_value": 3_200_000_000,
        },
        {
            "name": "Торговый Дом",
            "description": "Импорт/экспорт, оптовая торговля, логистика",
            "total_value": 5_700_000_000,
        },
        {
            "name": "Исламские Инвестиции",
            "description": "Шариат-комплаентный портфель: сукук, мурабаха, иджара",
            "total_value": 4_100_000_000,
        },
        {
            "name": "Диверсифицированный",
            "description": "Смешанный портфель: IT, строительство, промышленность, торговля",
            "total_value": 12_000_000_000,
        },
    ]

    created_portfolios = []
    for pdata in portfolios_data:
        existing = (
            db.query(Portfolio)
            .filter(Portfolio.owner_id == user.id, Portfolio.name == pdata["name"])
            .first()
        )
        if existing:
            created_portfolios.append(existing)
            continue

        portfolio = Portfolio(
            name=pdata["name"],
            description=pdata["description"],
            total_value=pdata["total_value"],
            currency="UZS",
            owner_id=user.id,
        )
        db.add(portfolio)
        db.flush()
        created_portfolios.append(portfolio)
        stats["portfolios"] += 1

    # ── 3. Инвестиционные решения ──
    decisions_data = [
        # Агротех Узбекистан (портфель 0)
        {
            "portfolio_idx": 0,
            "asset_name": "Cotton Processing LLC",
            "asset_symbol": "COTTON",
            "decision_type": DecisionType.BUY,
            "amount": 5000,
            "price": 350_000,
            "status": DecisionStatus.APPROVED,
            "priority": DecisionPriority.HIGH,
            "category": DecisionCategory.EQUITY,
            "geography": "UZ",
            "target_return": 0.22,
            "risk_level": "medium",
            "rationale": "Хлопкопереработка — ключевой экспортный сектор. "
            "Компания занимает 15% рынка. Рост экспорта +18% за 2025 год.",
            "days_ago": 45,
        },
        {
            "portfolio_idx": 0,
            "asset_name": "Agro Fruit Export",
            "asset_symbol": "AGFRT",
            "decision_type": DecisionType.BUY,
            "amount": 3000,
            "price": 420_000,
            "status": DecisionStatus.APPROVED,
            "priority": DecisionPriority.MEDIUM,
            "category": DecisionCategory.EQUITY,
            "geography": "UZ",
            "target_return": 0.18,
            "risk_level": "low",
            "rationale": "Экспорт фруктов в РФ и ЕС. Стабильный спрос, "
            "господдержка экспортёров по УП-189.",
            "days_ago": 30,
        },
        # IT Park Стартапы (портфель 1)
        {
            "portfolio_idx": 1,
            "asset_name": "Uzum Market",
            "asset_symbol": "UZUM",
            "decision_type": DecisionType.BUY,
            "amount": 1000,
            "price": 1_200_000,
            "status": DecisionStatus.APPROVED,
            "priority": DecisionPriority.CRITICAL,
            "category": DecisionCategory.VENTURE,
            "geography": "UZ",
            "target_return": 0.45,
            "risk_level": "high",
            "rationale": "Крупнейшая e-commerce платформа Узбекистана. "
            "GMV $200M+. Раунд Series B.",
            "days_ago": 60,
        },
        {
            "portfolio_idx": 1,
            "asset_name": "Humans.uz",
            "asset_symbol": "HMNS",
            "decision_type": DecisionType.BUY,
            "amount": 2000,
            "price": 500_000,
            "status": DecisionStatus.REVIEW,
            "priority": DecisionPriority.HIGH,
            "category": DecisionCategory.VENTURE,
            "geography": "UZ",
            "target_return": 0.35,
            "risk_level": "high",
            "rationale": "HR-tech платформа. 500K+ пользователей. "
            "Монетизация через премиум-подписки и рекрутинг.",
            "days_ago": 15,
        },
        {
            "portfolio_idx": 1,
            "asset_name": "PayMe Fintech",
            "asset_symbol": "PAYME",
            "decision_type": DecisionType.HOLD,
            "amount": 1500,
            "price": 800_000,
            "status": DecisionStatus.COMPLETED,
            "priority": DecisionPriority.MEDIUM,
            "category": DecisionCategory.VENTURE,
            "geography": "UZ",
            "target_return": 0.30,
            "risk_level": "medium",
            "rationale": "Лидер рынка мобильных платежей. "
            "20M+ транзакций/мес. Рост +40% YoY.",
            "days_ago": 75,
        },
        # Торговый Дом (портфель 2)
        {
            "portfolio_idx": 2,
            "asset_name": "Asia Trade Group",
            "asset_symbol": "ASTG",
            "decision_type": DecisionType.BUY,
            "amount": 10000,
            "price": 180_000,
            "status": DecisionStatus.APPROVED,
            "priority": DecisionPriority.MEDIUM,
            "category": DecisionCategory.EQUITY,
            "geography": "UZ",
            "target_return": 0.20,
            "risk_level": "low",
            "rationale": "Оптовая торговля стройматериалами. "
            "Стабильный денежный поток, низкая волатильность.",
            "days_ago": 40,
        },
        {
            "portfolio_idx": 2,
            "asset_name": "Silk Road Logistics",
            "asset_symbol": "SRLG",
            "decision_type": DecisionType.BUY,
            "amount": 5000,
            "price": 250_000,
            "status": DecisionStatus.DRAFT,
            "priority": DecisionPriority.HIGH,
            "category": DecisionCategory.INFRASTRUCTURE,
            "geography": "UZ",
            "target_return": 0.25,
            "risk_level": "medium",
            "rationale": "Логистическая компания на маршруте Китай-ЦА-Европа. "
            "Рост транзитных грузов +30% за 2025.",
            "days_ago": 5,
        },
        # Исламские Инвестиции (портфель 3)
        {
            "portfolio_idx": 3,
            "asset_name": "Hamkorbank Sukuk",
            "asset_symbol": "HMKB-S",
            "decision_type": DecisionType.BUY,
            "amount": 8000,
            "price": 200_000,
            "status": DecisionStatus.APPROVED,
            "priority": DecisionPriority.HIGH,
            "category": DecisionCategory.DEBT,
            "geography": "UZ",
            "target_return": 0.16,
            "risk_level": "low",
            "rationale": "Сукук от крупнейшего частного банка. "
            "Рейтинг B+ (Fitch). Шариат-комплаент.",
            "days_ago": 50,
        },
        {
            "portfolio_idx": 3,
            "asset_name": "Halal Food Production",
            "asset_symbol": "HLFD",
            "decision_type": DecisionType.BUY,
            "amount": 4000,
            "price": 300_000,
            "status": DecisionStatus.REVIEW,
            "priority": DecisionPriority.MEDIUM,
            "category": DecisionCategory.EQUITY,
            "geography": "UZ",
            "target_return": 0.20,
            "risk_level": "low",
            "rationale": "Халяль-сертифицированное производство. "
            "Экспорт в 12 стран. Рост рынка халяль +25%/год.",
            "days_ago": 20,
        },
        # Диверсифицированный (портфель 4)
        {
            "portfolio_idx": 4,
            "asset_name": "Artel Electronics",
            "asset_symbol": "ARTL",
            "decision_type": DecisionType.BUY,
            "amount": 3000,
            "price": 450_000,
            "status": DecisionStatus.APPROVED,
            "priority": DecisionPriority.HIGH,
            "category": DecisionCategory.EQUITY,
            "geography": "UZ",
            "target_return": 0.28,
            "risk_level": "medium",
            "rationale": "Крупнейший производитель электроники в ЦА. "
            "Экспорт в 20+ стран. Рост выручки +35% YoY.",
            "days_ago": 55,
        },
        {
            "portfolio_idx": 4,
            "asset_name": "UzAuto Motors",
            "asset_symbol": "UZAM",
            "decision_type": DecisionType.SELL,
            "amount": 2000,
            "price": 600_000,
            "status": DecisionStatus.REJECTED,
            "priority": DecisionPriority.LOW,
            "category": DecisionCategory.EQUITY,
            "geography": "UZ",
            "target_return": 0.12,
            "risk_level": "high",
            "rationale": "Высокая зависимость от GM. Рост конкуренции. "
            "Рекомендация: фиксация прибыли.",
            "days_ago": 10,
        },
        {
            "portfolio_idx": 4,
            "asset_name": "Tashkent City Mall",
            "asset_symbol": "TCML",
            "decision_type": DecisionType.BUY,
            "amount": 6000,
            "price": 380_000,
            "status": DecisionStatus.IN_PROGRESS,
            "priority": DecisionPriority.MEDIUM,
            "category": DecisionCategory.REAL_ESTATE,
            "geography": "UZ",
            "target_return": 0.18,
            "risk_level": "medium",
            "rationale": "Коммерческая недвижимость в центре Ташкента. "
            "Заполняемость 95%. Стабильная арендная доходность.",
            "days_ago": 25,
        },
    ]

    for ddata in decisions_data:
        portfolio = created_portfolios[ddata["portfolio_idx"]]
        existing = (
            db.query(InvestmentDecision)
            .filter(
                InvestmentDecision.portfolio_id == portfolio.id,
                InvestmentDecision.asset_symbol == ddata["asset_symbol"],
                InvestmentDecision.created_by == user.id,
            )
            .first()
        )
        if existing:
            continue

        decision = InvestmentDecision(
            asset_name=ddata["asset_name"],
            asset_symbol=ddata["asset_symbol"],
            decision_type=ddata["decision_type"],
            amount=ddata["amount"],
            price=ddata["price"],
            status=ddata["status"],
            priority=ddata["priority"],
            category=ddata["category"],
            geography=ddata["geography"],
            target_return=ddata["target_return"],
            risk_level=ddata["risk_level"],
            rationale=ddata["rationale"],
            total_value=ddata["amount"] * ddata["price"],
            portfolio_id=portfolio.id,
            created_by=user.id,
            notes=f"Демо-решение: {ddata['asset_name']}",
        )
        db.add(decision)
        stats["decisions"] += 1

    # ── 4. Currency Rates (демо-курсы ЦБ Узбекистана) ──
    today = date.today()
    currency_rates_data = [
        {"code": "USD", "ccy_name_ru": "Доллар США", "nominal": 1, "rate": 12_876.54, "diff": 15.23},
        {"code": "EUR", "ccy_name_ru": "Евро", "nominal": 1, "rate": 13_945.80, "diff": -12.45},
        {"code": "RUB", "ccy_name_ru": "Российский рубль", "nominal": 1, "rate": 137.52, "diff": 0.68},
        {"code": "GBP", "ccy_name_ru": "Фунт стерлингов", "nominal": 1, "rate": 16_234.90, "diff": 45.12},
        {"code": "CNY", "ccy_name_ru": "Китайский юань", "nominal": 1, "rate": 1_782.30, "diff": -3.15},
        {"code": "JPY", "ccy_name_ru": "Японская иена", "nominal": 100, "rate": 8_654.20, "diff": 22.80},
        {"code": "KZT", "ccy_name_ru": "Казахстанский тенге", "nominal": 100, "rate": 2_581.40, "diff": -1.20},
        {"code": "CHF", "ccy_name_ru": "Швейцарский франк", "nominal": 1, "rate": 14_523.60, "diff": 8.90},
    ]
    stats["currency_rates"] = 0
    for cdata in currency_rates_data:
        existing = db.query(CurrencyRate).filter(
            CurrencyRate.code == cdata["code"],
            CurrencyRate.rate_date == today,
        ).first()
        if existing:
            continue
        rate = CurrencyRate(
            code=cdata["code"],
            ccy_name_ru=cdata["ccy_name_ru"],
            nominal=cdata["nominal"],
            rate=cdata["rate"],
            diff=cdata["diff"],
            rate_date=today,
        )
        db.add(rate)
        stats["currency_rates"] += 1

    # ── 5. CPI / Inflation Records (ИПЦ Узбекистана) ──
    cpi_data = [
        {"year": 2024, "value": 10.0},
        {"year": 2023, "value": 10.8},
        {"year": 2022, "value": 12.3},
        {"year": 2021, "value": 10.0},
        {"year": 2020, "value": 11.1},
        {"year": 2019, "value": 15.2},
        {"year": 2018, "value": 17.5},
        {"year": 2017, "value": 13.9},
        {"year": 2016, "value": 8.0},
        {"year": 2015, "value": 8.5},
    ]
    stats["cpi_records"] = 0
    for cpd in cpi_data:
        period = date(cpd["year"], 1, 1)
        existing = db.query(CPIRecord).filter(
            CPIRecord.source == "worldbank",
            CPIRecord.region == "Узбекистан",
            CPIRecord.period_date == period,
        ).first()
        if existing:
            continue
        rec = CPIRecord(
            region="Узбекистан",
            category="Общий ИПЦ",
            value=cpd["value"],
            period_date=period,
            source="worldbank",
        )
        db.add(rec)
        stats["cpi_records"] += 1

    # ── 6. Stock Exchange (биржа UZSE — демо-данные) ──
    stock_emitters_data = [
        {"ticker": "HMKB", "full_name": "Hamkorbank ATB", "sector": "Банки"},
        {"ticker": "SQBN", "full_name": "SQB (Узнацбанк)", "sector": "Банки"},
        {"ticker": "TPLK", "full_name": "Tashkent Pharmaceutical", "sector": "Фармацевтика"},
        {"ticker": "KVTS", "full_name": "Kvarts", "sector": "Промышленность"},
        {"ticker": "UZFR", "full_name": "UzAuto Finance", "sector": "Финансы"},
    ]
    stats["stock_emitters"] = 0
    stats["stock_quotes"] = 0
    for edata in stock_emitters_data:
        existing = db.query(StockEmitter).filter(
            StockEmitter.ticker == edata["ticker"]
        ).first()
        if not existing:
            emitter = StockEmitter(
                ticker=edata["ticker"],
                full_name=edata["full_name"],
                sector=edata["sector"],
            )
            db.add(emitter)
            stats["stock_emitters"] += 1

    stock_quotes_data = [
        {"ticker": "HMKB", "emitter_name": "Hamkorbank ATB", "close_price": 58.0, "volume": 125_000, "high_price": 59.5, "low_price": 57.2, "open_price": 57.5},
        {"ticker": "SQBN", "emitter_name": "SQB (Узнацбанк)", "close_price": 120.5, "volume": 80_000, "high_price": 122.0, "low_price": 119.0, "open_price": 119.5},
        {"ticker": "TPLK", "emitter_name": "Tashkent Pharmaceutical", "close_price": 15_200.0, "volume": 5_400, "high_price": 15_500.0, "low_price": 15_000.0, "open_price": 15_100.0},
        {"ticker": "KVTS", "emitter_name": "Kvarts", "close_price": 3_800.0, "volume": 12_000, "high_price": 3_900.0, "low_price": 3_750.0, "open_price": 3_780.0},
        {"ticker": "UZFR", "emitter_name": "UzAuto Finance", "close_price": 8_950.0, "volume": 8_500, "high_price": 9_100.0, "low_price": 8_800.0, "open_price": 8_850.0},
    ]
    for qdata in stock_quotes_data:
        existing = db.query(StockQuote).filter(
            StockQuote.ticker == qdata["ticker"],
            StockQuote.trade_date == today,
        ).first()
        if existing:
            continue
        quote = StockQuote(
            ticker=qdata["ticker"],
            emitter_name=qdata["emitter_name"],
            close_price=qdata["close_price"],
            open_price=qdata["open_price"],
            high_price=qdata["high_price"],
            low_price=qdata["low_price"],
            volume=qdata["volume"],
            trade_date=today,
        )
        db.add(quote)
        stats["stock_quotes"] += 1

    # ── 7. Macro Indicators (макроэкономика Узбекистана — демо) ──
    macro_data = [
        {"code": "NY.GDP.MKTP.CD", "name": "ВВП (текущий, USD)", "value": 92_300_000_000, "unit": "USD", "year": 2024},
        {"code": "NY.GDP.MKTP.KD.ZG", "name": "Рост ВВП", "value": 6.2, "unit": "%", "year": 2024},
        {"code": "FP.CPI.TOTL.ZG", "name": "Инфляция (потребительские цены)", "value": 10.0, "unit": "%", "year": 2024},
        {"code": "SP.POP.TOTL", "name": "Население", "value": 36_800_000, "unit": "человек", "year": 2024},
        {"code": "NV.IND.TOTL.ZS", "name": "Промышленность (% ВВП)", "value": 28.5, "unit": "%", "year": 2024},
    ]
    stats["macro_indicators"] = 0
    for mdata in macro_data:
        period = date(mdata["year"], 1, 1)
        existing = db.query(MacroIndicator).filter(
            MacroIndicator.indicator_code == mdata["code"],
            MacroIndicator.period_date == period,
        ).first()
        if existing:
            continue
        ind = MacroIndicator(
            source="worldbank",
            indicator_code=mdata["code"],
            indicator_name=mdata["name"],
            value=mdata["value"],
            unit=mdata["unit"],
            period_date=period,
        )
        db.add(ind)
        stats["macro_indicators"] += 1

    db.commit()

    total_portfolios = len(created_portfolios)
    total_decisions = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.created_by == user.id)
        .count()
    )

    return {
        "status": "success",
        "demo_email": DEMO_EMAIL,
        "demo_password": DEMO_PASSWORD,
        "user_created": stats["user"],
        "new_portfolios": stats["portfolios"],
        "new_decisions": stats["decisions"],
        "currency_rates": stats["currency_rates"],
        "cpi_records": stats["cpi_records"],
        "stock_emitters": stats["stock_emitters"],
        "stock_quotes": stats["stock_quotes"],
        "macro_indicators": stats["macro_indicators"],
        "total_portfolios": total_portfolios,
        "total_decisions": total_decisions,
        "message": (
            f"Демо-данные загружены: {total_portfolios} портфелей, "
            f"{total_decisions} решений, "
            f"{stats['currency_rates']} курсов валют, "
            f"{stats['cpi_records']} записей ИПЦ, "
            f"{stats['stock_quotes']} биржевых котировок, "
            f"{stats['macro_indicators']} макропоказателей. "
            f"Вход: {DEMO_EMAIL} / {DEMO_PASSWORD}"
        ),
    }
