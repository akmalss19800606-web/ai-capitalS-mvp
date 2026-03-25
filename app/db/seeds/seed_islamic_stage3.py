"""Seed data for Islamic Finance Stage 3: Sukuk, Takaful, Waqf."""
from datetime import date, datetime
from sqlalchemy.orm import Session
from app.db.models.islamic_stage3 import SukukIssuance, TakafulPlan, WaqfProject

SUKUK_DATA = [
    {
        "name": "Sukuk Ijarah UZ-2025",
        "name_ar": "صكوك الإجارة",
        "sukuk_type": "ijara",
        "issuer": "Ministry of Finance UZ",
        "nominal_value": 1000000,
        "currency": "UZS",
        "expected_return_pct": 12.5,
        "maturity_date": date(2028, 1, 1),
        "rating": "BB+",
        "shariah_status": "compliant",
        "status": "active",
    },
    {
        "name": "Sukuk Mudarabah Bank Asia",
        "name_ar": "صكوك المضاربة",
        "sukuk_type": "mudaraba",
        "issuer": "Asia Bank UZ",
        "nominal_value": 500000,
        "currency": "UZS",
        "expected_return_pct": 14.0,
        "maturity_date": date(2027, 6, 1),
        "rating": "B+",
        "shariah_status": "compliant",
        "status": "active",
    },
]

TAKAFUL_DATA = [
    {
        "name": "Takaful Oila",
        "takaful_type": "family",
        "provider": "TakafulUZ",
        "coverage_amount": 50000000,
        "monthly_contribution": 200000,
        "currency": "UZS",
        "description": "Oilaviy takaful sug'urta rejasi",
        "shariah_status": "compliant",
        "status": "active",
    },
    {
        "name": "Takaful Salomatlik",
        "takaful_type": "health",
        "provider": "IslamInsure",
        "coverage_amount": 30000000,
        "monthly_contribution": 150000,
        "currency": "UZS",
        "description": "Tibbiy takaful rejasi",
        "shariah_status": "compliant",
        "status": "active",
    },
    {
        "name": "Takaful Mulk",
        "takaful_type": "property",
        "provider": "TakafulBank",
        "coverage_amount": 100000000,
        "monthly_contribution": 300000,
        "currency": "UZS",
        "description": "Ko'chmas mulk takaful rejasi",
        "shariah_status": "compliant",
        "status": "active",
    },
]

WAQF_DATA = [
    {
        "title": "Waqf Ta'lim Markazi",
        "waqf_type": "educational",
        "description": "Islom maktabi qurilishi uchun vaqf",
        "target_amount": 500000000,
        "raised_amount": 320000000,
        "currency": "UZS",
        "beneficiaries": "1200 o'quvchi",
        "status": "active",
    },
    {
        "title": "Vaqf Masjid Restavratsiya",
        "waqf_type": "property",
        "description": "Tarixiy masjid restavratsiyasi",
        "target_amount": 800000000,
        "raised_amount": 800000000,
        "currency": "UZS",
        "beneficiaries": "5000 jamaatchi",
        "status": "completed",
    },
    {
        "title": "Waqf Sog'liqni Saqlash",
        "waqf_type": "health",
        "description": "Bepul klinika uchun vaqf",
        "target_amount": 1200000000,
        "raised_amount": 450000000,
        "currency": "UZS",
        "beneficiaries": "3000 bemor",
        "status": "active",
    },
]

def seed_stage3(db: Session) -> None:
    """Seed Sukuk, Takaful and Waqf demo data."""
    if db.query(SukukIssuance).count() == 0:
        for item in SUKUK_DATA:
            db.add(SukukIssuance(**item))
        db.commit()

    if db.query(TakafulPlan).count() == 0:
        for item in TAKAFUL_DATA:
            db.add(TakafulPlan(**item))
        db.commit()

    if db.query(WaqfProject).count() == 0:
        for item in WAQF_DATA:
            db.add(WaqfProject(**item))
        db.commit()
