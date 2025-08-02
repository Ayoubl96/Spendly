from pydantic_settings import BaseSettings
from typing import Optional
import secrets


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Spendly"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str = "postgresql://spendly_user:spendly_pass@postgres:5432/spendly_db"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379"
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost", "http://localhost:3000", "http://localhost:80"]
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "/app/uploads"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()