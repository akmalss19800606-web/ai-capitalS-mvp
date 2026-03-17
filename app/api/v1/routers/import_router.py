import io
import csv
import re
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import httpx

from app.api.v1.deps import get_db

router = APIRouter(tags=["import"])


# ==================== Pydantic Models ====================

class ImportResult(BaseModel):
    status: str
    records_imported: int
    records_skipped: int
    errors: List[str]
    timestamp: str

class BalanceRow(BaseModel):
    account_code: str
    account_name: str
    debit: float = 0
    credit: float = 0
    balance: float = 0

class OneCConfig(BaseModel):
    base_url: str        # http://server/base/odata/standard.odata
    username: str
    password: str
    company_name: Optional[str] = None

class OneCTestResult(BaseModel):
    status: str
    message: str
    company_name: Optional[str] = None
    accounts_found: int = 0


# ==================== EXCEL / CSV IMPORT ====================

def normalize_account_code(raw: str) -> Optional[str]:
    """Извлекает 4-значный код счёта НСБУ из строки"""
    if not raw:
        return None
    clean = re.sub(r"[^0-9]", "", str(raw).strip())
    if len(clean) >= 4:
        return clean[:4]
    if len(clean) == 2:
        return clean + "00"
    if len(clean) == 3:
        return clean + "0"
    return None


def parse_number(val) -> float:
    """Парсит число из ячейки Excel/CSV"""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(" ", "").replace("\xa0", "")
    s = s.replace(",", ".")
    s = re.sub(r"[^0-9.\-]", "", s)
    try:
        return float(s) if s else 0.0
    except ValueError:
        return 0.0


def detect_columns(headers: List[str]) -> dict:
    """Автоопределение колонок: счёт, название, дебет, кредит, сальдо"""
    mapping = {"code": None, "name": None, "debit": None, "credit": None, "balance": None}

    for i, h in enumerate(headers):
        hl = str(h).lower().strip() if h else ""
        if any(kw in hl for kw in ["счет", "счёт", "код", "code", "account", "schet"]):
            if mapping["code"] is None:
                mapping["code"] = i
        elif any(kw in hl for kw in ["наименование", "название", "name", "описание"]):
            if mapping["name"] is None:
                mapping["name"] = i
        elif any(kw in hl for kw in ["дебет", "debit", "дб", "dt"]):
            if mapping["debit"] is None:
                mapping["debit"] = i
        elif any(kw in hl for kw in ["кредит", "credit", "кр", "kt", "cr"]):
            if mapping["credit"] is None:
                mapping["credit"] = i
        elif any(kw in hl for kw in ["сальдо", "balance", "остаток", "итого"]):
            if mapping["balance"] is None:
                mapping["balance"] = i

    # Fallback: если не нашли по названиям — пробуем по позиции
    if mapping["code"] is None and len(headers) >= 1:
        mapping["code"] = 0
    if mapping["name"] is None and len(headers) >= 2:
        mapping["name"] = 1
    if mapping["debit"] is None and len(headers) >= 3:
        mapping["debit"] = 2
    if mapping["credit"] is None and len(headers) >= 4:
        mapping["credit"] = 3
    if mapping["balance"] is None:
        mapping["balance"] = mapping.get("debit")  # сальдо = дебет если нет отдельного

    return mapping


