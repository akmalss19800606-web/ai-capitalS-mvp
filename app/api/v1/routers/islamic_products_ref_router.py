from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.schemas.islamic_stage2 import (
    IslamicProductListItem,
    IslamicProductDetail,
    ProductRecommendationRequest,
    ProductRecommendationResponse
)
from app.services import islamic_product_service

router = APIRouter(prefix="/islamic/products", tags=["islamic-products"])


@router.get("", response_model=List[IslamicProductListItem])
def list_products(
    category: Optional[str] = Query(None),
    allowed_for: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return islamic_product_service.get_products(db, category=category, allowed_for=allowed_for)


@router.get("/{slug}", response_model=IslamicProductDetail)
def get_product(slug: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    product = islamic_product_service.get_product_by_slug(db, slug)
    if not product:
        raise HTTPException(status_code=404, detail="Продукт не найден")
    return product


@router.post("/recommend", response_model=ProductRecommendationResponse)
def recommend_product(
    request: ProductRecommendationRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return islamic_product_service.recommend_product(db, request)
