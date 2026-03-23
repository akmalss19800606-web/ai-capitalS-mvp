from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models.islamic_stage2 import IslamicProductCatalog
from app.schemas.islamic_stage2 import (
    IslamicProductListItem, IslamicProductDetail,
    ProductRecommendationRequest, ProductRecommendationResponse
)

RECOMMENDATION_RULES = [
    {"goal": "purchase",    "tenure": "short",  "risk": "low",    "product": "murabaha"},
    {"goal": "purchase",    "tenure": "medium", "risk": "low",    "product": "murabaha"},
    {"goal": "purchase",    "tenure": "long",   "risk": "medium", "product": "ijara_tamlik"},
    {"goal": "investment",  "tenure": "long",   "risk": "high",   "product": "musharaka"},
    {"goal": "investment",  "tenure": "medium", "risk": "medium", "product": "mudaraba"},
    {"goal": "investment",  "tenure": "short",  "risk": "low",    "product": "murabaha"},
    {"goal": "trade",       "tenure": "short",  "risk": "low",    "product": "salam"},
    {"goal": "trade",       "tenure": "medium", "risk": "medium", "product": "istisna"},
    {"goal": "leasing",     "tenure": "any",    "risk": "any",    "product": "ijara"},
    {"goal": "social",      "tenure": "any",    "risk": "any",    "product": "waqf"},
]

RATIONALE_MAP = {
    "murabaha":     "Мурабаха оптимальна для покупки с фиксированной наценкой — минимальный риск, чёткие условия.",
    "ijara_tamlik": "Иджара Мунтахия Биттамлик подходит для долгосрочной аренды с последующим выкупом.",
    "musharaka":    "Мушарака обеспечивает долевое участие в прибыли — подходит для высокорискованных инвестиций.",
    "mudaraba":     "Мудараба разделяет капитал и управление — баланс риска и доходности.",
    "salam":        "Салам используется для краткосрочного торгового финансирования с предоплатой.",
    "istisna":      "Истисна подходит для финансирования производства и строительства под заказ.",
    "ijara":        "Иджара — классическая исламская аренда без права собственности.",
    "waqf":         "Вакф — благотворительный инструмент для социальных и некоммерческих целей.",
    "sukuk":        "Сукук — исламские ценные бумаги, обеспеченные реальными активами.",
    "qard_hasan":   "Кард-Хасан — беспроцентный займ для социальной поддержки.",
}


def get_products(db: Session, category: Optional[str] = None, allowed_for: Optional[str] = None) -> List[IslamicProductListItem]:
    q = db.query(IslamicProductCatalog).filter(IslamicProductCatalog.is_published == True)
    if category:
        q = q.filter(IslamicProductCatalog.category == category)
    if allowed_for:
        q = q.filter(IslamicProductCatalog.allowed_for.in_([allowed_for, "both"]))
    return q.order_by(IslamicProductCatalog.sort_order).all()


def get_product_by_slug(db: Session, slug: str) -> Optional[IslamicProductDetail]:
    return db.query(IslamicProductCatalog).filter(IslamicProductCatalog.slug == slug).first()


def recommend_product(db: Session, request: ProductRecommendationRequest) -> ProductRecommendationResponse:
    slug = None
    for rule in RECOMMENDATION_RULES:
        if rule["goal"] == request.goal:
            if rule["tenure"] in (request.tenure, "any") and rule["risk"] in (request.risk_appetite, "any"):
                slug = rule["product"]
                break
    if not slug:
        slug = "murabaha"

    all_products = get_products(db)
    recommended = next((p for p in all_products if p.slug == slug), None)
    if not recommended and all_products:
        recommended = all_products[0]

    alternatives = [p for p in all_products if p.slug != slug][:3]
    rationale = RATIONALE_MAP.get(slug, "Продукт соответствует вашим параметрам по стандартам AAOIFI.")

    return ProductRecommendationResponse(
        recommended=recommended,
        alternatives=alternatives,
        rationale_ru=rationale,
    )
