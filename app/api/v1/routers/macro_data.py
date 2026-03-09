from fastapi import APIRouter

router = APIRouter(prefix="/macro", tags=["macro_data"])

@router.get("/health")
async def macro_health():
    return {"status": "ok"}
