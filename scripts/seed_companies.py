import json, uuid, os
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/ai_capital")
engine = create_engine(DATABASE_URL)
session = sessionmaker(bind=engine)()

with open("/app/seeds/shariah_screening_companies.json", encoding="utf-8") as f:
    companies = json.load(f)

count = 0
for c in companies:
    existing = session.execute(
        text("SELECT id FROM shariah_screening_company WHERE ticker = :t OR registration_no = :r"),
        {"t": c.get("ticker"), "r": c.get("registration_no")}
    ).fetchone()
    if existing:
        print("[SKIP] " + c["name_ru"])
        continue
    session.execute(
        text("INSERT INTO shariah_screening_company (id, name_ru, name_en, ticker, isin, registration_no, market_type, sector, country, source_url, is_active, created_at) VALUES (:id, :name_ru, :name_en, :ticker, :isin, :reg_no, :market_type, :sector, :country, :source_url, :is_active, :created_at)"),
        {
            "id": str(uuid.uuid4()),
            "name_ru": c["name_ru"],
            "name_en": c.get("name_en"),
            "ticker": c.get("ticker"),
            "isin": c.get("isin"),
            "reg_no": c.get("registration_no"),
            "market_type": c.get("market_type", "uzse"),
            "sector": c.get("sector"),
            "country": c.get("country", "UZ"),
            "source_url": c.get("source_url"),
            "is_active": c.get("is_active", True),
            "created_at": datetime.now(timezone.utc)
        }
    )
    count += 1
    print("[OK] " + c["name_ru"])

session.commit()
session.close()
print("Загружено компаний: " + str(count))