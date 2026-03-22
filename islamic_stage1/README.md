# Этап 1 — Backend: Исламские финансы

## Файлы

| Файл | Назначение |
|------|-----------|
| `app/db/models/islamic_stage1.py` | SQLAlchemy модели (6 таблиц) |
| `app/schemas/islamic_stage1.py` | Pydantic схемы |
| `app/services/nisab_service.py` | Нисаб по цене золота |
| `app/services/zakat_service.py` | Расчёт закята 2.5% |
| `app/services/shariah_screening_service.py` | Скрининг AAOIFI SS No. 62 |
| `app/services/islamic_profile_service.py` | Профиль пользователя |
| `app/services/islamic_glossary_service.py` | Глоссарий терминов |
| `app/services/islamic_reference_service.py` | Реестр стандартов |
| `app/api/v1/routers/zakat_router.py` | GET /nisab, POST /calculate, GET /history |
| `app/api/v1/routers/shariah_screening_router.py` | GET /companies, POST /screen, GET /results |
| `app/api/v1/routers/glossary_router.py` | GET /glossary, GET /glossary/{slug} |
| `app/api/v1/routers/islamic_profile_router.py` | GET/PUT /profile |
| `app/api/v1/routers/islamic_reference_router.py` | GET /standards, GET /standards/{code} |
| `app/db/seeds/seed_islamic_stage1.py` | 30 терминов + 15 стандартов |
| `main_py_fragment.py` | Фрагмент для вставки в app/main.py |

## Команды

```bash
# 1. Скопировать файлы в контейнер (уже монтированы через volume)

# 2. Запустить seed
docker compose exec -e PYTHONPATH=/usr/local/lib/python3.11/site-packages backend \
  python -m app.db.seeds.seed_islamic_stage1

# 3. Проверить API
open http://localhost:8000/docs
```

## API Endpoints

```
GET  /api/v1/islamic/zakat/nisab
POST /api/v1/islamic/zakat/calculate
GET  /api/v1/islamic/zakat/history

GET  /api/v1/islamic/screening/companies?search=&market_type=
POST /api/v1/islamic/screening/screen
GET  /api/v1/islamic/screening/results

GET  /api/v1/islamic/glossary?category=&search=
GET  /api/v1/islamic/glossary/{slug}

GET  /api/v1/islamic/profile
PUT  /api/v1/islamic/profile

GET  /api/v1/islamic/references/standards?org=
GET  /api/v1/islamic/references/standards/{code}
```
