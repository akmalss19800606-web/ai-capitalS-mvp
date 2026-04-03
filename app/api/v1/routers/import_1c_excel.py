"""
E2-03: API endpoint for 1C Excel import (10-sheet format).
"""
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.organization_models import Organization
from app.services.excel_1c_parser import Excel1CParser
from app.api.v1.routers.portfolios import _user_cache, _is_credit_account, _classify_account

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analytics"])


@router.post("/analytics/import/1c-excel")
def import_1c_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Импорт выгрузки 1С Excel (10-листовый формат)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Файл не указан")

    suffix = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if suffix not in ("xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Поддерживаются только файлы .xlsx / .xls")

    contents = file.file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Файл пуст")

    parser = Excel1CParser()
    try:
        parsed = parser.parse(contents, file.filename)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Ошибка парсинга: {exc}")

    # Build summary
    period_str = ""
    period_from_iso = ""
    period_to_iso = ""
    if parsed.period_from and parsed.period_to:
        period_str = f"{parsed.period_from.strftime('%d.%m.%Y')} — {parsed.period_to.strftime('%d.%m.%Y')}"
        period_from_iso = parsed.period_from.isoformat()
        period_to_iso = parsed.period_to.isoformat()

    summary = {
        "organization": parsed.organization_name,
        "inn": parsed.inn,
        "period": period_str,
        "period_from": period_from_iso,
        "period_to": period_to_iso,
        "director": parsed.director,
        "accountant": parsed.accountant,
        "sheets_found": parsed.sheets_found,
        "sheets_parsed": parsed.sheets_parsed,
        "accounts_count": len(parsed.osv_entries),
        "fixed_assets_count": len(parsed.fixed_assets),
        "inventory_count": len(parsed.inventory),
        "receivables_count": len(parsed.receivables),
        "payables_count": len(parsed.payables),
        "cash_count": len(parsed.cash),
        "cashflow_count": len(parsed.cashflow),
        "income_expenses_count": len(parsed.income_expenses),
        "loans_count": len(parsed.loans),
        "capital_count": len(parsed.capital_rows),
        "tax_count": len(parsed.tax_rows),
        "warnings": parsed.warnings,
        "company_info": {
            "name": parsed.organization_name,
            "inn": parsed.inn,
            "address": parsed.address,
            "activity": parsed.activity,
            "director": parsed.director,
            "accountant": parsed.accountant,
            "unit": parsed.unit,
            "period": period_str,
        },
    }

    # Detailed parsed data for downstream use
    summary["data"] = {
        "osv": [
            {
                "account_code": e.account_code,
                "account_name": e.account_name,
                "debit_start": float(e.debit_start),
                "credit_start": float(e.credit_start),
                "debit_end": float(e.debit_end),
                "credit_end": float(e.credit_end),
            }
            for e in parsed.osv_entries
        ],
        "fixed_assets": parsed.fixed_assets,
        "inventory": parsed.inventory,
        "receivables": parsed.receivables,
        "payables": parsed.payables,
        "cash": parsed.cash,
        "cashflow": parsed.cashflow,
        "income_expenses": parsed.income_expenses,
        "loans": parsed.loans,
        "capital": parsed.capital_rows,
        "tax": parsed.tax_rows,
    }

    # ── Persist organization to DB (upsert by INN + user_id) ─────────
    try:
        inn_val = (parsed.inn or "").strip()
        org = None
        if inn_val:
            org = db.query(Organization).filter(
                Organization.inn == inn_val,
                Organization.user_id == current_user.id,
            ).first()
        if not org:
            org = db.query(Organization).filter(
                Organization.user_id == current_user.id,
            ).first()
        if not org:
            org = Organization(
                user_id=current_user.id,
                name=parsed.organization_name or "Без названия",
                inn=inn_val or None,
            )
            db.add(org)
        # Update fields from parsed data
        if parsed.organization_name:
            org.name = parsed.organization_name
        if parsed.director:
            org.director = parsed.director
        if parsed.accountant:
            org.accountant = parsed.accountant
        if parsed.address:
            org.address = parsed.address
        if parsed.activity:
            org.oked_name = parsed.activity
        if parsed.period_from:
            org.period_from = parsed.period_from
        if parsed.period_to:
            org.period_to = parsed.period_to
        db.commit()
        db.refresh(org)
        logger.info("1C import: org saved to DB, id=%s inn=%s", org.id, org.inn)
    except Exception as exc:
        logger.warning("1C import: failed to persist org to DB: %s", exc)
        db.rollback()

    # Cache parsed 1C data for report endpoints (P&L, CashFlow, Capital, FixedAssets)
    cache = _user_cache(current_user.id)
    cache["company_info"] = summary["company_info"]
    cache["income_expenses"] = parsed.income_expenses
    cache["cashflow"] = parsed.cashflow
    cache["capital_rows"] = parsed.capital_rows
    cache["fixed_assets"] = parsed.fixed_assets
    cache["tax_rows"] = parsed.tax_rows

    # ── Extract tax expense from 1C tax sheet (Налог_на_прибыль) ─────
    # The tax sheet contains "РАСХОД ПО ТЕКУЩЕМУ НАЛОГУ" which is the actual
    # income tax amount. Code 9720 may NOT exist in income_expenses sheet.
    tax_expense_from_sheet = 0.0
    for tr in parsed.tax_rows:
        if not isinstance(tr, dict):
            continue
        tr_name = str(tr.get("name", "")).upper()
        if "РАСХОД" in tr_name and "НАЛОГ" in tr_name:
            tax_expense_from_sheet = abs(float(tr.get("current_year") or 0))
            break
    if tax_expense_from_sheet == 0:
        # Fallback: sum all positive current_year values from tax sheet
        for tr in parsed.tax_rows:
            if not isinstance(tr, dict):
                continue
            val = float(tr.get("current_year") or 0)
            if val > 0:
                tax_expense_from_sheet = val
                break
    if tax_expense_from_sheet > 0:
        cache["tax_expense"] = tax_expense_from_sheet
        logger.info("1C import: tax_expense from tax sheet = %.0f", tax_expense_from_sheet)

    # ── Build accounts dict + pnl dict from OSV entries ──────────────
    # This enables KPI calculations (profitability, DCF, stress-test, etc.)
    accounts = {}
    revenue_accounts = {}
    expense_accounts = {}

    for e in parsed.osv_entries:
        code = e.account_code.strip()
        if not code or "." in code:
            continue
        base = code[:4] if len(code) >= 4 else code

        ds = float(e.debit_start)
        cs = float(e.credit_start)
        de = float(e.debit_end)
        ce = float(e.credit_end)

        prefix = int(base[:2]) if base[:2].isdigit() else 0

        # Revenue accounts (90xx-99xx)
        if 90 <= prefix <= 99:
            revenue_accounts[base] = {
                "code": base, "name": e.account_name,
                "credit_start": cs, "credit_end": ce,
            }
            continue
        elif 20 <= prefix <= 29 and de > 0:
            # Cost/expense accounts
            expense_accounts[base] = {
                "code": base, "name": e.account_name,
                "debit_start": ds, "debit_end": de,
            }

        is_credit = _is_credit_account(base)
        accounts[base] = {
            "code": base,
            "name": e.account_name,
            "debit_start": ds,
            "credit_start": cs,
            "debit_end": de,
            "credit_end": ce,
            "current": ce if is_credit else de,
            "previous": cs if is_credit else ds,
            "section": _classify_account(base),
        }

    # Fallback: extract revenue/expense from income_expenses list (1C format)
    # Trigger when no revenue_accounts OR when OSV-derived revenue sums to 0
    osv_revenue_total = sum(a.get("credit_end", 0) for a in revenue_accounts.values())
    osv_expense_total = sum(a.get("debit_end", 0) for a in expense_accounts.values())
    if parsed.income_expenses and (not revenue_accounts or osv_revenue_total == 0):
        ie_revenue_cur = 0.0
        ie_revenue_prev = 0.0
        ie_costs_cur = 0.0
        ie_costs_prev = 0.0
        for ie in parsed.income_expenses:
            if not isinstance(ie, dict):
                continue
            name_str = str(ie.get("name", ""))
            code = name_str[:4]
            cur_val = float(ie.get("current_year") or 0)
            prev_val = float(ie.get("previous_year") or 0)
            if code.startswith("90"):
                ie_revenue_cur += cur_val
                ie_revenue_prev += prev_val
            elif code.startswith("20") or code.startswith("29") or code.startswith("94"):
                # 20xx = COGS, 29xx = production wages, 94xx = opex
                ie_costs_cur += cur_val
                ie_costs_prev += prev_val
        if ie_revenue_cur > 0:
            revenue_accounts = {"9010": {"code": "9010", "name": "Выручка (из доходов/расходов)", "credit_start": ie_revenue_prev, "credit_end": ie_revenue_cur}}
        if ie_costs_cur > 0 and osv_expense_total == 0:
            expense_accounts = {"2010": {"code": "2010", "name": "Себестоимость (из доходов/расходов)", "debit_start": ie_costs_prev, "debit_end": ie_costs_cur}}

    total_revenue_start = sum(a["credit_start"] for a in revenue_accounts.values())
    total_revenue_end = sum(a["credit_end"] for a in revenue_accounts.values())
    total_expenses_start = sum(a["debit_start"] for a in expense_accounts.values())
    total_expenses_end = sum(a["debit_end"] for a in expense_accounts.values())

    pnl_data = {
        "total_revenue_start": total_revenue_start,
        "total_revenue_end": total_revenue_end,
        "total_expenses_start": total_expenses_start,
        "total_expenses_end": total_expenses_end,
        "net_profit_start": total_revenue_start - total_expenses_start,
        "net_profit_end": total_revenue_end - total_expenses_end,
        "revenue_accounts": revenue_accounts,
        "expense_accounts": expense_accounts,
    }

    cache["accounts"] = accounts
    cache["pnl"] = pnl_data
    logger.info(
        "1C import: %d accounts cached, revenue=%.0f, expenses=%.0f",
        len(accounts), total_revenue_end, total_expenses_end,
    )

    return summary
