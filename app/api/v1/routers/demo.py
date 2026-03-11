"""
Роутер демо-данных — DEMO-001, Фаза 5.

Эндпоинт:
  POST /demo/seed — загрузка демо-данных для презентации
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/demo", tags=["Demo"])


@router.post(
    "/seed",
    summary="Загрузить демо-данные",
    description=(
        "Загружает реалистичные демо-данные для презентации инвесторам: "
        "5 портфелей, 12 инвестиционных решений с данными узбекских компаний. "
        "Идемпотентно — безопасно запускать повторно."
    ),
)
def seed_demo(db: Session = Depends(get_db)):
    """Загрузить демо-данные: портфели, решения, компании."""
    from app.scripts.seed_demo_data import seed_demo_data

    try:
        # Ensure all tables exist before seeding
        from app.db.base import Base  # noqa
        from app.db.session import engine
        Base.metadata.create_all(bind=engine, checkfirst=True)
    except Exception as e:
        logger.warning("Could not verify tables before seed: %s", e)

    try:
        result = seed_demo_data(db)
        logger.info("Демо-данные загружены: %s", result["message"])
        return result
    except Exception as e:
        logger.error("Seed failed: %s", e, exc_info=True)
        db.rollback()
        return {"status": "error", "message": f"Ошибка загрузки демо-данных: {str(e)}"}
