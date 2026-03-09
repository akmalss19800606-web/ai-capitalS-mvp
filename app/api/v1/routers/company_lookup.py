from fastapi import APIRouter
router = APIRouter(prefix="/companies", tags=["company_lookup"])

@router.get("/search")
async def search_company():
    return {"status": "coming_soon", "message": "Company lookup by INN"}
