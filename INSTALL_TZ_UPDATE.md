# Инструкция по установке — Полное соответствие ТЗ v3.0

## Файлы для замены

| # | Файл | Куда положить | Действие |
|---|------|---------------|----------|
| 1 | `market_analysis_page.tsx` | `frontend/app/market-analysis/page.tsx` | **ЗАМЕНИТЬ** |
| 2 | `calculator_page.tsx` | `frontend/app/calculator/page.tsx` | **ЗАМЕНИТЬ** |
| 3 | `market_analysis_export.py` | `app/api/v1/routers/market_analysis_export.py` | **ДОБАВИТЬ** |
| 4 | `calculator_export.py` | `app/api/v1/routers/calculator_export.py` | **ДОБАВИТЬ** |
| 5 | `calculator_history.py` | `app/db/models/calculator_history.py` | **ДОБАВИТЬ** |
| 6 | `next.config.ts` | `frontend/next.config.ts` | **ЗАМЕНИТЬ** |
| 7 | `docker-compose.yml` | `docker-compose.yml` (корень) | **ЗАМЕНИТЬ** |
| 8 | `calc_history_migration.py` | `alembic/versions/calc_history_001.py` | **ДОБАВИТЬ** |

## Шаг 1: Копировать файлы

```powershell
# Frontend
Copy-Item -Force output\market_analysis_page.tsx C:\ai-capitalS-mvp\frontend\app\market-analysis\page.tsx
Copy-Item -Force output\calculator_page.tsx C:\ai-capitalS-mvp\frontend\app\calculator\page.tsx
Copy-Item -Force output\next.config.ts C:\ai-capitalS-mvp\frontend\next.config.ts

# Backend routers
Copy-Item -Force output\market_analysis_export.py C:\ai-capitalS-mvp\app\api\v1\routers\market_analysis_export.py
Copy-Item -Force output\calculator_export.py C:\ai-capitalS-mvp\app\api\v1\routers\calculator_export.py

# Backend model
Copy-Item -Force output\calculator_history.py C:\ai-capitalS-mvp\app\db\models\calculator_history.py

# Docker
Copy-Item -Force output\docker-compose.yml C:\ai-capitalS-mvp\docker-compose.yml

# Migration
Copy-Item -Force output\calc_history_migration.py C:\ai-capitalS-mvp\alembic\versions\calc_history_001.py
```

## Шаг 2: Зарегистрировать новые роутеры в main.py

Откройте `app/main.py` и добавьте импорты новых роутеров:

```python
from app.api.v1.routers.market_analysis_export import router as market_export_router
from app.api.v1.routers.calculator_export import router as calc_export_router

# В секцию app.include_router(...):
app.include_router(market_export_router, prefix="/api/v1")
app.include_router(calc_export_router, prefix="/api/v1")
```

## Шаг 3: Применить миграцию

```powershell
cd C:\ai-capitalS-mvp
docker compose exec backend alembic upgrade head
```

## Шаг 4: Пересобрать и запустить

```powershell
docker compose down
docker compose up --build -d
```

## Шаг 5: Проверить

- Frontend market analysis: http://localhost:3000/uz-market
- Frontend calculator: http://localhost:3000/calculator
- API docs: http://localhost:8000/docs

### Новые API endpoints:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/v1/uz-market/reports/{id}/pdf` | GET | Экспорт market report в PDF |
| `/api/v1/uz-market/reports/{id}/docx` | GET | Экспорт market report в DOCX |
| `/api/v1/uz-market/reports/{id}/xlsx` | GET | Экспорт market report в XLSX |
| `/api/v1/uz-market/reports/{id}/md` | GET | Экспорт market report в Markdown |
| `/api/v1/calculator/history` | GET | История расчётов калькулятора |
| `/api/v1/calculator/history/{id}` | GET | Конкретный расчёт |
| `/api/v1/calculator/history/{id}` | DELETE | Удалить расчёт |
| `/api/v1/calculator/history/{id}/pdf` | GET | Экспорт расчёта в PDF |
| `/api/v1/calculator/history/{id}/xlsx` | GET | Экспорт расчёта в XLSX |

## Что реализовано этим обновлением

### Market Analysis (ТЗ Раздел A):
- ✅ 7-step wizard UI с progress bar и tooltips
- ✅ Все 25 полей из ТЗ (OKED, инвестиции, финансы, регион, рынок, юр.форма, риск)
- ✅ Macro header (ЦБ ставка, CPI, USD/UZS, ВВП рост, TSMI)
- ✅ AI-провайдер (Groq/Perplexity)
- ✅ Progress bar генерации AI-отчёта
- ✅ 12-секционный отчёт с recommendation badge и confidence score
- ✅ Executive Summary, SEZ Benefits, Macro Context
- ✅ Экспорт: PDF, DOCX, XLSX, Markdown
- ✅ AI Disclaimer

### Investment Calculator Pro (ТЗ Раздел B):
- ✅ 5 вкладок: DCF & ROI, Сравнение, Чувствительность, Монте-Карло, Бенчмарки
- ✅ DCF с NPV/IRR/XIRR/MIRR/ROI/Payback/PI
- ✅ WACC CAPM wizard (Rf, β, ERP, CRP, SCP, Rd, Tax)
- ✅ Monte Carlo: histogram, CDF, P10/P50/P90, VaR, CVaR
- ✅ Sensitivity: Tornado chart + Spider/Radar chart + Two-way data table
- ✅ Сравнение 3 сценариев (базовый/оптимист/пессимист)
- ✅ Бенчмарки Узбекистан 2026
- ✅ NPV Waterfall chart, Cash Flow chart
- ✅ Calculator history API (GET/DELETE) + PDF/XLSX export

### Инфраструктура:
- ✅ docker-compose.yml без deprecated `version`
- ✅ next.config.ts без deprecated `eslint` block
- ✅ Alembic migration для calculator_history
