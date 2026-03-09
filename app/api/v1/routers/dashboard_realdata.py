from fastapi import APIRouter
router = APIRouter(prefix="/dashboard-real", tags=["dashboard_realdata"])

@router.get("/summary")
async def get_real_dashboard():
    return {"status": "coming_soon", "message": "Real data dashboard"}
