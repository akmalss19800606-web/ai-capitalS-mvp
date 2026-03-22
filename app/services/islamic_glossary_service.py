"""Islamic Glossary Service."""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.schemas.islamic_stage1 import GlossaryTermResponse


def get_all_terms(
    db: Session,
    category: Optional[str] = None,
    search: Optional[str] = None,
) -> List[GlossaryTermResponse]:
    from app.db.models.islamic_stage1 import IslamicGlossaryTerm
    query = db.query(IslamicGlossaryTerm).filter(IslamicGlossaryTerm.is_published == True)

    if category:
        query = query.filter(IslamicGlossaryTerm.category == category)
    if search:
        like = f"%{search}%"
        query = query.filter(
            IslamicGlossaryTerm.term_ru.ilike(like) |
            IslamicGlossaryTerm.transliteration.ilike(like)
        )

    rows = query.order_by(IslamicGlossaryTerm.term_ru).all()
    return [GlossaryTermResponse.model_validate(r) for r in rows]


def get_term_by_slug(db: Session, slug: str) -> Optional[GlossaryTermResponse]:
    from app.db.models.islamic_stage1 import IslamicGlossaryTerm
    row = db.query(IslamicGlossaryTerm).filter(IslamicGlossaryTerm.slug == slug).first()
    if not row:
        return None
    return GlossaryTermResponse.model_validate(row)
