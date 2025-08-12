"""
Budget Group Pydantic schemas
"""

from typing import Optional, List, Dict, Any, Literal
from datetime import date, datetime
from pydantic import BaseModel, validator, field_serializer, model_serializer, ConfigDict
from decimal import Decimal
from enum import Enum
from uuid import UUID


class PeriodType(str, Enum):
    """Budget group period types"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class BudgetGroupStatus(str, Enum):
    """Budget group status options"""
    ON_TRACK = "on_track"
    WARNING = "warning"
    OVER_BUDGET = "over_budget"


class BudgetGroupBase(BaseModel):
    """Base budget group schema"""
    name: str
    description: Optional[str] = None
    period_type: PeriodType
    start_date: date
    end_date: date
    currency: str
    is_active: bool = True


class CategoryBudgetConfig(BaseModel):
    """Configuration for a specific category's budget"""
    category_id: str
    amount: Decimal
    
    @validator("amount")
    def validate_amount(cls, v: Decimal):
        if v is None or v <= Decimal("0"):
            raise ValueError("Amount must be greater than 0")
        return v


class BudgetGroupCreate(BudgetGroupBase):
    """Schema for creating a budget group"""
    # Auto-generation options
    auto_create_budgets: bool = True
    category_scope: Literal["primary", "subcategories", "all"] = "all"
    default_amount: Decimal = Decimal("0.01")
    include_inactive_categories: bool = False
    # Specific category configurations (overrides default_amount for specified categories)
    category_configs: Optional[List[CategoryBudgetConfig]] = []
    
    @validator("name")
    def validate_name(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError("Budget group name must be at least 3 characters long")
        return v.strip()
    
    @validator("currency")
    def validate_currency(cls, v):
        if not v or len(v) != 3:
            raise ValueError("Currency must be a valid 3-letter code")
        return v.upper()
    
    @validator("end_date")
    def validate_end_date(cls, v, values):
        if "start_date" in values and v <= values["start_date"]:
            raise ValueError("End date must be after start date")
        return v
    
    @validator("default_amount")
    def validate_default_amount(cls, v: Decimal):
        if v is None or v <= Decimal("0"):
            raise ValueError("Default amount must be greater than 0")
        return v


class BudgetGroupUpdate(BaseModel):
    """Schema for updating a budget group"""
    name: Optional[str] = None
    description: Optional[str] = None
    period_type: Optional[PeriodType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None
    
    @validator("name")
    def validate_name(cls, v):
        if v is not None and (not v or len(v.strip()) < 3):
            raise ValueError("Budget group name must be at least 3 characters long")
        return v.strip() if v else v
    
    @validator("currency")
    def validate_currency(cls, v):
        if v is not None and (not v or len(v) != 3):
            raise ValueError("Currency must be a valid 3-letter code")
        return v.upper() if v else v


class GenerateBudgetsRequest(BaseModel):
    """Request to generate budgets inside a budget group"""
    category_scope: Literal["primary", "subcategories", "all"] = "all"
    default_amount: Decimal = Decimal("0.01")
    include_inactive_categories: bool = False
    
    @validator("default_amount")
    def validate_default_amount(cls, v: Decimal):
        if v is None or v <= Decimal("0"):
            raise ValueError("Default amount must be greater than 0")
        return v


class BulkBudgetUpdateItem(BaseModel):
    """Single budget update item"""
    budget_id: Optional[str] = None
    category_id: Optional[str] = None
    amount: Decimal
    
    @validator("amount")
    def validate_amount(cls, v):
        if v < 0:
            raise ValueError("Budget amount must be zero or greater")
        return v


class BulkBudgetsUpdateRequest(BaseModel):
    """Bulk update amounts for budgets in a group"""
    items: List[BulkBudgetUpdateItem]


class BudgetGroupInDBBase(BudgetGroupBase):
    """Base schema for budget group in database"""
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

    @model_serializer(mode='wrap')
    def serialize_model(self, handler):
        data = handler(self)
        # Convert snake_case fields to camelCase for frontend
        return {
            "id": data.get("id"),
            "name": data.get("name"),
            "description": data.get("description"),
            "periodType": data.get("period_type"),
            "startDate": data.get("start_date"),
            "endDate": data.get("end_date"),
            "currency": data.get("currency"),
            "userId": data.get("user_id"),
            "isActive": data.get("is_active"),
            "createdAt": data.get("created_at"),
            "updatedAt": data.get("updated_at"),
        }


class BudgetGroup(BudgetGroupInDBBase):
    """Schema for budget group response"""
    pass


class CategorySummary(BaseModel):
    """Schema for category summary within budget group"""
    categoryId: str
    categoryName: str
    budgeted: Decimal                               # Main category's own budget
    spent: Decimal                                  # Main category's own spent
    remaining: Decimal                              # Main category's own remaining
    percentage_used: Optional[Decimal] = None       # Main category's own percentage
    total_budgeted: Optional[Decimal] = None        # Total including subcategories
    total_spent: Optional[Decimal] = None           # Total spent including subcategories
    total_remaining: Optional[Decimal] = None       # Total remaining including subcategories
    total_percentage_used: Optional[Decimal] = None # Total percentage including subcategories
    subcategories: Dict[str, Dict[str, Any]] = {}
    
    @field_serializer('budgeted', 'spent', 'remaining', 'percentage_used', 'total_budgeted', 'total_spent', 'total_remaining', 'total_percentage_used', when_used='json')
    def serialize_decimal(self, value: Optional[Decimal]) -> Optional[float]:
        return float(value) if value is not None else None


class BudgetGroupSummary(BaseModel):
    """Schema for comprehensive budget group summary"""
    budget_group: BudgetGroup
    total_budgeted: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    percentage_used: Decimal
    status: BudgetGroupStatus
    budget_count: int
    category_summaries: Dict[str, CategorySummary]
    
    @field_serializer('total_budgeted', 'total_spent', 'total_remaining', 'percentage_used', when_used='json')
    def serialize_decimal(self, value: Decimal) -> float:
        return float(value)


class BudgetGroupWithBudgets(BudgetGroup):
    """Budget group with its associated budgets"""
    budgets: List[Dict[str, Any]] = []
    
    @model_serializer(mode='wrap')
    def serialize_model(self, handler):
        data = handler(self)
        # Convert snake_case fields to camelCase for frontend and include budgets
        return {
            "id": data.get("id"),
            "name": data.get("name"),
            "description": data.get("description"),
            "periodType": data.get("period_type"),
            "startDate": data.get("start_date"),
            "endDate": data.get("end_date"),
            "currency": data.get("currency"),
            "userId": data.get("user_id"),
            "isActive": data.get("is_active"),
            "createdAt": data.get("created_at"),
            "updatedAt": data.get("updated_at"),
            "budgets": data.get("budgets", []),  # Include budgets field!
        }


class BudgetGroupList(BaseModel):
    """Schema for budget group list response"""
    items: List[BudgetGroup]
    total: int
    active_groups: int
    current_period_groups: int


class BudgetGroupFilter(BaseModel):
    """Schema for budget group filtering"""
    period_type: Optional[PeriodType] = None
    is_active: Optional[bool] = None
    currency: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class BudgetGroupProgress(BaseModel):
    """Schema for budget group progress tracking"""
    budget_group_id: str
    date: date
    total_spent: Decimal
    percentage_used: Decimal
    daily_average: Decimal
    projected_total: Decimal
    is_on_track: bool
    
    @field_serializer('total_spent', 'percentage_used', 'daily_average', 'projected_total', when_used='json')
    def serialize_decimal(self, value: Decimal) -> float:
        return float(value)


class BudgetGroupAlert(BaseModel):
    """Schema for budget group alerts"""
    budget_group_id: str
    budget_group_name: str
    alert_type: str  # "warning" or "over_budget"
    percentage_used: Decimal
    total_spent: Decimal
    total_budgeted: Decimal
    remaining_amount: Decimal
    
    @field_serializer('percentage_used', 'total_spent', 'total_budgeted', 'remaining_amount', when_used='json')
    def serialize_decimal(self, value: Decimal) -> float:
        return float(value)