@router.post("/organizations/{org_id}/import/excel", response_model=ImportResult)
async def import_excel(
    org_id: int,
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Query(None, description="Название листа (по умолчанию — активный)"),
    header_row: int = Query(1, description="Номер строки с заголовками (1-based)"),
    db: Session = Depends(get_db)
):
    """Импорт оборотно-сальдовой ведомости из XLSX/XLS/CSV"""

    # Проверяем организацию
    org = db.execute(text("SELECT id FROM organizations WHERE id = :id"), {"id": org_id}).fetchone()
    if not org:
        raise HTTPException(404, "Организация не найдена")

    content = await file.read()
    filename = file.filename or ""
    errors = []
    rows_data: List[BalanceRow] = []

    if filename.lower().endswith(".csv") or filename.lower().endswith(".tsv"):
        # CSV parsing
        try:
            text_content = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            try:
                text_content = content.decode("cp1251")
            except UnicodeDecodeError:
                text_content = content.decode("utf-8", errors="replace")

        delimiter = "\t" if filename.lower().endswith(".tsv") else ","
        # Auto-detect delimiter
        if ";" in text_content[:500] and "," not in text_content[:500]:
            delimiter = ";"
        elif "\t" in text_content[:500]:
            delimiter = "\t"

        reader = csv.reader(io.StringIO(text_content), delimiter=delimiter)
        all_rows = list(reader)

        if len(all_rows) < 2:
            raise HTTPException(400, "Файл пуст или содержит только заголовки")

        headers = all_rows[header_row - 1]
        mapping = detect_columns(headers)

        for row_idx, row in enumerate(all_rows[header_row:], start=header_row + 1):
            try:
                code_raw = row[mapping["code"]] if mapping["code"] is not None and mapping["code"] < len(row) else None
                code = normalize_account_code(code_raw)
                if not code:
                    continue

                name = row[mapping["name"]] if mapping["name"] is not None and mapping["name"] < len(row) else ""
                debit = parse_number(row[mapping["debit"]] if mapping["debit"] is not None and mapping["debit"] < len(row) else 0)
                credit = parse_number(row[mapping["credit"]] if mapping["credit"] is not None and mapping["credit"] < len(row) else 0)

                if mapping["balance"] is not None and mapping["balance"] < len(row) and mapping["balance"] != mapping["debit"]:
                    balance = parse_number(row[mapping["balance"]])
                else:
                    balance = debit - credit

                rows_data.append(BalanceRow(account_code=code, account_name=str(name).strip(), debit=debit, credit=credit, balance=balance))
            except Exception as e:
                errors.append(f"Строка {row_idx}: {str(e)}")

    elif filename.lower().endswith((".xlsx", ".xls")):
        # Excel parsing
        try:
            from openpyxl import load_workbook
        except ImportError:
            raise HTTPException(500, "openpyxl не установлен. Добавьте в requirements.txt")

        try:
            wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        except Exception as e:
            raise HTTPException(400, f"Не удалось открыть файл: {str(e)}")

        if sheet_name and sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
        else:
            ws = wb.active

        all_rows = []
        for row in ws.iter_rows(values_only=True):
            all_rows.append(list(row))

        wb.close()

        if len(all_rows) < 2:
            raise HTTPException(400, "Файл пуст или содержит только заголовки")

        headers = [str(h) if h else "" for h in all_rows[header_row - 1]]
        mapping = detect_columns(headers)

        for row_idx, row in enumerate(all_rows[header_row:], start=header_row + 1):
            try:
                code_raw = row[mapping["code"]] if mapping["code"] is not None and mapping["code"] < len(row) else None
                code = normalize_account_code(code_raw)
                if not code:
                    continue

                name = row[mapping["name"]] if mapping["name"] is not None and mapping["name"] < len(row) else ""
                debit = parse_number(row[mapping["debit"]] if mapping["debit"] is not None and mapping["debit"] < len(row) else 0)
                credit = parse_number(row[mapping["credit"]] if mapping["credit"] is not None and mapping["credit"] < len(row) else 0)

                if mapping["balance"] is not None and mapping["balance"] < len(row) and mapping["balance"] != mapping["debit"]:
                    balance = parse_number(row[mapping["balance"]])
                else:
                    balance = debit - credit

                rows_data.append(BalanceRow(account_code=code, account_name=str(name).strip() if name else "", debit=debit, credit=credit, balance=balance))
            except Exception as e:
                errors.append(f"Строка {row_idx}: {str(e)}")
    else:
        raise HTTPException(400, "Поддерживаются форматы: .xlsx, .xls, .csv, .tsv")

    if not rows_data:
        raise HTTPException(400, f"Не удалось извлечь данные из файла. Ошибки: {'; '.join(errors[:5])}")

    # Сохраняем в БД
    records_imported = 0
    records_skipped = 0

    # Удаляем старые записи
    db.execute(text("DELETE FROM balance_entries WHERE organization_id = :oid"), {"oid": org_id})

    for row in rows_data:
        try:
            db.execute(text("""
                INSERT INTO balance_entries (organization_id, account_code, account_name, debit, credit, balance)
                VALUES (:oid, :code, :name, :d, :c, :b)
                ON CONFLICT (organization_id, account_code) DO UPDATE SET
                    account_name = EXCLUDED.account_name,
                    debit = EXCLUDED.debit,
                    credit = EXCLUDED.credit,
                    balance = EXCLUDED.balance
            """), {
                "oid": org_id, "code": row.account_code, "name": row.account_name,
                "d": row.debit, "c": row.credit, "b": row.balance
            })
            records_imported += 1
        except Exception as e:
            records_skipped += 1
            errors.append(f"Счёт {row.account_code}: {str(e)}")

    db.commit()

    return ImportResult(
        status="success",
        records_imported=records_imported,
        records_skipped=records_skipped,
        errors=errors[:10],
        timestamp=datetime.now().isoformat()
    )


