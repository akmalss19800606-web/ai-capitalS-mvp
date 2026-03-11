# AI Capital Management — Справочник API

## Обзор

AI Capital Management API предоставляет RESTful интерфейс для управления инвестиционными портфелями, AI-аналитики, Due Diligence скоринга, финансовых расчётов и исламских финансов.

**Base URL**: `http://localhost:8000/api/v1`

**Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)

**ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Аутентификация

API использует JWT (JSON Web Token) Bearer authentication.

### Получение токена

```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=YourPassword123!
```

**Ответ:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### Использование токена

Включите токен в заголовок `Authorization` каждого запроса:

```http
GET /api/v1/portfolios/
Authorization: Bearer eyJ...
```

### Обновление токена

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{"refresh_token": "eyJ..."}
```

---

## Rate Limiting

- **Лимит**: 120 запросов / 60 секунд на IP
- При превышении возвращается `429 Too Many Requests`
- Заголовки ответа: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Группы API

### 1. Аутентификация (`/auth`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| POST | `/auth/register` | Регистрация нового пользователя |
| POST | `/auth/login` | Вход (OAuth2 form) |
| POST | `/auth/refresh` | Обновление JWT-токена |
| GET | `/auth/me` | Данные текущего пользователя |
| POST | `/auth/mfa/setup` | Настройка MFA (TOTP) |
| POST | `/auth/mfa/verify` | Верификация MFA-кода |
| GET | `/auth/sessions` | Активные сессии |

**Пример регистрации:**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "investor@example.com",
  "password": "SecurePass123!",
  "full_name": "Инвестор Ташкент"
}
```

### 2. Портфели (`/portfolios`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| GET | `/portfolios/` | Список портфелей пользователя |
| POST | `/portfolios/` | Создать портфель |
| GET | `/portfolios/{id}` | Детали портфеля |
| PUT | `/portfolios/{id}` | Обновить портфель |
| DELETE | `/portfolios/{id}` | Удалить портфель |

**Пример создания:**
```json
{
  "name": "Агротех Узбекистан",
  "description": "Портфель агротехнологических компаний",
  "total_value": 5000000000
}
```

### 3. Инвестиционные решения (`/decisions`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| GET | `/decisions/` | Список решений (фильтры: status, type, priority, portfolio_id) |
| POST | `/decisions/` | Создать решение |
| GET | `/decisions/{id}` | Детали решения |
| PUT | `/decisions/{id}` | Обновить решение |
| DELETE | `/decisions/{id}` | Удалить решение |

**Статусы**: `draft`, `review`, `approved`, `in_progress`, `completed`, `rejected`

**Типы**: `BUY`, `SELL`, `HOLD`

**Приоритеты**: `low`, `medium`, `high`, `critical`

### 4. Калькулятор (`/calculator`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| POST | `/calculator/dcf` | DCF (Discounted Cash Flow) |
| POST | `/calculator/npv` | NPV (Net Present Value) |
| POST | `/calculator/irr` | IRR (Internal Rate of Return) |
| POST | `/calculator/payback` | Payback Period |
| POST | `/calculator/wacc` | WACC (Weighted Average Cost of Capital) |
| POST | `/calculator/full` | Полный финансовый анализ |

**Пример NPV:**
```json
{
  "cash_flows": [-1000000, 300000, 350000, 400000, 450000],
  "discount_rate": 0.12
}
```

**Пример WACC:**
```json
{
  "equity": 5000000,
  "debt": 3000000,
  "cost_equity": 0.14,
  "cost_debt": 0.09,
  "tax_rate": 0.15
}
```

### 5. Due Diligence (`/dd`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| POST | `/dd/scoring` | Запуск DD-скоринга |
| GET | `/dd/scoring` | История скорингов |
| GET | `/dd/scoring/{id}` | Результат по ID |
| PATCH | `/dd/scoring/{id}/checklist` | Обновить пункт чеклиста |
| GET | `/dd/benchmarks/templates` | Шаблоны бенчмарков |

**Пример запуска:**
```json
{
  "company_name": "UzAuto Motors",
  "industry": "automotive",
  "geography": "UZ",
  "revenue": 15000000,
  "employees": 5000
}
```

