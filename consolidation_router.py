from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.api.v1.deps import get_db

router = APIRouter(tags=["consolidation"])

# ======== Pydantic Models ========

class ConsolidatedBalanceEntry(BaseModel):
    account_code: str
    account_name: str
    head_amount: float = 0
    subsidiaries_amount: float = 0
    elimination: float = 0
    consolidated: float = 0

class OLAPDimension(BaseModel):
    organization_id: Optional[int] = None
    account_code: Optional[str] = None
    period: Optional[str] = None
    currency: Optional[str] = None

class OLAPRecord(BaseModel):
    organization_id: int
    organization_name: str
    account_code: str
    account_name: str
    period: str
    currency: str
    debit: float
    credit: float
    balance: float

class ETLResult(BaseModel):
    status: str
    records_processed: int
    records_inserted: int
    timestamp: str


# ======== КОНСОЛИДАЦИЯ ========

@router.get("/organizations/{org_id}/consolidated-balance", response_model=List[ConsolidatedBalanceEntry])
def get_consolidated_balance(org_id: int, db: Session = Depends(get_db)):
    """Консолидированный баланс: головная + дочерние/филиалы - элиминация"""
    # Находим головную организацию
    head = db.execute(text("SELECT id, name, mode FROM organizations WHERE id = :id"), {"id": org_id}).fetchone()
    if not head:
        raise HTTPException(404, "Организация не найдена")

    # Находим дочерние/филиалы
    children = db.execute(
        text("SELECT id, name, ownership_share, is_branch FROM organizations WHERE parent_id = :pid"),
        {"pid": org_id}
    ).fetchall()

    # Баланс головной
    head_balance = db.execute(
        text("SELECT account_code, account_name, debit, credit, balance FROM balance_entries WHERE organization_id = :oid"),
        {"oid": org_id}
    ).fetchall()

    head_map = {r[0]: {"name": r[1], "debit": float(r[2] or 0), "credit": float(r[3] or 0), "balance": float(r[4] or 0)} for r in head_balance}

    # Агрегация дочерних
    subs_map = {}
    for child in children:
        child_id = child[0]
        share = float(child[2] or 100) / 100.0
        is_branch = child[3]

        child_balance = db.execute(
            text("SELECT account_code, account_name, debit, credit, balance FROM balance_entries WHERE organization_id = :oid"),
            {"oid": child_id}
        ).fetchall()

        for row in child_balance:
            code = row[0]
            if code not in subs_map:
                subs_map[code] = {"name": row[1], "amount": 0}
            # Для филиалов — 100%, для дочерних — пропорционально доле
            mult = 1.0 if is_branch else share
            subs_map[code]["amount"] += float(row[4] or 0) * mult

    # Собираем все уникальные счета
    all_codes = sorted(set(list(head_map.keys()) + list(subs_map.keys())))

    result = []
    # Счета для элиминации внутригрупповых
    ELIMINATION_CODES = {"6100"}  # Задолженность подразделениям

    for code in all_codes:
        h = head_map.get(code, {"name": "", "debit": 0, "credit": 0, "balance": 0})
        s = subs_map.get(code, {"name": "", "amount": 0})
        name = h["name"] or s["name"]

        head_amt = h["balance"]
        subs_amt = s["amount"]
        elim = 0.0

        # Элиминация внутригрупповых
        if code in ELIMINATION_CODES:
            elim = -(head_amt + subs_amt)

        # Элиминация инвестиций головной в дочерние (0600 vs 8300)
        if code == "0600" and children:
            # Инвестиции головной в дочерние — элиминируются
            elim = -subs_map.get("8300", {"amount": 0})["amount"]

        consolidated_amt = head_amt + subs_amt + elim

        result.append(ConsolidatedBalanceEntry(
            account_code=code,
            account_name=name,
            head_amount=head_amt,
            subsidiaries_amount=subs_amt,
            elimination=elim,
            consolidated=consolidated_amt
        ))

    return result


# ======== OLAP ETL ========

