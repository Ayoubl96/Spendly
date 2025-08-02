from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID
from enum import Enum


class BudgetPeriod(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class BudgetBase(BaseModel):
    category_id: Optional[UUID] = None
    name: str = Field(..., min_length=1, max_length=100)
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field("USD", min_length=3, max_length=3)
    period: BudgetPeriod
    start_date: date
    end_date: date
    alert_threshold: Decimal = Field(80.00, ge=0, le=100, decimal_places=2)

    @validator('end_date')
    def validate_dates(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    category_id: Optional[UUID] = None
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    period: Optional[BudgetPeriod] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    alert_threshold: Optional[Decimal] = Field(None, ge=0, le=100, decimal_places=2)


class BudgetInDBBase(BudgetBase):
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class Budget(BudgetInDBBase):
    pass


class BudgetWithStatus(BudgetInDBBase):
    spent_amount: Decimal = Field(0, decimal_places=2)
    remaining_amount: Decimal = Field(0, decimal_places=2)
    percentage_used: Decimal = Field(0, decimal_places=2)
    is_over_budget: bool = False
    days_remaining: int = 0
    category: Optional['Category'] = None


class BudgetSummary(BaseModel):
    total_budgeted: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    percentage_used: Decimal
    active_budgets: int
    over_budget_count: int
    budgets: List[BudgetWithStatus] = []


from .category import Category
BudgetWithStatus.update_forward_refs()