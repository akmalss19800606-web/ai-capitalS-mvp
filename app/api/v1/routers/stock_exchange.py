from fastapi import APIRouter
router = APIRouter(prefix="/stock-exchange", tags=["stock_exchange"])

@router.get("/trades")
async def get_trades():
    return {"status": "coming_soon", "message": "UZSE trades endpoint"}
