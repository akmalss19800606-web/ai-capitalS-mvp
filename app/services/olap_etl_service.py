"""
OLAP ETL Service — Аналитика v1.0, задачи 10-18.
ETL: balance_entries -> dim_* + fact_balance_olap
"""
import logging
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.models.olap import (
    DimTime, DimCompany, DimAccount, DimCurrency, DimDataType, FactBalanceOLAP
)

logger = logging.getLogger(__name__)

# ── Задача 12: populate_dim_time ──────────────────────────────────────────
def populate_dim_time(session: Session) -> dict:
    """Upsert DimTime из уникальных period_date в balance_entries."""
    MONTHS_RU = ["", "Январь", "Февраль", "Март", "Апрель",
                 "Май", "Июнь", "Июль", "Август",
                 "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]
    DAYS_RU = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]
    rows = session.execute(text("SELECT DISTINCT period_date FROM balance_entries WHERE period_date IS NOT NULL")).fetchall()
    count = 0
    for row in rows:
        d: date = row[0]
        existing = session.query(DimTime).filter(DimTime.full_date == d).first()
        if not existing:
            session.add(DimTime(
                full_date=d, year=d.year,
                quarter=(d.month - 1) // 3 + 1,
                month=d.month, month_name=MONTHS_RU[d.month],
                week=d.isocalendar()[1], day=d.day,
                day_of_week=d.weekday(), day_name=DAYS_RU[d.weekday()],
                is_weekend=1 if d.weekday() >= 5 else 0,
            ))
            count += 1
    session.flush()
    return {"inserted": count, "total": len(rows)}


# ── Задача 13: populate_dim_account ──────────────────────────────────────
def populate_dim_account(session: Session) -> dict:
    """Upsert DimAccount из chart_of_accounts."""
    rows = session.execute(text(
        "SELECT code, name_ru, category, parent_code, level FROM chart_of_accounts WHERE is_active = true"
    )).fetchall()
    count = 0
    for r in rows:
        code, name, cat, parent, lvl = r
        existing = session.query(DimAccount).filter(DimAccount.account_code == code).first()
        if not existing:
            # Если parent_code содержит 2 символа — группа, иначе лист
            is_leaf = 1 if (parent and len(str(parent)) >= 2) else 0
            session.add(DimAccount(
                account_code=code,
                account_name=name or code,
                account_type=str(cat) if cat else None,
                parent_code=str(parent) if parent else None,
                level=lvl or 1,
                is_leaf=is_leaf,
            ))
            count += 1
    session.flush()
    return {"inserted": count, "total": len(rows)}

# ── Задача 14: populate_dim_company ────────────────────────────────────
def populate_dim_company(session: Session) -> dict:
    """Upsert DimCompany из organizations."""
    rows = session.execute(text(
        "SELECT id, name, inn, address, oked FROM organizations WHERE is_active = true"
    )).fetchall()
    count = 0
    for r in rows:
        org_id, name, inn, address, oked = r
        existing = session.query(DimCompany).filter(
            DimCompany.source_decision_id == org_id
        ).first()
        if not existing:
            session.add(DimCompany(
                asset_name=name or f"Org-{org_id}",
                asset_symbol=inn or str(org_id),
                sector=oked or None,
                source_decision_id=org_id,
            ))
            count += 1
    session.flush()
    return {"inserted": count, "total": len(rows)}


# ── Задача 15: populate_dim_currency ──────────────────────────────────
def populate_dim_currency(session: Session) -> dict:
    """Upsert 4 валюты: UZS, USD, EUR, RUB."""
    currencies = [
        ("UZS", "Узбекский сум", 1.0),
        ("USD", "Доллар США", None),
        ("EUR", "Евро", None),
        ("RUB", "Российский рубль", None),
    ]
    count = 0
    for code, name, rate in currencies:
        existing = session.query(DimCurrency).filter(DimCurrency.currency_code == code).first()
        if not existing:
            session.add(DimCurrency(currency_code=code, currency_name=name, exchange_rate_to_uzs=rate))
            count += 1
    session.flush()
    return {"inserted": count, "total": 4}


