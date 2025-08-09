"""
Budget Pydantic schemas
"""

from typing import Optional, List, Any, Dict
from datetime import date, datetime
from pydantic import BaseModel, validator, field_serializer, model_serializer, ConfigDict
from decimal import Decimal
from enum import Enum
from uuid import UUID


class PeriodType(str, Enum):
    """Budget period types"""
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class BudgetStatus(str, Enum):
    """Budget status options"""
    ON_TRACK = "on_track"
    WARNING = "warning"
    OVER_BUDGET = "over_budget"


class BudgetBase(BaseModel):
    """Base budget schema"""
    name: str
    amount: Decimal
    currency: str
    period_type: PeriodType
    start_date: date
    end_date: Optional[date] = None
    category_id: Optional[UUID] = None
    budget_group_id: Optional[UUID] = None
    alert_threshold: Decimal = Decimal("80.0")
    is_active: bool = True
    
    @field_serializer('category_id', when_used='json')
    def serialize_category_id(self, value: Optional[UUID]) -> Optional[str]:
        # Convert UUID to string for JSON serialization
        return str(value) if value else None
    
    @field_serializer('budget_group_id', when_used='json')
    def serialize_budget_group_id(self, value: Optional[UUID]) -> Optional[str]:
        # Convert UUID to string for JSON serialization
        return str(value) if value else None


class BudgetCreate(BudgetBase):
    """Schema for creating a budget"""
    # Allow category_id and budget_group_id to be provided as string from frontend
    category_id: Optional[str] = None
    budget_group_id: Optional[str] = None
    
    @validator("amount")
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Budget amount must be positive")
        return v
    
    @validator("name")
    def validate_name(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError("Budget name must be at least 3 characters long")
        return v.strip()
    
    @validator("currency")
    def validate_currency(cls, v):
        if not v or len(v) != 3:
            raise ValueError("Currency must be a valid 3-letter code")
        return v.upper()
    
    @validator("alert_threshold")
    def validate_alert_threshold(cls, v):
        if v <= 0 or v > 100:
            raise ValueError("Alert threshold must be between 0 and 100")
        return v
    
    @validator("end_date")
    def validate_end_date(cls, v, values):
        if v and "start_date" in values and v <= values["start_date"]:
            raise ValueError("End date must be after start date")
        return v
    
    @validator("category_id", pre=True)
    def validate_category_id(cls, v):
        if v is None or v == "":
            return None
        # Accept string input from frontend
        return v
    
    @validator("budget_group_id", pre=True)
    def validate_budget_group_id(cls, v):
        if v is None or v == "":
            return None
        # Accept string input from frontend
        return v


class BudgetUpdate(BaseModel):
    """Schema for updating a budget"""
    name: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    period_type: Optional[PeriodType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category_id: Optional[str] = None  # Accept string from frontend
    budget_group_id: Optional[str] = None  # Accept string from frontend
    alert_threshold: Optional[Decimal] = None
    is_active: Optional[bool] = None
    
    @validator("category_id", pre=True)
    def validate_category_id(cls, v):
        if v is None or v == "":
            return None
        # Accept string input from frontend
        return v
    
    @validator("budget_group_id", pre=True)
    def validate_budget_group_id(cls, v):
        if v is None or v == "":
            return None
        # Accept string input from frontend
        return v


class BudgetInDBBase(BudgetBase):
    """Base schema for budget in database"""
    id: UUID
    user_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @field_serializer('id', when_used='json')
    def serialize_id(self, value: UUID) -> str:
        return str(value)
    
    @field_serializer('user_id', when_used='json')
    def serialize_user_id(self, value: UUID) -> str:
        return str(value)
    
    model_config = ConfigDict(from_attributes=True)


class Budget(BudgetInDBBase):
    """Schema for budget response"""
    pass


class BudgetWithCategory(Budget):
    """Budget with category information"""
    category: Optional[dict] = None


class BudgetPerformance(BaseModel):
    """Schema for budget performance metrics"""
    budget_id: UUID
    name: str
    amount: Decimal
    spent: Decimal
    remaining: Decimal
    percentage_used: Decimal
    status: BudgetStatus
    is_over_budget: bool
    should_alert: bool
    alert_threshold: Decimal
    currency: str
    period_type: PeriodType
    start_date: date
    end_date: Optional[date] = None
    category_id: Optional[UUID] = None
    
    @field_serializer('budget_id', when_used='json')
    def serialize_budget_id(self, value: UUID) -> str:
        return str(value)
    
    model_config = ConfigDict(from_attributes=True)


class BudgetSummary(BaseModel):
    """Schema for budget summary"""
    total_budget: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    overall_percentage: Decimal
    overall_status: BudgetStatus
    budget_count: int
    status_counts: dict = {}
    budgets: List[BudgetPerformance] = []


class BudgetAlert(BaseModel):
    """Schema for budget alerts"""
    budget_id: str
    budget_name: str
    alert_type: str  # "warning" or "over_budget"
    percentage_used: Decimal
    amount_spent: Decimal
    budget_amount: Decimal
    remaining_amount: Decimal
    category_name: Optional[str] = None


class BudgetFilter(BaseModel):
    """Schema for budget filtering"""
    period_type: Optional[PeriodType] = None
    category_id: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[BudgetStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class BudgetProgress(BaseModel):
    """Schema for budget progress tracking"""
    budget_id: str
    date: date
    amount_spent: Decimal
    percentage_used: Decimal
    daily_average: Decimal
    projected_total: Decimal
    is_on_track: bool