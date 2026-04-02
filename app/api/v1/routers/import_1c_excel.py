"""
E2-03: API endpoint for 1C Excel import (10-sheet format).
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.services.excel_1c_parser import Excel1CParser

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

    return summary
