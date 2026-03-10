# Этап 3: ИИ-оркестрация — Инструкция по установке

## Что включено

| Файл | Действие | Описание |
|------|----------|----------|
| `backend/app/services/ai_service.py` | ЗАМЕНИТЬ | Мультипровайдерный AI-сервис (Groq + Gemini + Ollama) |
| `backend/app/api/v1/routers/ai_gateway.py` | ЗАМЕНИТЬ | AI Gateway — единый вход с оркестрацией |
| `backend/app/api/v1/routers/ai.py` | ЗАМЕНИТЬ | AI-роутер с мультипровайдером |

## Шаг 1: Получить ключ Google Gemini (бесплатно)

1. Откройте https://aistudio.google.com/apikey
2. Нажмите "Create API key"
3. Скопируйте ключ

## Шаг 2: Обновить .env

Откройте `C:\ai-capitalS-mvp\.env` и добавьте строку:

```
GEMINI_API_KEY=ваш_ключ_сюда
```

## Шаг 3: Добавить google-generativeai в Dockerfile

Откройте `C:\ai-capitalS-mvp\Dockerfile` и найдите строку:

```
    "scipy>=1.12.0" \
    "scikit-learn>=1.4.0"
```

Замените на (добавляем google-generativeai):

```
    "scipy>=1.12.0" \
    "scikit-learn>=1.4.0" \
    "google-generativeai>=0.8.0"
```

## Шаг 4: Копировать файлы

```powershell
Copy-Item -Force fix_stage3\backend\app\services\ai_service.py C:\ai-capitalS-mvp\app\services\ai_service.py
Copy-Item -Force fix_stage3\backend\app\api\v1\routers\ai_gateway.py C:\ai-capitalS-mvp\app\api\v1\routers\ai_gateway.py
Copy-Item -Force fix_stage3\backend\app\api\v1\routers\ai.py C:\ai-capitalS-mvp\app\api\v1\routers\ai.py
```

## Шаг 5: Пересобрать и запустить

```powershell
docker compose build backend
docker compose up -d backend
```

## Шаг 6: Тестирование

### Тест 1 — Статус провайдеров:
```powershell
docker compose exec backend python3 -c "import asyncio; from app.services.ai_service import get_provider_status; print(asyncio.run(get_provider_status()))"
```

### Тест 2 — AI Gateway:
```powershell
docker compose exec backend python3 -c "import httpx; r=httpx.post('http://localhost:8000/api/v1/auth/login',data={'username':'admin@test.com','password':'Admin123456'}); t=r.json()['access_token']; h={'Authorization':f'Bearer {t}'}; r2=httpx.post('http://localhost:8000/api/v1/ai-gateway/ask',json={'question':'Перспективы IT-рынка Узбекистана','task_type':'market_analysis'},headers=h,timeout=30); print(r2.status_code, r2.text[:300])"
```

## Новые AI-эндпоинты

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/v1/ai-gateway/ask` | POST | Универсальный AI-запрос с оркестрацией |
| `/api/v1/ai-gateway/providers` | GET | Статус провайдеров |
| `/api/v1/ai/recommend` | POST | Инвестиционная рекомендация |
| `/api/v1/ai/market-analysis` | POST | Анализ рынка |
| `/api/v1/ai/due-diligence` | POST | Due Diligence компании |
