# AI Capital Management

> **Автор:** Солиев Акмал Идиевич  
> **Патент:** №009932

## Описание

Инвестиционная платформа с искусственным интеллектом для анализа рынков Узбекистана и управления портфелями активов.

## Возможности MVP

| Модуль | Описание |
|--------|----------|
| Dashboard | Управление инвестиционными портфелями |
| Due Diligence AI | Анализ компаний с помощью ИИ (Groq/LLaMA) |
| Рынок УЗ | Анализ рынков Узбекистана (мука, зерно и др.) |
| Калькулятор | Инвестиционный калькулятор ROI с графиками |
| Макро УЗ | Курс сума, ЦБ ставки, макроэкономика |
| PDF Отчёт | Генерация профессиональных отчётов |

## Технологии

**Backend:** FastAPI, PostgreSQL, SQLAlchemy, JWT Auth  
**Frontend:** Next.js 16, TypeScript, Recharts, jsPDF  
**AI:** Groq API (LLaMA 3.1-8B)  
**Market Data:** Alpha Vantage API  
**Deploy:** Docker, Docker Compose

## Быстрый старт

### Требования
- Docker Desktop
- Git

### Установка

```bash
# 1. Клонировать репозиторий
git clone https://github.com/akmalss19800606-web/ai-capitalS-mvp.git
cd ai-capitalS-mvp

# 2. Создать файл .env
copy .env.example .env
# Заполнить ключи в .env

# 3. Запустить
docker-compose up --build
```

### Переменные окружения (.env)

```env
GROQ_API_KEY=your_groq_key
ALPHA_VANTAGE_API_KEY=TMPW23EHFMN4Y7XI
SECRET_KEY=your_secret_key_min_32_chars
OPENAI_API_KEY=optional
```

### Доступ

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Структура проекта

```
ai-capitalS-mvp/
├── app/                    # FastAPI backend
│   ├── api/v1/routers/     # API эндпоинты
│   ├── services/           # Бизнес-логика, AI сервис
│   ├── db/                 # База данных
│   └── schemas/            # Pydantic модели
├── frontend/               # Next.js frontend
│   └── app/
│       ├── calculator/     # Инвестиционный калькулятор
│       ├── due-diligence/  # Due Diligence AI
│       ├── macro-uz/       # Макроэкономика УЗ
│       ├── market-uz/      # Рынок Узбекистана
│       └── report/         # PDF Отчёты
├── Dockerfile              # Backend Docker
└── docker-compose.yml      # Оркестрация всех сервисов
```

## Лицензия

Авторское право © 2024 Солиев Акмал Идиевич. Патент №009932. Все права защищены.
