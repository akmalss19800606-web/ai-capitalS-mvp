"""
E1-03: News API endpoints — /dashboard/news (GET) + /dashboard/news/refresh (POST).
"""
import threading

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.session import SessionLocal
from app.services.news_service import NewsService

router = APIRouter(prefix="/dashboard/news", tags=["News"])

_news_service = NewsService()


@router.get("")
def get_dashboard_news(
    limit: int = Query(default=8, le=20),
    category: str | None = Query(default=None),
    source: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить последние новости для дашборда."""
    articles = _news_service.get_latest_news(
        db, limit=limit, category=category, source=source
    )
    return {
        "articles": [
            {
                "id": str(a.id),
                "title": a.title,
                "summary": a.summary,
                "source": a.source,
                "source_url": a.source_url,
                "published_at": a.published_at.isoformat() if a.published_at else None,
                "category": a.category,
            }
            for a in articles
        ],
        "total": len(articles),
    }


def _refresh_news_background():
    """Run news refresh in a background thread with its own DB session."""
    db = SessionLocal()
    try:
        service = NewsService()
        service.fetch_and_store_news(db)
    finally:
        db.close()


@router.post("/refresh", status_code=202)
def refresh_news(
    current_user: User = Depends(get_current_user),
):
    """Запустить обновление новостей в фоновом режиме."""
    thread = threading.Thread(target=_refresh_news_background, daemon=True)
    thread.start()
    return {"status": "refresh_started"}
