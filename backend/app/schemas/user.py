"""
User Pydantic schemas
"""

from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, validator, ConfigDict


class UserBase(BaseModel):
    """Base user schema"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    default_currency: str = "EUR"
    timezone: str = "Europe/Zurich"
    date_format: str = "DD/MM/YYYY"
    language: str = "en"
    is_active: bool = True


class UserCreate(UserBase):
    """Schema for creating a user"""
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    
    @validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v
    
    @validator("first_name", "last_name")
    def validate_names(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters long")
        return v.strip()


class UserUpdate(UserBase):
    """Schema for updating a user"""
    pass


class UserInDBBase(UserBase):
    """Base schema for user in database"""
    id: Optional[UUID] = None
    email_verified: bool = False
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class User(UserInDBBase):
    """Schema for user response (without sensitive data)"""
    pass


class UserInDB(UserInDBBase):
    """Schema for user with hashed password (internal use)"""
    password_hash: str


class UserProfile(User):
    """Extended user profile schema"""
    full_name: str
    
    @validator("full_name", pre=True, always=True)
    def compute_full_name(cls, v, values):
        first_name = values.get("first_name", "")
        last_name = values.get("last_name", "")
        return f"{first_name} {last_name}".strip()


class PasswordUpdate(BaseModel):
    """Schema for password update"""
    current_password: str
    new_password: str
    
    @validator("new_password")
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v