from fastapi import APIRouter
router = APIRouter(prefix="/ai-gateway", tags=["ai_gateway"])

@router.post("/ask")
async def ai_gateway_ask():
    return {"status": "coming_soon", "message": "AI Gateway orchestration"}
