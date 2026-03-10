"""
Обновлённый config.py — добавлены переменные AI-провайдеров.
Этапы 2.1–3.1.

ИНСТРУКЦИЯ: Замените существующий app/core/config.py целиком.
"""
import os
import secrets
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # --- Security ---
    SECRET_KEY: str  # Обязательный! Нет дефолта — требует .env
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 день

    # --- Database ---
    DATABASE_URL: str = "postgresql+psycopg2://ai_user:ai_password@db:5432/ai_capital"

    # --- Redis ---
    REDIS_URL: str = "redis://redis:6379/0"

    # --- AI Services (существующие) ---
    GROQ_API_KEY: str = ""
    ALPHA_VANTAGE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # --- AI-провайдеры Этап 3 ---
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"
    HF_API_KEY: str = ""
    HF_CHAT_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.3"

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:10000,https://ai-capital-frontend.onrender.com"

    # --- App ---
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
                'Сгенерируйте: python -c "import secrets; print(secrets.token_hex(32))"'
            )
        if len(v) < 32:
            raise ValueError(
                "SECRET_KEY должен быть минимум 32 символа. "
                'Сгенерируйте: python -c "import secrets; print(secrets.token_hex(32))"'
            )
        return v


    @property
    def database_url_sync(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        return url

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
