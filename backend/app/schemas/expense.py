"""
Expense Pydantic schemas
"""

from typing import Optional, List, Any
from datetime import date, datetime
from pydantic import BaseModel, validator
from decimal import Decimal
from enum import Enum
import uuid


class PaymentMethod(str, Enum):
    """Payment method options"""
    CASH = "cash"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    OTHER = "other"


class ExpenseBase(BaseModel):
    """Base expense schema"""
    amount: Decimal
    currency: str
    description: str
    expense_date: date
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    notes: Optional[str] = None
    location: Optional[str] = None
    vendor: Optional[str] = None
    is_shared: bool = False
    shared_with: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class ExpenseCreate(ExpenseBase):
    """Schema for creating an expense"""
    amount_in_base_currency: Optional[Decimal] = None
    exchange_rate: Optional[Decimal] = None
    
    @validator("amount")
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v
    
    @validator("description")
    def validate_description(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError("Description must be at least 3 characters long")
        return v.strip()
    
    @validator("currency")
    def validate_currency(cls, v):
        if not v or len(v) != 3:
            raise ValueError("Currency must be a valid 3-letter code")
        return v.upper()
    
    @validator("expense_date")
    def validate_expense_date(cls, v):
        if v > date.today():
            raise ValueError("Expense date cannot be in the future")
        return v
    
    @validator("category_id")
    def validate_category_id(cls, v):
        if v is None or v == "":
            return None
        # Try to parse as UUID to validate format
        try:
            uuid.UUID(v)
            return v
        except (ValueError, TypeError):
            raise ValueError("Category ID must be a valid UUID or null")
    
    @validator("subcategory_id")
    def validate_subcategory_id(cls, v):
        if v is None or v == "":
            return None
        # Try to parse as UUID to validate format
        try:
            uuid.UUID(v)
            return v
        except (ValueError, TypeError):
            raise ValueError("Subcategory ID must be a valid UUID or null")


class ExpenseUpdate(ExpenseBase):
    """Schema for updating an expense"""
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None
    amount_in_base_currency: Optional[Decimal] = None
    exchange_rate: Optional[Decimal] = None


class ExpenseInDBBase(ExpenseBase):
    """Base schema for expense in database"""
    id: str
    user_id: str
    amount_in_base_currency: Optional[Decimal] = None
    exchange_rate: Optional[Decimal] = None
    receipt_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @validator("id", "user_id", "category_id", "subcategory_id", pre=True)
    def convert_uuid_to_string(cls, v):
        """Convert UUID objects to strings"""
        if v is None:
            return v
        return str(v)
    
    class Config:
        from_attributes = True


class Expense(ExpenseInDBBase):
    """Schema for expense response"""
    pass


class ExpenseWithDetails(Expense):
    """Expense with related information"""
    category: Optional[dict] = None
    subcategory: Optional[dict] = None
    currency_info: Optional[dict] = None
    attachments: List[dict] = []


class ExpenseAttachmentBase(BaseModel):
    """Base schema for expense attachments"""
    filename: str
    original_filename: str
    file_size: int
    mime_type: str


class ExpenseAttachmentCreate(ExpenseAttachmentBase):
    """Schema for creating an expense attachment"""
    pass


class ExpenseAttachment(ExpenseAttachmentBase):
    """Schema for expense attachment response"""
    id: str
    expense_id: str
    file_path: str
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SharedExpenseBase(BaseModel):
    """Base schema for shared expenses"""
    shared_with_user_id: str
    amount_owed: Decimal
    currency: str
    notes: Optional[str] = None


class SharedExpenseCreate(SharedExpenseBase):
    """Schema for creating a shared expense"""
    pass


class SharedExpense(SharedExpenseBase):
    """Schema for shared expense response"""
    id: str
    expense_id: str
    is_settled: bool = False
    settled_at: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ExpenseFilter(BaseModel):
    """Schema for expense filtering"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category_id: Optional[str] = None
    currency: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    search: Optional[str] = None
    is_shared: Optional[bool] = None
    tags: Optional[List[str]] = None


class ExpenseSummary(BaseModel):
    """Schema for expense summary"""
    total_amount: Decimal
    total_count: int
    currency: str
    period_start: date
    period_end: date
    category_breakdown: dict = {}
    monthly_breakdown: List[dict] = []


class ExpenseImport(BaseModel):
    """Schema for bulk expense import"""
    expenses: List[ExpenseCreate]
    
    @validator("expenses")
    def validate_expenses(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one expense is required")
        if len(v) > 1000:
            raise ValueError("Maximum 1000 expenses per import")
        return v


class ExpenseImportResult(BaseModel):
    """Schema for expense import result"""
    success_count: int
    error_count: int
    total_count: int
    errors: List[dict] = []
    imported_expenses: List[str] = []  # IDs of imported expenses