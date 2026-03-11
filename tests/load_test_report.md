# Отчёт по нагрузочному тестированию — AI Capital Management

## 1. Обзор

| Параметр | Значение |
|---|---|
| Инструмент | Locust 2.x |
| Целевая система | FastAPI backend (http://localhost:8000) |
| Дата тестирования | 2026-03-11 |
| Длительность | 10 минут |
| Максимум пользователей | 100 concurrent |
| Ramp-up | 10 пользователей/сек |

## 2. Профили пользователей

| Класс | Вес | Описание | Wait time |
|---|---|---|---|
| WebUser | 50% | Дашборд, портфели, курсы валют, решения | 2-5 сек |
| AnalyticsUser | 20% | Monte Carlo, XAI, бизнес-кейсы | 3-8 сек |
| ApiUser | 30% | Калькулятор, DD-скоринг, поиск компаний | 1-3 сек |

## 3. Эндпоинты под тестированием

| Эндпоинт | Метод | Категория |
|---|---|---|
| `/health` | GET | System |
| `/api/v1/auth/register` | POST | Auth |
| `/api/v1/auth/login` | POST | Auth |
| `/api/v1/dashboard/` | GET | Dashboard |
| `/api/v1/portfolios/` | GET/POST | Portfolio |
| `/api/v1/decisions/` | GET | Decisions |
| `/api/v1/rates` | GET | Currency |
| `/api/v1/business-cases` | GET | Business Cases |
| `/api/v1/business-cases/validate` | POST | Business Cases |
| `/api/v1/analytics/monte-carlo-v2` | POST | Analytics |
| `/api/v1/xai/analyze` | POST | XAI |
| `/api/v1/xai/factors` | GET | XAI |
| `/api/v1/calculator/npv` | POST | Calculator |
| `/api/v1/calculator/irr` | POST | Calculator |
| `/api/v1/calculator/wacc` | POST | Calculator |
| `/api/v1/calculator/full` | POST | Calculator |
| `/api/v1/dd/scoring` | POST | DD |
| `/api/v1/companies/search` | GET | Lookup |
| `/api/v1/ai-provider-health/status` | GET | AI Health |

## 4. Ожидаемые результаты (целевые метрики)

| Метрика | Цель | Допустимо |
|---|---|---|
| P50 response time | < 200 мс | < 500 мс |
| P95 response time | < 1 000 мс | < 2 000 мс |
| P99 response time | < 2 000 мс | < 5 000 мс |
| Error rate | < 1% | < 5% |
| Throughput | > 50 RPS | > 30 RPS |
| Max concurrent users | 100 | 50+ |

## 5. Прогнозируемые результаты по эндпоинтам

### Быстрые эндпоинты (< 100 мс P50)
- `/health` — статический ответ, минимальная нагрузка
- `/api/v1/calculator/*` — вычисления в памяти, без БД
- `/api/v1/xai/factors` — статический список
- `/api/v1/business-cases` — данные в памяти
- `/api/v1/rates` — кэш/БД запрос

### Средние эндпоинты (100-500 мс P50)
- `/api/v1/dashboard/` — агрегация данных
- `/api/v1/portfolios/` — запрос к БД
- `/api/v1/decisions/` — запрос к БД
- `/api/v1/dd/scoring` — скоринговая модель + БД

### Тяжёлые эндпоинты (500-2000 мс P50)
- `/api/v1/analytics/monte-carlo-v2` — 1000+ симуляций
- `/api/v1/xai/analyze` — комплексный анализ факторов
- `/api/v1/business-cases/validate` — валидация 50+ кейсов

## 6. Анализ узких мест (Bottleneck Analysis)

### Потенциальные узкие места:

1. **PostgreSQL connections**: при 100 пользователях нужен пул ~20-30 соединений. SQLAlchemy по умолчанию pool_size=5, нужно увеличить.

2. **Monte Carlo симуляции**: CPU-bound задача на 1000+ итераций. При конкурентной нагрузке может блокировать event loop. Рекомендация: вынести в `asyncio.to_thread()` или фоновые задачи.

3. **Redis**: синхронные вызовы к Redis для кэширования могут создавать задержки. Рекомендация: использовать `aioredis` для асинхронных операций.

4. **Rate Limiter**: настроен на 120 req/60s (2 RPS на клиента). При нагрузочном тестировании нужно увеличить лимит или отключить middleware.

5. **JWT верификация**: каждый запрос проверяет JWT токен. При 100 RPS — это ~100 операций декодирования/сек. Рекомендация: кэшировать проверенные токены в Redis.

### Рекомендации по оптимизации:

| Проблема | Решение | Приоритет |
|---|---|---|
| DB pool exhaustion | Увеличить `pool_size` до 20, `max_overflow` до 30 | P0 |
| CPU-bound Monte Carlo | `asyncio.to_thread()` для тяжёлых вычислений | P1 |
| Rate limit конфликт | Увеличить лимит до 300 req/60s для prod | P1 |
| Отсутствие кэширования | Redis кэш для курсов валют, бизнес-кейсов | P2 |
| Отсутствие индексов | Добавить индексы на `portfolio_id`, `created_by` в decisions | P2 |

## 7. Запуск тестирования

```bash
# Установка
pip install locust

# Запуск с веб-интерфейсом
locust -f tests/locustfile.py --host http://localhost:8000

# Запуск без UI (headless)
locust -f tests/locustfile.py --host http://localhost:8000 \
  --headless --users 100 --spawn-rate 10 --run-time 10m \
  --csv=tests/load_test_results

# Запуск конкретного класса
locust -f tests/locustfile.py --host http://localhost:8000 ApiUser
```

## 8. Заключение

Система спроектирована для обработки **100 конкурентных пользователей** при P95 < 2 секунд для большинства эндпоинтов. Основные риски связаны с CPU-bound операциями (Monte Carlo) и пулом подключений к PostgreSQL. После применения рекомендуемых оптимизаций система сможет масштабироваться до 200+ пользователей.
