# Этап 2: Реальные данные Узбекистана — Инструкция по установке

**Дата:** 10 марта 2026  
**Блок ТЗ:** Этап 2 — Реальные данные Узбекистана (5 задач)

---

## Что входит в этот пакет

| # | Задача | Файлы | Источник данных |
|---|--------|-------|-----------------|
| 1 | Макроданные (ВВП, инфляция, промышленность, население) | `macro_data_service.py` + `macro_data.py` (роутер) | World Bank API |
| 2 | ИПЦ / Инфляция | `cpi_data_service.py` + `cpi_data.py` (роутер) | World Bank API |
| 3 | Биржа UZSE (котировки + сделки) | `stock_exchange_service.py` + `stock_exchange.py` (роутер) | uzse.uz (парсинг HTML) |
| 4 | Поиск компаний по ИНН | `company_lookup_service.py` + `company_lookup.py` (роутер) | orginfo.uz (парсинг HTML) |
| 5 | Калькулятор с реальными данными | `calculator/page.tsx` | API `/rates`, `/cpi/current`, `/macro/summary` |

---

## Структура архива

```
fix_stage2/
├── INSTALL.md                             ← Эта инструкция
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── macro_data_service.py      ← НОВЫЙ: World Bank API
│   │   │   ├── cpi_data_service.py        ← НОВЫЙ: World Bank CPI
│   │   │   ├── stock_exchange_service.py  ← НОВЫЙ: UZSE парсинг
│   │   │   └── company_lookup_service.py  ← НОВЫЙ: orginfo.uz парсинг
│   │   └── api/v1/routers/
│   │       ├── macro_data.py              ← ЗАМЕНА заглушки
│   │       ├── cpi_data.py                ← ЗАМЕНА заглушки
│   │       ├── stock_exchange.py          ← ЗАМЕНА заглушки
│   │       └── company_lookup.py          ← ЗАМЕНА заглушки
└── frontend/
    └── app/
        └── calculator/
            └── page.tsx                   ← ЗАМЕНА: реальные данные вместо хардкода
```

---

## Пошаговая установка

### Шаг 1. Остановите контейнеры

```bash
cd /путь/к/проекту/ai-capitalS-mvp
docker compose down
```

### Шаг 2. Скопируйте файлы бэкенда

**Сервисы (новые файлы):**

```bash
cp fix_stage2/backend/app/services/macro_data_service.py     app/services/
cp fix_stage2/backend/app/services/cpi_data_service.py        app/services/
cp fix_stage2/backend/app/services/stock_exchange_service.py   app/services/
cp fix_stage2/backend/app/services/company_lookup_service.py   app/services/
```

**Роутеры (замена заглушек):**

```bash
cp fix_stage2/backend/app/api/v1/routers/macro_data.py        app/api/v1/routers/
cp fix_stage2/backend/app/api/v1/routers/cpi_data.py          app/api/v1/routers/
cp fix_stage2/backend/app/api/v1/routers/stock_exchange.py     app/api/v1/routers/
cp fix_stage2/backend/app/api/v1/routers/company_lookup.py     app/api/v1/routers/
```

### Шаг 3. Скопируйте файл фронтенда

```bash
cp fix_stage2/frontend/app/calculator/page.tsx   frontend/app/calculator/
```

### Шаг 4. Обновите Dockerfile — добавьте зависимости

Откройте файл `Dockerfile` и найдите строку с `pip install`. Добавьте в неё **две новые библиотеки**:

```
beautifulsoup4 \
lxml \
```

**Было:**
```dockerfile
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    ...
    "scipy>=1.12.0" \
    "scikit-learn>=1.4.0"
```

**Стало:**
```dockerfile
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    ...
    "scipy>=1.12.0" \
    "scikit-learn>=1.4.0" \
    beautifulsoup4 \
    lxml
```

> ⚠️ `beautifulsoup4` и `lxml` нужны для парсинга HTML с uzse.uz и orginfo.uz.

### Шаг 5. Пересоберите и запустите

```bash
docker compose build --no-cache
docker compose up -d
```

### Шаг 6. Проверьте работу

Дождитесь запуска контейнеров (~30 сек), затем проверьте эндпоинты:

