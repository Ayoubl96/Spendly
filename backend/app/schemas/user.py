from pydantic import BaseModel, EmailStr, field_serializer
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True
    is_superuser: bool = False


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None


class UserInDBBase(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime | None = None
    
    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)
    
    class Config:
        from_attributes = True


class User(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    hashed_password: str