### 6. Бизнес-кейсы (`/business-cases`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| GET | `/business-cases` | Все 50+ бизнес-кейсов |
| GET | `/business-cases/categories` | Категории кейсов |
| GET | `/business-cases/{case_id}` | Один кейс |
| POST | `/business-cases/validate` | Валидация всех кейсов |

### 7. Monte Carlo v2 (`/analytics`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| POST | `/analytics/monte-carlo-v2` | Симуляция по сектору |
| POST | `/analytics/monte-carlo` | Симуляция по решению |
| POST | `/analytics/shap` | SHAP-анализ |
| POST | `/analytics/frontier` | Efficient Frontier |

**Секторы**: `agriculture`, `food_processing`, `trade`, `construction`, `manufacturing`, `it_services`

**Пример:**
```json
{
  "sector": "it_services",
  "initial_investment": 1000000,
  "time_horizon_years": 5,
  "num_simulations": 1000
}
```

### 8. XAI — Объяснимость (`/xai`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| POST | `/xai/analyze` | XAI-анализ решения |
| GET | `/xai/factors` | Список факторов |

### 9. Исламские финансы (`/islamic-finance`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| POST | `/islamic-finance/screening` | Шариатский скрининг |
| POST | `/islamic-finance/zakat/calculate` | Закят-калькулятор |
| GET | `/islamic-finance/products` | Исламские продукты |

### 10. Курсы валют (`/rates`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| GET | `/rates` | Актуальные курсы ЦБ Узбекистана |
| POST | `/rates/sync` | Синхронизация курсов |
| POST | `/rates/convert` | Конвертация через UZS |

### 11. Экспорт (`/export`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| POST | `/export/portfolio-pdf` | PDF сводка портфеля |
| POST | `/export/dd-report-pdf` | PDF DD-отчёт |
| POST | `/export/decision-pdf` | PDF меморандум решения |
| POST | `/export/excel/portfolio` | Excel портфеля |
| POST | `/export/excel/dd-report` | Excel DD-отчёт |
| POST | `/export/excel/comparison` | Excel сравнение компаний |

### 12. Дашборд (`/dashboard`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| GET | `/dashboard/` | Данные дашборда (KPI, статистика) |
| GET | `/dashboard/stats` | Агрегированная статистика |

### 13. AI-ассистент (`/ai`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| POST | `/ai/analyze` | AI-анализ по запросу |
| POST | `/ai/chat` | Чат с AI-ассистентом |

### 14. AI-оркестрация (`/ai-orchestrator`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| POST | `/ai-orchestrator/route` | Маршрутизация запроса к оптимальному провайдеру |
| POST | `/ai-orchestrator/synthesize` | Синтез ответов от нескольких провайдеров |
| GET | `/ai-provider-health/status` | Статус провайдеров (circuit breaker) |
| GET | `/ai-provider-health/stats` | Статистика провайдеров |

### 15. Поиск компаний (`/companies`)

| Метод | Эндпоинт | Описание |
|---|---|---|
| GET | `/companies/search` | Поиск по имени или ИНН |

---

## Коды ошибок

| Код | Описание |
|---|---|
| 200 | Успешный запрос |
| 201 | Ресурс создан |
| 204 | Успешно, нет содержимого |
| 400 | Некорректный запрос (дубликат email и т.д.) |
| 401 | Не авторизован (отсутствует или невалидный токен) |
| 403 | Доступ запрещён (недостаточно прав) |
| 404 | Ресурс не найден |
| 422 | Ошибка валидации входных данных |
| 429 | Превышен лимит запросов |
| 500 | Внутренняя ошибка сервера |

## Пример рабочего процесса

```
1. POST /auth/register → создать аккаунт
2. POST /auth/login → получить access_token
3. POST /portfolios/ → создать портфель
4. POST /decisions/ → создать инвестиционное решение
5. POST /dd/scoring → запустить DD-скоринг компании
6. POST /calculator/full → рассчитать NPV/IRR/WACC
7. POST /analytics/monte-carlo-v2 → Monte Carlo симуляция
8. POST /xai/analyze → XAI-объяснение AI-решения
9. POST /export/portfolio-pdf → экспортировать отчёт
```

## Контакты

- **Email**: support@ai-capital.uz
- **Telegram**: @ai_capital_bot
- **Swagger**: http://localhost:8000/docs
