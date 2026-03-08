import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Security
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg2://ai_user:ai_password@db:5432/ai_capital"
    
    # Redis (for caching in v2.3)
    REDIS_URL: str = "redis://redis:6379/0"
    
    # AI Services
    GROQ_API_KEY: str = ""
    ALPHA_VANTAGE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    
    # App
    APP_NAME: str = "AI Capital Management"
    APP_VERSION: str = "2.3.0"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def database_url_sync(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and "+psycopg2" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

settings = Settings()
