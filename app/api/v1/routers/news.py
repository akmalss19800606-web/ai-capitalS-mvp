"""API роутер для экономических новостей."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_db
from app.services.news_service import get_latest_news, refresh_news

router = APIRouter(prefix="/news", tags=["news"])


@router.get("")
async def list_news(
    limit: int = Query(default=10, le=50),
    category: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_async_db),
):
    """Получить последние экономические новости."""
    items = await get_latest_news(db, limit=limit, category=category)
    return {
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "summary": n.summary,
                "url": n.url,
                "source": n.source,
                "category": n.category,
                "published_at": n.published_at.isoformat(),
            }
            for n in items
        ],
        "total": len(items),
    }


@router.post("/refresh")
async def trigger_refresh(
    db: AsyncSession = Depends(get_async_db),
):
    """Принудительно обновить новости из RSS."""
    count = await refresh_news(db)
    return {"new_items": count, "status": "ok"}