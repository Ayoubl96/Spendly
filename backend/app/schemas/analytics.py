from typing import Optional, List, Dict, Any
from datetime import date
from pydantic import BaseModel, validator
from decimal import Decimal
from enum import Enum


class PeriodType(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class AnalyticsFilters(BaseModel):
    year: Optional[int] = None
    month: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category_id: Optional[int] = None
    currency: Optional[str] = None

    @validator("month")
    def validate_month(cls, v):
        if v is not None and (v < 1 or v > 12):
            raise ValueError("Month must be between 1 and 12")
        return v

    @validator("year")
    def validate_year(cls, v):
        if v is not None and (v < 2000 or v > 2100):
            raise ValueError("Year must be between 2000 and 2100")
        return v

    @validator("end_date", pre=False, always=True)
    def validate_date_range(cls, v, values):
        start_date = values.get("start_date")
        if start_date and v and v < start_date:
            raise ValueError("End date must be after start date")
        return v


class CategoryBreakdownItem(BaseModel):
    category_id: str
    category_name: str
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    total_amount: int
    expense_count: int
    percentage: Decimal

    class Config:
        json_encoders = {Decimal: lambda v: float(v) if v is not None else None}


class CategoryAnalytics(BaseModel):
    period_start: date
    period_end: date
    period_type: PeriodType
    total_amount: int
    currency: Optional[str] = None
    categories: Optional[List[CategoryBreakdownItem]] = None


class SubcategoryBreakdownItem(BaseModel):
    subcategory_id: str
    subcategory_name: str
    parent_category_id: str
    total_amount: int
    expense_count: int
    percentage: Optional[Decimal] = None


class SubcategoryAnalytics(BaseModel):
    period_start: date
    period_end: date
    period_type: PeriodType
    total_amount: Decimal
    total_expenses: int
    currency: str
    subcategories: List[SubcategoryBreakdownItem]


class TrendDataPoint(BaseModel):
    date: date
    period_label: str
    total_amount: Decimal
    expense_count: int
    daily_average: Optional[Decimal] = None


class TrendAnalytics(BaseModel):
    period_start: date
    period_end: date
    period_type: PeriodType
    total_amount: Decimal
    total_expense: int
    currency: str
    trend_points: List[TrendDataPoint]
    average_per_period: Decimal
    growth_rate: Optional[Decimal] = None


class MonthlyComparisonItem(BaseModel):
    year: int
    month: int
    month_name: str
    total_amount: Decimal
    expense_count: int
    daily_average: Optional[str] = None
    top_category: Optional[str] = None
    top_category_amount: Optional[Decimal] = None


class MonthlyComparison(BaseModel):
    currency: str
    month1: MonthlyComparisonItem
    month2: MonthlyComparisonItem
    amount_difference: Decimal
    percentage_change: Decimal
    percentage_difference: Decimal
    expense_count_change: int


class AnalyticsSummary(BaseModel):
    period_start: date
    period_end: date
    currency: str
    total_amount: Decimal
    total_expenses: int
    unique_categories: int
    average_per_expense: Decimal
    daily_average: Decimal
    top_category: Optional[CategoryBreakdownItem] = None
    top_spending_day: Optional[date] = None
    top_spending_day_amount: Optional[Decimal] = None


class TrendAnalyticsRequest(BaseModel):
    start_date: date
    end_date: date
    groupping: str = "monthly"
    category_id: Optional[str] = None


class MonthlyComparisonRequest(BaseModel):
    month1_year: int
    month1_month: int
    month2_year: int
    month2_month: int
