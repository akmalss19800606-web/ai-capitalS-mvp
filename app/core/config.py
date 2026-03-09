"""
Конфигурация приложения.
Этап 0, Сессия 0.1 — Безопасность: SECRET_KEY обязателен, валидация .env.

ВАЖНО: SECRET_KEY больше НЕ имеет дефолтного значения.
Если .env не содержит SECRET_KEY, приложение НЕ запустится.
"""
import os
import secrets
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # ── Security ──
    SECRET_KEY: str  # Обязательный! Нет дефолта — требует .env
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 день

    # ── Database ──
    DATABASE_URL: str = "postgresql+psycopg2://ai_user:ai_password@db:5432/ai_capital"

    # ── Redis ──
    REDIS_URL: str = "redis://redis:6379/0"

    # ── AI Services ──
    GROQ_API_KEY: str = ""
    ALPHA_VANTAGE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # ── CORS ──
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:10000"

    # ── App ──
    APP_NAME: str = "AI Capital Management"
    APP_VERSION: str = "3.0.0"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if v in ("", "super-secret-key-change-in-production", "changeme", "secret"):
            raise ValueError(
                "SECRET_KEY не может быть пустым или дефолтным! "
                "Сгенерируйте: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if len(v) < 32:
            raise ValueError(
                "SECRET_KEY должен быть минимум 32 символа. "
                "Сгенерируйте: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        """Парсит CORS_ORIGINS из строки в список."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def database_url_sync(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and "+psycopg2" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url


settings = Settings()
