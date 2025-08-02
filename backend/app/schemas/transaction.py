from pydantic import BaseModel, Field, field_serializer, field_validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID
from enum import Enum


class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


class TransactionBase(BaseModel):
    category_id: Optional[UUID] = None
    amount: Decimal = Field(..., gt=0)
    currency: str = Field("USD", min_length=3, max_length=3)
    date: date
    description: Optional[str] = None
    type: TransactionType
    recurring: bool = False
    recurring_frequency: Optional[str] = Field(None, pattern="^(daily|weekly|monthly|yearly)$")
    tags: Optional[str] = None

    @field_validator('recurring_frequency')
    @classmethod
    def validate_recurring_frequency(cls, v, info):
        if info.data.get('recurring') and not v:
            raise ValueError('recurring_frequency is required when recurring is True')
        return v


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    category_id: Optional[UUID] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    date: Optional[date] = None
    description: Optional[str] = None
    type: Optional[TransactionType] = None
    recurring: Optional[bool] = None
    recurring_frequency: Optional[str] = Field(None, pattern="^(daily|weekly|monthly|yearly)$")
    tags: Optional[str] = None


class TransactionInDBBase(TransactionBase):
    id: UUID
    user_id: UUID
    receipt_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_serializer('id', 'user_id', 'category_id', when_used='unless-none')
    def serialize_uuid_fields(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


class Transaction(TransactionInDBBase):
    pass


class TransactionWithCategory(TransactionInDBBase):
    category: Optional['Category'] = None


# Import functionality
class TransactionImport(BaseModel):
    date: date
    amount: Decimal
    description: Optional[str] = None
    category_name: Optional[str] = None
    type: TransactionType
    tags: Optional[str] = None


class TransactionImportResult(BaseModel):
    total_rows: int
    successful_imports: int
    failed_imports: int
    errors: List[str] = []
    transactions: List[Transaction] = []


# Analytics
class TransactionSummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    net_amount: Decimal
    transaction_count: int
    average_transaction: Decimal


from .category import Category
TransactionWithCategory.update_forward_refs()