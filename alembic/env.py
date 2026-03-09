"""
Alembic env.py — AI Capital MVP.
Этап 0, Сессия 0.3 — Миграции.

Берёт DATABASE_URL из app.core.config (через .env),
импортирует все модели из app.db.base для автогенерации.
"""
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Импорт конфигурации приложения ──
from app.core.config import settings

# ── Импорт Base и ВСЕХ моделей (через base.py) ──
from app.db.base import Base  # noqa: F401 — side-effect imports

# Alembic Config object
config = context.config

# Устанавливаем URL из настроек приложения
config.set_main_option("sqlalchemy.url", settings.database_url_sync)

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData для автогенерации
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Запуск миграций в offline-режиме (генерация SQL без подключения)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Запуск миграций в online-режиме (с подключением к БД)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
