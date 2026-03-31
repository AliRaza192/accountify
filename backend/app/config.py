from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    DATABASE_URL: str = ""
    GEMINI_API_KEY: str = ""
    SECRET_KEY: str = "default-secret-key"
    SUPABASE_JWT_SECRET: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
