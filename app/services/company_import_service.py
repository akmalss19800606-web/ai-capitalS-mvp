import uuid
import csv
import io
from typing import List
from sqlalchemy.orm import Session
from app.db.models.islamic_stage2 import CompanyImportBatch
from app.db.models.islamic_stage1 import ShariahScreeningCompany
from app.schemas.islamic_stage2 import CompanyImportResponse


def import_from_csv(db: Session, file_content: str, source: str, admin_user_id: int, file_name: str = "") -> CompanyImportResponse:
    batch = CompanyImportBatch(
        id=uuid.uuid4(),
        imported_by=admin_user_id,
        source=source,
        file_name=file_name,
        status="processing",
    )
    db.add(batch)
    db.commit()

    reader = csv.DictReader(io.StringIO(file_content))
    rows = list(reader)
    success = 0
    errors = []

    for i, row in enumerate(rows):
        try:
            name_ru = row.get("name_ru", "").strip()
            ticker = row.get("ticker", "").strip() or None
            isin = row.get("isin", "").strip() or None
            registration_no = row.get("registration_no", "").strip() or None
            market_type = row.get("market_type", "uzse").strip()
            sector = row.get("sector", "").strip() or None

            if not name_ru:
                raise ValueError("name_ru обязателен")

            # Upsert по ticker или registration_no
            existing = None
            if ticker:
                existing = db.query(ShariahScreeningCompany).filter(ShariahScreeningCompany.ticker == ticker).first()
            if not existing and registration_no:
                existing = db.query(ShariahScreeningCompany).filter(ShariahScreeningCompany.registration_no == registration_no).first()

            if existing:
                existing.name_ru = name_ru
                existing.isin = isin or existing.isin
                existing.market_type = market_type
                existing.sector = sector or existing.sector
            else:
                company = ShariahScreeningCompany(
                    id=uuid.uuid4(),
                    name_ru=name_ru,
                    ticker=ticker,
                    isin=isin,
                    registration_no=registration_no,
                    market_type=market_type,
                    sector=sector,
                    country="UZ",
                    is_active=True,
                )
                db.add(company)

            success += 1
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e), "data": row})

    batch.total_rows = len(rows)
    batch.success_rows = success
    batch.error_rows = len(errors)
    batch.errors_json = errors if errors else None
    batch.status = "done" if not errors or success > 0 else "failed"
    db.commit()

    return CompanyImportResponse(
        batch_id=batch.id,
        total_rows=len(rows),
        success_rows=success,
        error_rows=len(errors),
        errors=errors if errors else None,
    )


def get_batches(db: Session) -> List[CompanyImportBatch]:
    return db.query(CompanyImportBatch).order_by(CompanyImportBatch.import_date.desc()).limit(20).all()