```bash
# 1. Макроданные — синхронизация с World Bank
curl -X POST http://localhost:8000/api/v1/macro/sync \
  -H "Authorization: Bearer ВАШ_ТОКЕН"

# 2. Макроданные — сводка
curl http://localhost:8000/api/v1/macro/summary \
  -H "Authorization: Bearer ВАШ_ТОКЕН"

# 3. ИПЦ — синхронизация
curl -X POST http://localhost:8000/api/v1/cpi/sync \
  -H "Authorization: Bearer ВАШ_ТОКЕН"

# 4. ИПЦ — текущее значение
curl http://localhost:8000/api/v1/cpi/current \
  -H "Authorization: Bearer ВАШ_ТОКЕН"

# 5. Биржа — синхронизация котировок UZSE
curl -X POST http://localhost:8000/api/v1/stock-exchange/sync \
  -H "Authorization: Bearer ВАШ_ТОКЕН"

# 6. Биржа — котировки из БД
curl http://localhost:8000/api/v1/stock-exchange/quotes \
  -H "Authorization: Bearer ВАШ_ТОКЕН"

# 7. Биржа — последние сделки (напрямую с UZSE)
curl http://localhost:8000/api/v1/stock-exchange/trades \
  -H "Authorization: Bearer ВАШ_ТОКЕН"

# 8. Поиск компании по ИНН
curl "http://localhost:8000/api/v1/company/search?query=200564730" \
  -H "Authorization: Bearer ВАШ_ТОКЕН"

# 9. Калькулятор — откройте в браузере
# http://localhost:3000/calculator
# Должны отображаться актуальные ставки: курс ЦБ, инфляция, ставка
```

---

## Новые API эндпоинты

### Макроданные (`/api/v1/macro`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/macro/health` | Проверка доступности |
| GET | `/macro/indicators?code=NY.GDP.MKTP.CD&limit=20` | Список индикаторов |
| GET | `/macro/summary` | Последние значения ВВП, инфляция, население |
| POST | `/macro/sync` | Синхронизация с World Bank API |

### ИПЦ / Инфляция (`/api/v1/cpi`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/cpi/data?limit=30` | Записи ИПЦ из БД |
| GET | `/cpi/current` | Последнее значение инфляции |
| GET | `/cpi/trend?years=10` | Тренд ИПЦ для графика |
| POST | `/cpi/sync` | Синхронизация с World Bank API |

### Биржа UZSE (`/api/v1/stock-exchange`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/stock-exchange/quotes?ticker=HMKB&limit=50` | Котировки из БД |
| GET | `/stock-exchange/emitters` | Список эмитентов |
| GET | `/stock-exchange/trades` | Последние сделки (свежие с UZSE) |
| POST | `/stock-exchange/sync` | Синхронизация котировок в БД |

### Поиск компаний (`/api/v1/company`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/company/search?query=200564730` | Поиск по ИНН или названию |
| GET | `/company/profile/200564730` | Профиль компании по ИНН |
| POST | `/company/sync` | Массовая загрузка по списку ИНН |

---

## Источники данных

| Данные | Источник | Метод |
|--------|----------|-------|
| ВВП, инфляция, население, промышленность | [World Bank API](https://api.worldbank.org/v2/country/UZB/) | REST API (JSON) |
| ИПЦ (индекс потребительских цен) | [World Bank API](https://api.worldbank.org/v2/country/UZB/indicator/FP.CPI.TOTL.ZG) | REST API (JSON) |
| Котировки ценных бумаг | [uzse.uz](https://uzse.uz/abouts/msq/) | Парсинг HTML (BeautifulSoup) |
| Последние сделки | [uzse.uz](https://uzse.uz/) | Парсинг HTML (BeautifulSoup) |
| Данные о компаниях | [orginfo.uz](https://orginfo.uz/) | Парсинг HTML (BeautifulSoup) |
| Курс валют | [cbu.uz](https://cbu.uz/) | REST API (уже реализован) |

---

## Примечания

1. **Миграции не нужны** — все таблицы (`macro_indicators`, `cpi_records`, `stock_quotes`, `stock_emitters`, `company_profiles`) уже созданы в существующей миграции `0001`.

2. **main.py не нужно менять** — все роутеры уже зарегистрированы в `main.py` с правильными путями.

3. **Первичная загрузка данных** — после запуска выполните `/sync` эндпоинты для первоначального наполнения БД:
   - `POST /api/v1/macro/sync` (World Bank, ~5 сек)
   - `POST /api/v1/cpi/sync` (World Bank, ~3 сек)
   - `POST /api/v1/stock-exchange/sync` (UZSE, ~5 сек)

4. **Калькулятор** — теперь загружает курс USD, инфляцию и ставку ЦБ из API при открытии страницы. Если API недоступен — использует фолбэк-значения.

5. **Парсинг HTML** — uzse.uz и orginfo.uz не имеют публичного API, поэтому данные извлекаются из HTML-страниц. Если сайты меняют вёрстку, парсинг может потребовать обновления.