@router.get("/import/template")
async def download_import_template():
    """Скачать шаблон Excel для импорта оборотно-сальдовой"""
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    except ImportError:
        raise HTTPException(500, "openpyxl не установлен")

    wb = Workbook()
    ws = wb.active
    ws.title = "Оборотно-сальдовая"

    # Заголовки
    headers = ["Счёт", "Наименование счёта", "Дебет", "Кредит", "Сальдо"]
    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin")
    )

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin_border

    # Примеры данных
    sample_data = [
        ["0100", "Основные средства", 150000000, 0, 150000000],
        ["0200", "Износ основных средств", 0, 45000000, -45000000],
        ["1000", "Материалы и запасы", 28000000, 0, 28000000],
        ["2800", "Готовая продукция", 12000000, 0, 12000000],
        ["4000", "Счета к получению", 35000000, 0, 35000000],
        ["5100", "Расчётный счёт", 89000000, 0, 89000000],
        ["5200", "Валютные счета", 25000000, 0, 25000000],
        ["6000", "Счета к оплате поставщикам", 0, 42000000, -42000000],
        ["6400", "Задолженность по платежам в бюджет", 0, 8500000, -8500000],
        ["6700", "Расчёты с персоналом", 0, 15000000, -15000000],
        ["6800", "Краткосрочные кредиты", 0, 50000000, -50000000],
        ["8300", "Уставный капитал", 0, 100000000, -100000000],
        ["8700", "Нераспределённая прибыль", 0, 78500000, -78500000],
    ]

    for row_idx, data in enumerate(sample_data, 2):
        for col_idx, val in enumerate(data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.border = thin_border
            if col_idx >= 3:
                cell.number_format = "#,##0"
                cell.alignment = Alignment(horizontal="right")

    # Ширина колонок
    ws.column_dimensions["A"].width = 12
    ws.column_dimensions["B"].width = 40
    ws.column_dimensions["C"].width = 18
    ws.column_dimensions["D"].width = 18
    ws.column_dimensions["E"].width = 18

    # Сохраняем в buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    from fastapi.responses import Response
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=template_balance_import.xlsx"}
    )


# ==================== 1С OData REST API ====================

@router.post("/import/1c/test", response_model=OneCTestResult)
async def test_1c_connection(config: OneCConfig):
    """Тест подключения к 1С через OData REST API"""
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
            # Пробуем получить metadata
            metadata_url = f"{config.base_url.rstrip('/')}/$metadata"
            resp = await client.get(
                metadata_url,
                auth=(config.username, config.password),
                headers={"Accept": "application/xml"}
            )

            if resp.status_code == 401:
                return OneCTestResult(status="error", message="Ошибка авторизации: неверный логин/пароль")

            if resp.status_code != 200:
                return OneCTestResult(status="error", message=f"HTTP {resp.status_code}: {resp.text[:200]}")

            # Пробуем получить план счетов
            accounts_url = f"{config.base_url.rstrip('/')}/ChartOfAccounts_Хозрасчетный?$format=json&$top=5"
            acc_resp = await client.get(
                accounts_url,
                auth=(config.username, config.password),
                headers={"Accept": "application/json"}
            )

            accounts_found = 0
            if acc_resp.status_code == 200:
                data = acc_resp.json()
                accounts_found = len(data.get("value", []))

            return OneCTestResult(
                status="success",
                message="Подключение установлено",
                company_name=config.company_name,
                accounts_found=accounts_found
            )
    except httpx.TimeoutException:
        return OneCTestResult(status="error", message="Таймаут подключения. Проверьте URL и доступность сервера 1С")
    except Exception as e:
        return OneCTestResult(status="error", message=f"Ошибка: {str(e)}")


