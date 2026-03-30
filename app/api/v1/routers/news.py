"""API роутер для экономических новостей."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.news_service import get_latest_news, refresh_news

router = APIRouter(prefix="/news", tags=["news"])


@router.get("")
def list_news(
    limit: int = Query(default=10, le=50),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Получить последние экономические новости."""
    items = get_latest_news(db, limit=limit, category=category)
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
def trigger_refresh(
    db: Session = Depends(get_db),
):
    """Принудительно обновить новости из RSS."""
    count = refresh_news(db)
    return {"new_items": count, "status": "ok"}