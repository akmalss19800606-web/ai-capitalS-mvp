from fastapi import APIRouter
router = APIRouter(prefix="/cpi", tags=["cpi_data"])

@router.get("/current")
async def get_cpi():
    return {"status": "coming_soon", "message": "CPI data endpoint"}
