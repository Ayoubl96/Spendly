"""
Application Configuration Settings
"""

from typing import List, Optional, Union
from pydantic_settings import BaseSettings
from pydantic import validator, Field
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application Settings
    ENVIRONMENT: str = "development"
    APP_NAME: str = "Spendly"
    APP_VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Frontend URLs
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    
    # Security
    SECRET_KEY: str = "change_this_to_a_very_long_and_secure_random_string_for_production"
    JWT_SECRET: str = "change_this_to_a_very_long_and_secure_random_string_for_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    BCRYPT_ROUNDS: int = 12
    
    # CORS Settings
    CORS_ORIGINS: Union[str, List[str]] = Field(default=["http://localhost:3001"])
    ALLOWED_HOSTS: Union[str, List[str]] = Field(default=["*"])
    
    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_NAME: str = "spendly"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    

    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_FILE_TYPES: Union[str, List[str]] = Field(default=["image/jpeg", "image/png", "application/pdf"])
    
    # Currency API Configuration
    CURRENCY_API_KEY: Optional[str] = "demo"
    CURRENCY_API_BASE_URL: str = "https://api.fastforex.io/fetch-one"
    CURRENCY_API_TIMEOUT: int = 10
    CURRENCY_CACHE_DURATION_HOURS: int = 1
    CURRENCY_FALLBACK_RATES: str = '{"USD": {"EUR": "0.85", "MAD": "10.0", "BTC": "0.000025"}}'
    
    # Email (Optional)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@spendly.local"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Optional[str] = None
    
    # Features
    ENABLE_DOCS: bool = True
    ENABLE_ANALYTICS: bool = True
    ENABLE_BUDGET_ALERTS: bool = True
    ENABLE_SHARED_EXPENSES: bool = True
    ENABLE_FILE_UPLOADS: bool = True
    ENABLE_CURRENCY_CONVERSION: bool = True
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 3600  # 1 hour
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            if not v or not v.strip():  # Handle empty strings
                return ["http://localhost:3000"]
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000"]
    
    @validator("ALLOWED_HOSTS", pre=True)
    def assemble_allowed_hosts(cls, v):
        if isinstance(v, str):
            if not v or not v.strip():  # Handle empty strings
                return ["*"]
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]
    
    @validator("ALLOWED_FILE_TYPES", pre=True)
    def assemble_file_types(cls, v):
        if isinstance(v, str):
            if not v or not v.strip():  # Handle empty strings
                return ["image/jpeg", "image/png", "application/pdf"]
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["image/jpeg", "image/png", "application/pdf"]
    
    class Config:
        env_file = "../../../.env"
        case_sensitive = True


# Create global settings instance
settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)