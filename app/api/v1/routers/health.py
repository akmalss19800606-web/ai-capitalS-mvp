"""Health check router — includes Redis status (REDIS-001)."""
from fastapi import APIRouter

from app.services.redis_cache_service import RedisCacheService

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    redis_info = await RedisCacheService.info()
    return {
        "status": "ok",
        "redis": redis_info,
    }
