"""
NewsService — RSS feed aggregator for official financial news sources.
E1-02: Fetch + deduplicate + store news articles from 6 sources.
"""
import logging
from datetime import datetime

import feedparser
import httpx
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.db.models.news import NewsArticle

logger = logging.getLogger(__name__)


class NewsService:
    SOURCES = [
        {
            "name": "cbu.uz",
            "url": "https://cbu.uz/ru/rss/",
            "category": "monetary_policy",
            "description": "ЦБ Узбекистана",
        },
        {
            "name": "stat.uz",
            "url": "https://stat.uz/ru/press-tsentr/novosti-komiteta?format=feed&type=rss",
            "category": "statistics",
            "description": "Госкомстат",
        },
        {
            "name": "mf.uz",
            "url": "https://mf.uz/ru/news?format=feed&type=rss",
            "category": "fiscal",
            "description": "Министерство финансов",
        },
        {
            "name": "worldbank",
            "url": "https://search.worldbank.org/api/v2/news?format=rss&qterm=uzbekistan&lang_exact=Russian",
            "category": "development",
            "description": "Всемирный банк",
        },
        {
            "name": "imf",
            "url": "https://www.imf.org/en/News/rss",
            "category": "global",
            "description": "МВФ",
        },
        {
            "name": "gazeta.uz",
            "url": "https://www.gazeta.uz/ru/rss/economy/",
            "category": "local",
            "description": "Gazeta.uz экономика",
        },
    ]

    def fetch_and_store_news(self, db: Session) -> int:
        """Получить новости из всех RSS-источников и сохранить в БД.
        Дедупликация по source_url.
        Возвращает количество добавленных статей."""
        total_added = 0
        for source in self.SOURCES:
            try:
                articles = self._fetch_rss(source)
                for article_data in articles:
                    existing = db.execute(
                        select(NewsArticle).where(
                            NewsArticle.source_url == article_data["source_url"]
                        )
                    ).scalar_one_or_none()
                    if existing is None:
                        article = NewsArticle(**article_data)
                        db.add(article)
                        total_added += 1
                db.commit()
            except Exception as e:
                logger.error("Error fetching %s: %s", source["name"], e)
                db.rollback()
        return total_added

    def _fetch_rss(self, source: dict) -> list[dict]:
        """Fetch and parse single RSS feed."""
        with httpx.Client(timeout=15.0) as client:
            response = client.get(source["url"])
            response.raise_for_status()

        feed = feedparser.parse(response.text)
        articles = []
        for entry in feed.entries[:15]:  # Max 15 per source
            published = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                published = datetime(*entry.published_parsed[:6])
            elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                published = datetime(*entry.updated_parsed[:6])
            else:
                published = datetime.utcnow()

            articles.append({
                "title": entry.get("title", ""),
                "summary": entry.get("summary", entry.get("description", "")),
                "source": source["name"],
                "source_url": entry.get("link", ""),
                "image_url": None,
                "published_at": published,
                "category": source["category"],
                "language": "ru",
            })
        return articles

    def get_latest_news(
        self,
        db: Session,
        limit: int = 10,
        category: str | None = None,
        source: str | None = None,
    ) -> list[NewsArticle]:
        """Получить последние новости из БД с фильтрацией."""
        query = select(NewsArticle).where(NewsArticle.is_active == True)  # noqa: E712
        if category:
            query = query.where(NewsArticle.category == category)
        if source:
            query = query.where(NewsArticle.source == source)
        query = query.order_by(desc(NewsArticle.published_at)).limit(limit)
        result = db.execute(query)
        return list(result.scalars().all())