# ── Задача 16: populate_dim_data_type ────────────────────────────────
def populate_dim_data_type(session: Session) -> dict:
    """Upsert 4 типа данных: balance, turnover, budget, forecast."""
    data_types = [
        ("balance", "Баланс"),
        ("turnover", "Оборот"),
        ("budget", "Бюджет"),
        ("forecast", "Прогноз"),
    ]
    count = 0
    for code, name in data_types:
        existing = session.query(DimDataType).filter(DimDataType.data_type_code == code).first()
        if not existing:
            session.add(DimDataType(data_type_code=code, data_type_name=name))
            count += 1
    session.flush()
    return {"inserted": count, "total": 4}

# ── Задачи 17-18: run_etl ────────────────────────────────────────────────
def run_etl(session: Session, org_id: Optional[int] = None) -> dict:
    """
    Главная ETL-функция. Задача 17.
    1. Заполняем dimension-таблицы
    2. Читаем balance_entries (optionald фильтр по org_id)
    3. Резолвим FK из dimensions
    4. INSERT в fact_balance_olap
    """
    import time
    start = time.time()
    try:
        # Шаг 1: заполняем дименсионы
        t_res = populate_dim_time(session)
        a_res = populate_dim_account(session)
        c_res = populate_dim_company(session)
        populate_dim_currency(session)
        populate_dim_data_type(session)
        session.commit()
        logger.info(f"Dimensions populated: time={t_res}, account={a_res}, company={c_res}")

        # Шаг 2: читаем balance_entries
        where = "WHERE be.organization_id = :org_id" if org_id else ""
        sql = text(f"""
            SELECT
                be.id,
                be.organization_id,
                be.period_date,
                be.debit,
                be.credit,
                be.balance,
                be.currency,
                coa.code AS account_code
            FROM balance_entries be
            JOIN chart_of_accounts coa ON coa.id = be.account_id
            {where}
        """)
        params = {"org_id": org_id} if org_id else {}
        entries = session.execute(sql, params).fetchall()

        # Шаг 3-4: резолвим FK и INSERT в fact
        records_processed = 0
        dt_balance = session.query(DimDataType).filter(DimDataType.data_type_code == "balance").first()

        for e in entries:
            be_id, o_id, period_date, debit, credit, balance, currency, account_code = e

            # Резолвим FK dimensions
            dim_t = session.query(DimTime).filter(DimTime.full_date == period_date).first()
            dim_a = session.query(DimAccount).filter(DimAccount.account_code == account_code).first()
            dim_c = session.query(DimCompany).filter(DimCompany.source_decision_id == o_id).first()
            dim_cur = session.query(DimCurrency).filter(
                DimCurrency.currency_code == (currency or "UZS")
            ).first()

            if not dim_t or not dim_a or not dim_c:
                continue  # пропускаем если дименсия не найдена

            fact = FactBalanceOLAP(
                dim_time_id=dim_t.id,
                dim_company_id=dim_c.id,
                dim_account_id=dim_a.id,
                dim_currency_id=dim_cur.id if dim_cur else None,
                dim_data_type_id=dt_balance.id if dt_balance else None,
                amount=float(balance or 0),
                debit=float(debit or 0),
                credit=float(credit or 0),
            )
            session.add(fact)
            records_processed += 1

            # Батчий коммит каждые 500 записей
            if records_processed % 500 == 0:
                session.commit()

        session.commit()
        duration = round(time.time() - start, 2)
        logger.info(f"ETL complete: {records_processed} records in {duration}s")
        return {
            "status": "ok",
            "records_processed": records_processed,
            "duration_seconds": duration,
        }

    except Exception as exc:
        session.rollback()
        logger.error(f"ETL failed: {exc}")
        raise
