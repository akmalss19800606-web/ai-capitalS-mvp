"""Сервис сбора экономических новостей из RSS-источников Узбекистана."""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional
from xml.etree import ElementTree

import httpx
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.models.economic_news import EconomicNews

logger = logging.getLogger(__name__)

RSS_SOURCES = [
    {
        "name": "gazeta.uz",
        "url": "https://www.gazeta.uz/ru/rss/economy",
        "category": "market",
    },
    {
        "name": "cbu.uz",
        "url": "https://cbu.uz/ru/press-tsentr/novosti/rss/",
        "category": "official",
    },
]


def fetch_rss(url: str, timeout: float = 10.0) -> Optional[str]:
    """Загрузить RSS-ленту по URL."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
        }
        with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
            resp = client.get(url)
            resp.raise_for_status()
            return resp.text
    except Exception as e:
        logger.warning(f"RSS fetch failed for {url}: {e}")
        return None


def parse_rss(xml_text: str, source: str, category: str) -> List[Dict]:
    """Распарсить RSS XML в список dict."""
    items = []
    try:
        root = ElementTree.fromstring(xml_text)
        for item in root.iter("item"):
            title_el = item.find("title")
            link_el = item.find("link")
            desc_el = item.find("description")
            pub_el = item.find("pubDate")

            if title_el is None or link_el is None:
                continue

            pub_date = None
            if pub_el is not None and pub_el.text:
                try:
                    from email.utils import parsedate_to_datetime
                    pub_date = parsedate_to_datetime(pub_el.text)
                except Exception:
                    pub_date = datetime.now(timezone.utc)
            else:
                pub_date = datetime.now(timezone.utc)

            items.append({
                "title": (title_el.text or "").strip()[:500],
                "summary": (desc_el.text or "").strip()[:1000] if desc_el is not None else "",
                "url": (link_el.text or "").strip(),
                "source": source,
                "category": category,
                "published_at": pub_date,
            })
    except Exception as e:
        logger.error(f"RSS parse error for {source}: {e}")
    return items


def refresh_news(db: Session) -> int:
    """Обновить новости из всех RSS-источников. Возвращает число новых записей."""
    all_items: List[Dict] = []

    for src in RSS_SOURCES:
        result = fetch_rss(src["url"])
        if result:
            parsed = parse_rss(result, src["name"], src["category"])
            all_items.extend(parsed)

    if not all_items:
        logger.info("No RSS items fetched")
        return 0

    inserted = 0
    for item in all_items:
        stmt = pg_insert(EconomicNews).values(**item).on_conflict_do_nothing(
            index_elements=["url"]
        )
        result = db.execute(stmt)
        inserted += result.rowcount

    db.commit()
    logger.info(f"News refresh: {inserted} new items from {len(all_items)} total")
    return inserted


def get_latest_news(
    db: Session,
    limit: int = 10,
    category: Optional[str] = None,
) -> List[EconomicNews]:
    """Получить последние новости из БД."""
    q = select(EconomicNews).order_by(desc(EconomicNews.published_at)).limit(limit)
    if category and category != "all":
        q = q.where(EconomicNews.category == category)
    result = db.execute(q)
    return list(result.scalars().all())