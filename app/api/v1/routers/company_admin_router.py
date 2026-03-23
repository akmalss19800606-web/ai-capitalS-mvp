from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.schemas.islamic_stage2 import CompanyImportResponse
from app.services import company_import_service

router = APIRouter(prefix="/islamic/admin", tags=["islamic-admin"])


@router.post("/companies/import", response_model=CompanyImportResponse)
async def import_companies(
    file: UploadFile = File(...),
    source: str = Form(default="csv"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = (await file.read()).decode("utf-8")
    return company_import_service.import_from_csv(
        db, content, source, current_user.id, file.filename
    )


@router.get("/companies/batches")
def get_batches(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return company_import_service.get_batches(db)
