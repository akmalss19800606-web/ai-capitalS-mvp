#!/bin/bash
# ─────────────────────────────────────────────────────────
# Запуск тестов внутри Docker-контейнера.
# Этап 0, Сессия 0.4 — Базовые тесты.
#
# Использование:
#   docker exec ai_capital_backend bash /app/run_tests.sh
#
# Или из PowerShell:
#   docker exec ai_capital_backend bash /app/run_tests.sh
# ─────────────────────────────────────────────────────────

set -e

echo "============================================"
echo "  AI Capital — Запуск тестов"
echo "============================================"

# Переменные окружения для тестов
export SECRET_KEY="${SECRET_KEY:-test-secret-key-minimum-32-characters-long-enough}"
export DATABASE_URL="sqlite:///./test.db"
export DEBUG="true"
export CORS_ORIGINS="http://localhost:3000"

cd /app

echo ""
echo "[1/3] Запуск всех тестов..."
echo "--------------------------------------------"
python -m pytest tests/ -v --tb=short 2>&1

EXIT_CODE=$?

echo ""
echo "--------------------------------------------"
if [ $EXIT_CODE -eq 0 ]; then
    echo "  ✅ Все тесты пройдены успешно!"
else
    echo "  ❌ Есть ошибки в тестах (exit code: $EXIT_CODE)"
fi
echo "============================================"

# Удалить тестовую БД
rm -f /app/test.db

exit $EXIT_CODE
