"""Islamic Reference Registry Service."""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.schemas.islamic_stage1 import ReferenceRegistryItem


def get_standards(
    db: Session,
    registry_type: Optional[str] = None,
) -> List[ReferenceRegistryItem]:
    from app.db.models.islamic_stage1 import IslamicReferenceRegistry
    query = db.query(IslamicReferenceRegistry).filter(IslamicReferenceRegistry.is_active == True)
    if registry_type:
        query = query.filter(IslamicReferenceRegistry.registry_type == registry_type)
    rows = query.order_by(IslamicReferenceRegistry.code).all()
    return [ReferenceRegistryItem.model_validate(r) for r in rows]


def get_standard_by_code(db: Session, code: str) -> Optional[ReferenceRegistryItem]:
    from app.db.models.islamic_stage1 import IslamicReferenceRegistry
    row = db.query(IslamicReferenceRegistry).filter(IslamicReferenceRegistry.code == code).first()
    if not row:
        return None
    return ReferenceRegistryItem.model_validate(row)