@router.post("/olap/etl", response_model=ETLResult)
def run_olap_etl(db: Session = Depends(get_db)):
    """ETL: переносит данные из balance_entries в OLAP-хранилище (olap_facts)"""

    # Создаём таблицу olap_facts если не существует
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS olap_facts (
            id SERIAL PRIMARY KEY,
            organization_id INTEGER NOT NULL,
            organization_name VARCHAR(255),
            account_code VARCHAR(10),
            account_name VARCHAR(255),
            period VARCHAR(20),
            currency VARCHAR(10) DEFAULT 'UZS',
            data_type VARCHAR(20) DEFAULT 'fact',
            debit NUMERIC(20,2) DEFAULT 0,
            credit NUMERIC(20,2) DEFAULT 0,
            balance NUMERIC(20,2) DEFAULT 0,
            parent_org_id INTEGER,
            is_branch BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.commit()

    # Текущий период
    period = datetime.now().strftime("%Y-%m")

    # Удаляем старые данные за этот период
    db.execute(text("DELETE FROM olap_facts WHERE period = :p"), {"p": period})

    # Загружаем все организации и их балансы
    orgs = db.execute(text("SELECT id, name, currency, parent_id, is_branch FROM organizations")).fetchall()

    records_inserted = 0
    for org in orgs:
        org_id, org_name, currency, parent_id, is_branch = org[0], org[1], org[2] or "UZS", org[3], org[4]

        entries = db.execute(
            text("SELECT account_code, account_name, debit, credit, balance FROM balance_entries WHERE organization_id = :oid"),
            {"oid": org_id}
        ).fetchall()

        for entry in entries:
            db.execute(text("""
                INSERT INTO olap_facts (organization_id, organization_name, account_code, account_name, period, currency, debit, credit, balance, parent_org_id, is_branch)
                VALUES (:oid, :oname, :code, :aname, :period, :cur, :d, :c, :b, :pid, :ib)
            """), {
                "oid": org_id, "oname": org_name, "code": entry[0], "aname": entry[1],
                "period": period, "cur": currency, "d": float(entry[2] or 0),
                "c": float(entry[3] or 0), "b": float(entry[4] or 0),
                "pid": parent_id, "ib": is_branch or False
            })
            records_inserted += 1

    db.commit()

    return ETLResult(
        status="success",
        records_processed=len(orgs),
        records_inserted=records_inserted,
        timestamp=datetime.now().isoformat()
    )


@router.get("/olap/query", response_model=List[OLAPRecord])
def query_olap(
    organization_id: Optional[int] = None,
    account_code: Optional[str] = None,
    period: Optional[str] = None,
    currency: Optional[str] = None,
    group_by: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Запрос к OLAP-хранилищу с фильтрацией по измерениям"""
    # Проверяем существование таблицы
    try:
        db.execute(text("SELECT 1 FROM olap_facts LIMIT 0"))
    except Exception:
        return []

    conditions = []
    params = {}

    if organization_id:
        conditions.append("organization_id = :oid")
        params["oid"] = organization_id
    if account_code:
        conditions.append("account_code LIKE :code")
        params["code"] = f"{account_code}%"
    if period:
        conditions.append("period = :period")
        params["period"] = period
    if currency:
        conditions.append("currency = :cur")
        params["cur"] = currency

    where = " AND ".join(conditions) if conditions else "1=1"

    rows = db.execute(
        text(f"SELECT organization_id, organization_name, account_code, account_name, period, currency, debit, credit, balance FROM olap_facts WHERE {where} ORDER BY organization_id, account_code"),
        params
    ).fetchall()

    return [
        OLAPRecord(
            organization_id=r[0], organization_name=r[1], account_code=r[2],
            account_name=r[3], period=r[4], currency=r[5],
            debit=float(r[6] or 0), credit=float(r[7] or 0), balance=float(r[8] or 0)
        ) for r in rows
    ]


@router.get("/olap/summary")
def olap_summary(db: Session = Depends(get_db)):
    """Сводка OLAP-хранилища: количество записей, организации, периоды"""
    try:
        stats = db.execute(text("""
            SELECT
                COUNT(*) as total_records,
                COUNT(DISTINCT organization_id) as total_orgs,
                COUNT(DISTINCT period) as total_periods,
                COUNT(DISTINCT account_code) as total_accounts,
                MIN(period) as first_period,
                MAX(period) as last_period
            FROM olap_facts
        """)).fetchone()

        if not stats or stats[0] == 0:
            return {"status": "empty", "message": "OLAP-хранилище пусто. Запустите ETL."}

        return {
            "status": "ok",
            "total_records": stats[0],
            "total_organizations": stats[1],
            "total_periods": stats[2],
            "total_accounts": stats[3],
            "first_period": stats[4],
            "last_period": stats[5]
        }
    except Exception:
        return {"status": "empty", "message": "OLAP-хранилище не инициализировано. Запустите ETL."}
