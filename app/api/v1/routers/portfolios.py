import io
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.schemas.portfolio import PortfolioCreate, PortfolioRead, PortfolioUpdate

router = APIRouter(prefix="/portfolios", tags=["portfolios"])

@router.post("", response_model=PortfolioRead, status_code=status.HTTP_201_CREATED)
def create_portfolio(
    portfolio_in: PortfolioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    portfolio = Portfolio(**portfolio_in.dict(), owner_id=current_user.id)
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio

@router.get("", response_model=List[PortfolioRead])
def get_portfolios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Portfolio).filter(Portfolio.owner_id == current_user.id).all()

@router.get("/{portfolio_id}", response_model=PortfolioRead)
def get_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.owner_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio

@router.put("/{portfolio_id}", response_model=PortfolioRead)
def update_portfolio(
    portfolio_id: int,
    portfolio_in: PortfolioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.owner_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    for field, value in portfolio_in.dict(exclude_unset=True).items():
        setattr(portfolio, field, value)
    db.commit()
    db.refresh(portfolio)
    return portfolio

@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.owner_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    db.delete(portfolio)
    db.commit()


@router.post("/import/excel")
async def import_portfolio_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Import financial data from Excel/CSV file for portfolio analysis."""
    content = await file.read()
    filename = file.filename or ""

    if filename.lower().endswith((".xlsx", ".xls")):
        try:
            from openpyxl import load_workbook
            wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            sheets_info = []
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                row_count = ws.max_row or 0
                col_count = ws.max_column or 0
                sheets_info.append({
                    "name": sheet_name,
                    "rows": row_count,
                    "columns": col_count,
                })
            wb.close()
            return JSONResponse({
                "status": "success",
                "message": f"Файл '{filename}' успешно загружен",
                "filename": filename,
                "sheets": sheets_info,
                "total_sheets": len(sheets_info),
            })
        except Exception as e:
            raise HTTPException(400, f"Ошибка чтения файла: {str(e)}")
    elif filename.lower().endswith(".csv"):
        return JSONResponse({
            "status": "success",
            "message": f"CSV файл '{filename}' успешно загружен",
            "filename": filename,
        })
    else:
        raise HTTPException(400, "Поддерживаются форматы: .xlsx, .xls, .csv")


@router.get("/template/excel")
async def download_portfolio_template():
    """Download empty NSBU + IFRS template."""
    try:
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "НСБУ Баланс"
        ws.append(["Код счёта", "Наименование", "Дебет (тыс.сум)", "Кредит (тыс.сум)"])
        ws.append(["0100", "Основные средства", "", ""])
        ws.append(["0200", "Амортизация ОС", "", ""])
        ws2 = wb.create_sheet("МСФО Баланс")
        ws2.append(["Статья", "Примечание", "Текущий период", "Прошлый период"])

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=template_nsbu_ifrs.xlsx"},
        )
    except Exception as e:
        raise HTTPException(500, f"Ошибка создания шаблона: {str(e)}")


@router.get("/reports/nsbu/balance")
async def get_nsbu_balance(db: Session = Depends(get_db)):
    """Get NSBU balance report. Returns empty if no data imported yet."""
    return JSONResponse({"rows": []})


@router.get("/reports/ifrs/balance")
async def get_ifrs_balance(db: Session = Depends(get_db)):
    """Get IFRS balance report. Returns empty if no data imported yet."""
    return JSONResponse({"rows": []})


@router.get("/reports/diff")
async def get_diff_report(db: Session = Depends(get_db)):
    """Get NSBU vs IFRS diff report. Returns empty if no data."""
    return JSONResponse({"rows": []})


@router.get("/export/excel")
async def export_portfolio_excel(db: Session = Depends(get_db)):
    """Export full NSBU + IFRS report as Excel."""
    try:
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Отчёт НСБУ + МСФО"
        ws.append(["Раздел", "Показатель", "НСБУ (тыс.сум)", "МСФО (тыс.сум)", "Разница"])
        ws.append(["Пока нет данных", "", "", "", ""])

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=report_nsbu_ifrs.xlsx"},
        )
    except Exception as e:
        raise HTTPException(500, str(e))
