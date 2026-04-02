"""
NewsService — RSS feed aggregator for official financial news sources.
E1-02: Fetch + deduplicate + store news articles from 6 sources.
"""
import logging
from datetime import datetime

import feedparser
import httpx
from sqlalchemy import select, desc, inspect as sa_inspect
from sqlalchemy.orm import Session

from app.db.models.news import NewsArticle

logger = logging.getLogger(__name__)

# Shared HTTP headers — many institutional sites block requests without User-Agent
_HTTP_HEADERS = {
    "User-Agent": "AiCapitalMVP/1.0 (+https://github.com/ai-capital)",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}


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
            "url": "https://www.gazeta.uz/ru/rss/",
            "category": "local",
            "description": "Gazeta.uz экономика",
        },
    ]

    def _ensure_table(self, db: Session) -> None:
        """Create news_articles table if it doesn't exist yet."""
        try:
            bind = db.get_bind()
            inspector = sa_inspect(bind)
            if not inspector.has_table("news_articles"):
                from app.db.models.news import NewsArticle as _Model
                _Model.__table__.create(bind=bind, checkfirst=True)
                logger.info("Created missing news_articles table")
        except Exception as exc:
            logger.error("Failed to ensure news_articles table: %s", exc)

    def fetch_and_store_news(self, db: Session) -> int:
        """Получить новости из всех RSS-источников и сохранить в БД.
        Дедупликация по source_url.
        Возвращает количество добавленных статей."""
        self._ensure_table(db)
        total_added = 0
        for source in self.SOURCES:
            try:
                articles = self._fetch_rss(source)
                for article_data in articles:
                    if not article_data.get("source_url"):
                        continue
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
                logger.info("Fetched %s: %d articles parsed", source["name"], len(articles))
            except Exception as e:
                logger.error("Error fetching %s: %s", source["name"], e)
                db.rollback()
        return total_added

    def _fetch_rss(self, source: dict) -> list[dict]:
        """Fetch and parse single RSS feed. Resilient: returns [] on failure."""
        try:
            with httpx.Client(
                timeout=20.0,
                follow_redirects=True,
                headers=_HTTP_HEADERS,
                verify=False,  # some .uz sites have cert issues
            ) as client:
                response = client.get(source["url"])
                response.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.warning("HTTP %s from %s: %s", e.response.status_code, source["name"], e)
            return []
        except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError) as e:
            logger.warning("Network error fetching %s: %s", source["name"], e)
            return []

        feed = feedparser.parse(response.text)
        if feed.bozo and not feed.entries:
            logger.warning("Malformed feed from %s: %s", source["name"], feed.bozo_exception)
            return []

        articles = []
        for entry in feed.entries[:15]:  # Max 15 per source
            published = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    published = datetime(*entry.published_parsed[:6])
                except Exception:
                    published = datetime.utcnow()
            elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                try:
                    published = datetime(*entry.updated_parsed[:6])
                except Exception:
                    published = datetime.utcnow()
            else:
                published = datetime.utcnow()

            link = entry.get("link", "")
            if not link:
                continue

            articles.append({
                "title": (entry.get("title") or "")[:500],
                "summary": entry.get("summary", entry.get("description", "")),
                "source": source["name"],
                "source_url": link,
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
        self._ensure_table(db)
        query = select(NewsArticle).where(NewsArticle.is_active == True)  # noqa: E712
        if category:
            query = query.where(NewsArticle.category == category)
        if source:
            query = query.where(NewsArticle.source == source)
        query = query.order_by(desc(NewsArticle.published_at)).limit(limit)
        result = db.execute(query)
        return list(result.scalars().all())
