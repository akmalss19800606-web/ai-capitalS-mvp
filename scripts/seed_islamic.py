"""
Seed-скрипт для загрузки начальных данных исламских финансов.
Запуск из корня проекта:
  python scripts/seed_islamic.py

Переменная окружения (или .env):
  DATABASE_URL=postgresql://ai_user:ai_password@db:5432/ai_capital

Через Docker Compose:
  docker compose exec backend python scripts/seed_islamic.py
"""
import json
import os
import sys
import uuid
from pathlib import Path
from datetime import datetime, timezone

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# ---------------------------------------------------------------------------
# Конфигурация
# ---------------------------------------------------------------------------
SEEDS_DIR = Path(__file__).parent.parent / "seeds"

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ai_user:ai_password@localhost:5432/ai_capital"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


# ---------------------------------------------------------------------------
# Вспомогательные функции
# ---------------------------------------------------------------------------
def load_json(filename: str) -> list:
    path = SEEDS_DIR / filename
    if not path.exists():
        print(f"  [WARN] Файл не найден: {path}")
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# 1. Глоссарий
# ---------------------------------------------------------------------------
def seed_glossary_terms(session) -> int:
    terms = load_json("islamic_glossary_terms.json")
    count = 0
    for t in terms:
        existing = session.execute(
            text("SELECT id FROM islamic_glossary_term WHERE slug = :slug"),
            {"slug": t["slug"]}
        ).fetchone()
        if existing:
            print(f"  [SKIP] Термин уже существует: {t['slug']}")
            continue
        session.execute(
            text("""
                INSERT INTO islamic_glossary_term
                    (id, slug, term_ru, term_ar, transliteration,
                     definition_ru, category, standard_ref, standard_org,
                     is_published, created_at)
                VALUES
                    (:id, :slug, :term_ru, :term_ar, :transliteration,
                     :definition_ru, :category, :standard_ref, :standard_org,
                     :is_published, :created_at)
            """),
            {
                "id": str(uuid.uuid4()),
                "slug": t["slug"],
                "term_ru": t["term_ru"],
                "term_ar": t.get("term_ar"),
                "transliteration": t.get("transliteration"),
                "definition_ru": t["definition_ru"],
                "category": t["category"],
                "standard_ref": t.get("standard_ref"),
                "standard_org": t.get("standard_org"),
                "is_published": t.get("is_published", True),
                "created_at": datetime.now(timezone.utc),
            }
        )
        count += 1
        print(f"  [OK] {t['slug']}")
    return count


# ---------------------------------------------------------------------------
# 2. Реестр стандартов AAOIFI / IFSB
# ---------------------------------------------------------------------------
def seed_reference_registry(session) -> int:
    refs = load_json("islamic_reference_registry.json")
    count = 0
    for r in refs:
        existing = session.execute(
            text("""
                SELECT id FROM islamic_reference_registry
                WHERE registry_type = :rt AND code = :code
            """),
            {"rt": r["registry_type"], "code": r["code"]}
        ).fetchone()
        if existing:
            print(f"  [SKIP] Стандарт уже существует: {r['code']}")
            continue
        session.execute(
            text("""
                INSERT INTO islamic_reference_registry
                    (id, registry_type, code, name_ru, name_en,
                     description_ru, topic, document_ref, is_active)
                VALUES
                    (:id, :registry_type, :code, :name_ru, :name_en,
                     :description_ru, :topic, :document_ref, :is_active)
            """),
            {
                "id": str(uuid.uuid4()),
                "registry_type": r["registry_type"],
                "code": r["code"],
                "name_ru": r["name_ru"],
                "name_en": r.get("name_en"),
                "description_ru": r.get("description_ru"),
                "topic": r.get("topic"),
                "document_ref": r.get("document_ref"),
                "is_active": r.get("is_active", True),
            }
        )
        count += 1
        print(f"  [OK] {r['code']}")
    return count


# ---------------------------------------------------------------------------
# 3. Компании UzSE
# ---------------------------------------------------------------------------
def seed_companies(session) -> int:
    companies = load_json("shariah_screening_companies.json")
    count = 0
    for c in companies:
        ticker = c.get("ticker")
        reg_no = c.get("registration_no")
        existing = session.execute(
            text("""
                SELECT id FROM shariah_screening_company
                WHERE ticker = :ticker OR registration_no = :reg_no
            """),
            {"ticker": ticker, "reg_no": reg_no}
        ).fetchone()
        if existing:
            print(f"  [SKIP] Компания уже существует: {c['name_ru']}")
            continue
        session.execute(
            text("""
                INSERT INTO shariah_screening_company
                    (id, name_ru, name_en, ticker, isin, registration_no,
                     market_type, sector, subsector, country,
                     source_url, is_active, created_at)
                VALUES
                    (:id, :name_ru, :name_en, :ticker, :isin, :registration_no,
                     :market_type, :sector, :subsector, :country,
                     :source_url, :is_active, :created_at)
            """),
            {
                "id": str(uuid.uuid4()),
                "name_ru": c["name_ru"],
                "name_en": c.get("name_en"),
                "ticker": ticker,
                "isin": c.get("isin"),
                "registration_no": reg_no,
                "market_type": c.get("market_type", "uzse"),
                "sector": c.get("sector"),
                "subsector": c.get("subsector"),
                "country": c.get("country", "UZ"),
                "source_url": c.get("source_url"),
                "is_active": c.get("is_active", True),
                "created_at": datetime.now(timezone.utc),
            }
        )
        count += 1
        print(f"  [OK] {c['name_ru']}")
    return count


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("🕌  Seed: Исламские финансы — загрузка начальных данных")
    print("=" * 60)
    print(f"DB : {DATABASE_URL[:50]}...")

    session = SessionLocal()
    try:
        print("\n📚 1/3  Глоссарий терминов...")
        n1 = seed_glossary_terms(session)

        print(f"\n📋 2/3  Реестр стандартов AAOIFI / IFSB...")
        n2 = seed_reference_registry(session)

        print(f"\n🏢 3/3  Компании UzSE для скрининга...")
        n3 = seed_companies(session)

        session.commit()
        print("\n" + "=" * 60)
        print(f"✅  Загрузка завершена:")
        print(f"   Терминов глоссария      : {n1}")
        print(f"   Стандартов AAOIFI/IFSB  : {n2}")
        print(f"   Компаний UzSE           : {n3}")
        print("=" * 60)

    except Exception as e:
        session.rollback()
        print(f"\n❌  Ошибка: {e}")
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    main()
