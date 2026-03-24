# Islamic Finance Reference Data Module

## Overview

This module provides reference data APIs for Islamic financial products, PoSC (Principles of Shariah Compliance) rules, and product recommendation rules.

## Architecture

```
seeds/                          # JSON seed data
  islamic_products.json          # 10 Islamic financial products
  posc_rules.json                # 12 PoSC compliance rules
  product_recommendation_rules.json  # 13 recommendation rules
  seed_all.py                    # Seed loader script

app/db/models/
  islamic_products.py            # IslamicProduct model
  posc_rules.py                  # PoSCRule model
  recommendation_rules.py        # ProductRecommendationRule model

app/schemas/
  islamic_products.py            # Pydantic schemas (Create/Out)

app/services/
  islamic_products_service.py    # CRUD service layer

app/api/v1/routers/
  islamic_products_ref_router.py # FastAPI endpoints
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/islamic/products | List all products (filter: ?category=) |
| GET | /api/v1/islamic/products/{product_id} | Get product by ID |
| GET | /api/v1/islamic/posc-rules | List PoSC rules (filter: ?category=, ?severity=) |
| GET | /api/v1/islamic/posc-rules/{rule_id} | Get rule by ID |
| GET | /api/v1/islamic/recommendations | List rules (filter: ?profile=, ?risk=) |

## Seeding Data

```bash
python -m seeds.seed_all
```

## Running Tests

```bash
pytest tests/test_islamic_ref_api.py -v
```

## Post-Setup Steps

1. Run `alembic revision --autogenerate -m "add islamic ref tables"`
2. Run `alembic upgrade head`
3. Run `python -m seeds.seed_all`
4. Verify at http://localhost:8000/docs (Islamic: Reference Data tag)
