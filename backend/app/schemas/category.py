from pydantic import BaseModel, Field, field_serializer
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class CategoryType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: CategoryType
    color: Optional[str] = Field("#000000", pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    parent_id: Optional[UUID] = None

    @field_serializer('parent_id', when_used='unless-none')
    def serialize_parent_id(self, value: UUID) -> str:
        return str(value)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    parent_id: Optional[UUID] = None

    @field_serializer('parent_id', when_used='unless-none')
    def serialize_parent_id(self, value: UUID) -> str:
        return str(value)


class CategoryInDBBase(CategoryBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    @field_serializer('id', 'user_id')
    def serialize_uuid_fields(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


class Category(CategoryInDBBase):
    pass


class CategoryWithSubcategories(CategoryInDBBase):
    subcategories: List['CategoryWithSubcategories'] = []


CategoryWithSubcategories.update_forward_refs()