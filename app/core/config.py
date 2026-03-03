from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 день

    DATABASE_URL: str = "postgresql+psycopg2://ai_user:ai_password@db:5432/ai_capital"


settings = Settings()
