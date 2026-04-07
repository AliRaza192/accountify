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
    
    # Email Configuration (for 2FA, approvals, invoices, etc.)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    EMAIL_FROM: str = "Accountify <noreply@accountify.com>"
    
    # 2FA Configuration
    OTP_EXPIRY_MINUTES: int = 5
    OTP_MAX_REQUESTS_PER_HOUR: int = 3
    
    # Branch Configuration
    DEFAULT_BRANCH_ID: int = 1
    ENABLE_BRANCH_ISOLATION: bool = True
    
    # Audit Configuration
    AUDIT_LOG_RETENTION_DAYS: int = 90
    ENABLE_AUDIT_TRAIL: bool = True

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
