"""
Pydantic schemas for Monthly Budget Plans
"""

from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, validator, field_serializer, ConfigDict
from uuid import UUID

from app.schemas.budget import BudgetStatus


class CategoryBudgetAllocationBase(BaseModel):
    """Base schema for category budget allocation"""
    category_id: str
    budget_amount: Decimal
    alert_threshold: Decimal = Decimal("80.0")
    is_active: bool = True

    @validator("budget_amount")
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Budget amount must be positive")
        return v

    @validator("alert_threshold")
    def validate_alert_threshold(cls, v):
        if v <= 0 or v > 100:
            raise ValueError("Alert threshold must be between 0 and 100")
        return v


class CategoryBudgetAllocationCreate(CategoryBudgetAllocationBase):
    """Schema for creating category budget allocation"""
    pass


class CategoryBudgetAllocation(CategoryBudgetAllocationBase):
    """Schema for category budget allocation with performance data"""
    category_name: str
    parent_category_id: Optional[str] = None
    parent_category_name: Optional[str] = None
    budget_id: Optional[str] = None
    spent: Optional[Decimal] = Decimal("0")
    remaining: Optional[Decimal] = None
    percentage_used: Optional[Decimal] = Decimal("0")
    status: Optional[BudgetStatus] = BudgetStatus.ON_TRACK

    model_config = ConfigDict(from_attributes=True)


class MonthlyBudgetPlanBase(BaseModel):
    """Base schema for monthly budget plan"""
    name: str
    month: int  # 1-12
    year: int
    currency: str

    @validator("month")
    def validate_month(cls, v):
        if v < 1 or v > 12:
            raise ValueError("Month must be between 1 and 12")
        return v

    @validator("year")
    def validate_year(cls, v):
        if v < 2020 or v > 2030:
            raise ValueError("Year must be between 2020 and 2030")
        return v

    @validator("currency")
    def validate_currency(cls, v):
        if not v or len(v) != 3:
            raise ValueError("Currency must be a valid 3-letter code")
        return v.upper()


class MonthlyBudgetPlanCreate(MonthlyBudgetPlanBase):
    """Schema for creating a monthly budget plan"""
    category_budgets: List[CategoryBudgetAllocationCreate]

    @validator("category_budgets")
    def validate_category_budgets(cls, v):
        if not v:
            raise ValueError("At least one category budget is required")
        
        # Check for duplicate categories
        category_ids = [cb.category_id for cb in v]
        if len(category_ids) != len(set(category_ids)):
            raise ValueError("Duplicate categories are not allowed")
        
        return v


class MonthlyBudgetPlanUpdate(BaseModel):
    """Schema for updating a monthly budget plan"""
    name: Optional[str] = None
    currency: Optional[str] = None
    category_budgets: Optional[List[CategoryBudgetAllocationCreate]] = None

    @validator("currency")
    def validate_currency(cls, v):
        if v and len(v) != 3:
            raise ValueError("Currency must be a valid 3-letter code")
        return v.upper() if v else v

    @validator("category_budgets")
    def validate_category_budgets(cls, v):
        if v is not None:
            # Check for duplicate categories
            category_ids = [cb.category_id for cb in v]
            if len(category_ids) != len(set(category_ids)):
                raise ValueError("Duplicate categories are not allowed")
        return v


class MonthlyBudgetPlan(MonthlyBudgetPlanBase):
    """Schema for monthly budget plan response"""
    total_amount: Decimal
    category_budgets: List[CategoryBudgetAllocation]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MonthlyBudgetPlanSummary(BaseModel):
    """Schema for monthly budget plan summary"""
    plan_id: str  # Virtual ID like "2025-03"
    name: str
    month: int
    year: int
    currency: str
    total_budget: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    overall_percentage: Decimal
    overall_status: BudgetStatus
    category_count: int
    active_budget_count: int

    model_config = ConfigDict(from_attributes=True)


class BudgetPlanDuplicationRequest(BaseModel):
    """Schema for duplicating a budget plan to another month"""
    source_year: int
    source_month: int
    target_year: int
    target_month: int
    new_name: Optional[str] = None

    @validator("source_month", "target_month")
    def validate_month(cls, v):
        if v < 1 or v > 12:
            raise ValueError("Month must be between 1 and 12")
        return v

    @validator("source_year", "target_year")
    def validate_year(cls, v):
        if v < 2020 or v > 2030:
            raise ValueError("Year must be between 2020 and 2030")
        return v