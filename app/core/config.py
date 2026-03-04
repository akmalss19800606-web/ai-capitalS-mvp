import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 день

    DATABASE_URL: str = "postgresql+psycopg2://ai_user:ai_password@db:5432/ai_capital"

    GROQ_API_KEY: str = ""
    ALPHA_VANTAGE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def database_url_sync(self) -> str:
        url = self.DATABASE_URL
        # Render отдаёт postgresql://, нужно postgresql+psycopg2://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url


settings = Settings()