@router.post("/organizations/{org_id}/import/1c", response_model=ImportResult)
async def import_from_1c(
    org_id: int,
    config: OneCConfig,
    period: Optional[str] = Query(None, description="Период (YYYY-MM)"),
    db: Session = Depends(get_db)
):
    """Импорт оборотно-сальдовой из 1С через OData REST API"""

    org = db.execute(text("SELECT id FROM organizations WHERE id = :id"), {"id": org_id}).fetchone()
    if not org:
        raise HTTPException(404, "Организация не найдена")

    errors = []
    rows_data: List[BalanceRow] = []

    try:
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            base = config.base_url.rstrip("/")
            auth = (config.username, config.password)
            headers = {"Accept": "application/json"}

            # Вариант 1: Регистр бухгалтерии — Хозрасчетный
            # Типичные OData-ресурсы 1С для оборотно-сальдовой:
            # - AccountingRegister_Хозрасчетный/Balance
            # - AccountingRegister_Хозрасчетный/Turnovers
            # - InformationRegister_КурсыВалют

            # Пробуем несколько вариантов URL
            odata_urls = [
                f"{base}/AccountingRegister_Хозрасчетный/Balance?$format=json",
                f"{base}/AccountingRegister_Хозрасчетный_Balance?$format=json",
                f"{base}/AccountingRegister_Хозрасчетный/Turnovers?$format=json",
                f"{base}/AccumulationRegister_Хозрасчетный?$format=json",
            ]

            # Если указан период, добавляем фильтр
            if period:
                period_filter = f"&$filter=Period ge datetime'{period}-01T00:00:00'"
                odata_urls = [url + period_filter for url in odata_urls]

            data = None
            for url in odata_urls:
                try:
                    resp = await client.get(url, auth=auth, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        if "value" in data and len(data["value"]) > 0:
                            break
                except Exception:
                    continue

            if not data or "value" not in data:
                # Fallback: пробуем получить план счетов хотя бы
                coa_url = f"{base}/ChartOfAccounts_Хозрасчетный?$format=json&$select=Code,Description"
                coa_resp = await client.get(coa_url, auth=auth, headers=headers)

                if coa_resp.status_code == 200:
                    coa_data = coa_resp.json()
                    for item in coa_data.get("value", []):
                        code = normalize_account_code(item.get("Code", ""))
                        if code:
                            rows_data.append(BalanceRow(
                                account_code=code,
                                account_name=item.get("Description", ""),
                                debit=0, credit=0, balance=0
                            ))
                    if rows_data:
                        errors.append("Получен план счетов без остатков. Для остатков настройте доступ к регистру бухгалтерии.")
                else:
                    raise HTTPException(400, "Не удалось получить данные из 1С. Проверьте URL и права доступа.")
            else:
                # Парсим данные из регистра бухгалтерии
                for item in data["value"]:
                    # Типичная структура записи 1С OData
                    account_ref = item.get("Account_Key") or item.get("Account") or item.get("СчетДт_Key") or ""
                    code = normalize_account_code(str(account_ref))
                    if not code:
                        # Пробуем вложенный объект
                        account_obj = item.get("Account", {})
                        if isinstance(account_obj, dict):
                            code = normalize_account_code(account_obj.get("Code", ""))

                    if not code:
                        continue

                    name = item.get("AccountDescription") or item.get("Account_Description") or ""
                    if isinstance(item.get("Account"), dict):
                        name = item["Account"].get("Description", name)

                    debit = parse_number(item.get("AmountDr") or item.get("СуммаДт") or item.get("AmountBalance") or 0)
                    credit = parse_number(item.get("AmountCr") or item.get("СуммаКт") or 0)
                    balance = parse_number(item.get("AmountBalance") or item.get("СуммаОстаток") or (debit - credit))

                    rows_data.append(BalanceRow(
                        account_code=code, account_name=str(name),
                        debit=debit, credit=credit, balance=balance
                    ))

    except httpx.TimeoutException:
        raise HTTPException(504, "Таймаут подключения к серверу 1С")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Ошибка при подключении к 1С: {str(e)}")

    if not rows_data:
        raise HTTPException(400, "Нет данных для импорта из 1С")

    # Сохраняем
    db.execute(text("DELETE FROM balance_entries WHERE organization_id = :oid"), {"oid": org_id})

    records_imported = 0
    records_skipped = 0

    for row in rows_data:
        try:
            db.execute(text("""
                INSERT INTO balance_entries (organization_id, account_code, account_name, debit, credit, balance)
                VALUES (:oid, :code, :name, :d, :c, :b)
                ON CONFLICT (organization_id, account_code) DO UPDATE SET
                    account_name = EXCLUDED.account_name,
                    debit = EXCLUDED.debit,
                    credit = EXCLUDED.credit,
                    balance = EXCLUDED.balance
            """), {
                "oid": org_id, "code": row.account_code, "name": row.account_name,
                "d": row.debit, "c": row.credit, "b": row.balance
            })
            records_imported += 1
        except Exception as e:
            records_skipped += 1
            errors.append(f"Счёт {row.account_code}: {str(e)}")

    db.commit()

    return ImportResult(
        status="success",
        records_imported=records_imported,
        records_skipped=records_skipped,
        errors=errors[:10],
        timestamp=datetime.now().isoformat()
    )


@router.get("/import/1c/endpoints")
async def get_1c_endpoints():
    """Справочник типовых OData-ресурсов 1С"""
    return {
        "description": "Типовые OData-ресурсы 1С:Предприятие 8.3",
        "base_url_format": "http://<server>/<base>/odata/standard.odata",
        "resources": {
            "plan_of_accounts": {
                "url": "ChartOfAccounts_Хозрасчетный",
                "description": "План счетов бухгалтерского учёта",
                "fields": ["Code", "Description", "Type"]
            },
            "balance": {
                "url": "AccountingRegister_Хозрасчетный/Balance",
                "description": "Остатки по счетам на дату",
                "fields": ["Account", "AmountBalance", "Period"]
            },
            "turnovers": {
                "url": "AccountingRegister_Хозрасчетный/Turnovers",
                "description": "Обороты по счетам за период",
                "fields": ["Account", "AmountDr", "AmountCr", "Period"]
            },
            "balance_and_turnovers": {
                "url": "AccountingRegister_Хозрасчетный/BalanceAndTurnovers",
                "description": "Остатки и обороты (полная ОСВ)",
                "fields": ["Account", "AmountOpeningBalance", "AmountDr", "AmountCr", "AmountClosingBalance"]
            },
            "currency_rates": {
                "url": "InformationRegister_КурсыВалют",
                "description": "Курсы валют",
                "fields": ["Currency", "Rate", "Period"]
            }
        },
        "auth": "HTTP Basic (логин и пароль 1С)",
        "tips": [
            "Убедитесь что в 1С опубликован OData-интерфейс",
            "Для публикации: Администрирование → Публикация на веб-сервере",
            "Проверьте права доступа пользователя к регистрам бухгалтерии",
            "Используйте POST /import/1c/test для проверки подключения"
        ]
    }



# ==================== NSBU BALANCE SHEET IMPORT ====================

@router.post("/organizations/{org_id}/import/balance-nsbu")
async def import_balance_nsbu(
    org_id: int,
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Query(None, description="Sheet name"),
    db: Session = Depends(get_db)
):
    """Import NSBU balance sheet (lines 010-780) from Excel.
    Parses and saves to balance_entries, returns wizard data."""
    from app.services.balance_parser import (
        parse_balance_xlsx, balance_to_entries, balance_to_wizard_data
    )

    org = db.execute(
        text("SELECT id FROM organizations WHERE id = :id"), {"id": org_id}
    ).fetchone()
    if not org:
        raise HTTPException(404, "Organization not found")

    content = await file.read()
    filename = file.filename or ""

    if not filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only .xlsx/.xls files supported")

    parsed = parse_balance_xlsx(content, sheet_name)

    if parsed.errors and not parsed.lines:
        raise HTTPException(400, f"Parse failed: {'; '.join(parsed.errors)}")

    # Save to balance_entries
    entries = balance_to_entries(parsed, period="end")
    db.execute(
        text("DELETE FROM balance_entries WHERE organization_id = :oid"),
        {"oid": org_id}
    )

    records_imported = 0
    save_errors = []
    for entry in entries:
        try:
            db.execute(text("""
                INSERT INTO balance_entries
                    (organization_id, account_code, account_name,
                     debit, credit, balance)
                VALUES (:oid, :code, :name, :d, :c, :b)
                ON CONFLICT (organization_id, account_code)
                DO UPDATE SET
                    account_name = EXCLUDED.account_name,
                    debit = EXCLUDED.debit,
                    credit = EXCLUDED.credit,
                    balance = EXCLUDED.balance
            """), {
                "oid": org_id,
                "code": entry["account_code"],
                "name": entry["account_name"],
                "d": entry["debit"],
                "c": entry["credit"],
                "b": entry["balance"],
            })
            records_imported += 1
        except Exception as e:
            save_errors.append(str(e))

    db.commit()

    wizard_data = balance_to_wizard_data(parsed)
    wizard_data["import_result"] = {
        "status": "success",
        "records_imported": records_imported,
        "records_skipped": len(save_errors),
        "errors": save_errors[:5],
        "timestamp": datetime.now().isoformat(),
    }

    return wizard_data


@router.post("/organizations/{org_id}/import/balance-nsbu/preview")
async def preview_balance_nsbu(
    org_id: int,
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Query(None),
):
    """Preview NSBU balance without saving."""
    from app.services.balance_parser import (
        parse_balance_xlsx, balance_to_wizard_data
    )

    content = await file.read()
    parsed = parse_balance_xlsx(content, sheet_name)
    return balance_to_wizard_data(parsed)
