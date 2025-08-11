"""
User Payment Method Pydantic schemas
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, validator
import uuid


class PaymentMethodBase(BaseModel):
    """Base payment method schema"""
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True

    @validator("name")
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError("Payment method name is required")
        if len(v.strip()) > 100:
            raise ValueError("Payment method name must be 100 characters or less")
        return v.strip()
    
    @validator("color")
    def validate_color(cls, v):
        if v is None:
            return v
        if not v.startswith("#") or len(v) != 7:
            raise ValueError("Color must be a valid hex code (e.g., #3B82F6)")
        try:
            int(v[1:], 16)  # Validate hex format
        except ValueError:
            raise ValueError("Color must be a valid hex code")
        return v.upper()
    
    @validator("icon")
    def validate_icon(cls, v):
        if v is None:
            return v
        if len(v.strip()) > 50:
            raise ValueError("Icon identifier must be 50 characters or less")
        return v.strip()
    
    @validator("sort_order")
    def validate_sort_order(cls, v):
        if v < 0:
            raise ValueError("Sort order must be non-negative")
        return v


class PaymentMethodCreate(PaymentMethodBase):
    """Schema for creating a payment method"""
    pass


class PaymentMethodUpdate(PaymentMethodBase):
    """Schema for updating a payment method"""
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class PaymentMethodInDBBase(PaymentMethodBase):
    """Base schema for payment method in database"""
    id: str
    user_id: str
    is_default: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @validator("id", "user_id", pre=True)
    def convert_uuid_to_string(cls, v):
        """Convert UUID objects to strings"""
        if v is None:
            return v
        return str(v)
    
    class Config:
        from_attributes = True


class PaymentMethod(PaymentMethodInDBBase):
    """Schema for payment method response"""
    can_delete: bool = True


class PaymentMethodWithStats(PaymentMethod):
    """Payment method with usage statistics"""
    expense_count: int = 0
    total_amount: float = 0.0
    last_used: Optional[datetime] = None


class BulkPaymentMethodUpdate(BaseModel):
    """Schema for bulk updating payment method order"""
    payment_methods: List[dict]  # [{"id": "uuid", "sort_order": 1}, ...]
    
    @validator("payment_methods")
    def validate_payment_methods(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one payment method is required")
        
        for item in v:
            if "id" not in item or "sort_order" not in item:
                raise ValueError("Each item must have 'id' and 'sort_order'")
            try:
                uuid.UUID(item["id"])
            except (ValueError, TypeError):
                raise ValueError("Invalid payment method ID format")
            if not isinstance(item["sort_order"], int) or item["sort_order"] < 0:
                raise ValueError("Sort order must be a non-negative integer")
        
        return v


# Default payment methods data
DEFAULT_PAYMENT_METHODS = [
    {
        "name": "Cash",
        "description": "Physical cash payments",
        "icon": "banknote",
        "color": "#10B981",  # Green
        "sort_order": 1,
        "is_default": True
    },
    {
        "name": "Card",
        "description": "Credit or debit card payments",
        "icon": "credit-card",
        "color": "#3B82F6",  # Blue
        "sort_order": 2,
        "is_default": True
    },
    {
        "name": "Bank Transfer",
        "description": "Bank transfer or wire payments",
        "icon": "building-columns",
        "color": "#8B5CF6",  # Purple
        "sort_order": 3,
        "is_default": True
    },
    {
        "name": "Other",
        "description": "Other payment methods",
        "icon": "ellipsis-horizontal-circle",
        "color": "#6B7280",  # Gray
        "sort_order": 4,
        "is_default": True
    }
]
