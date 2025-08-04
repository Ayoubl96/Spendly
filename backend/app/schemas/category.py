"""
Category Pydantic schemas
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, validator
from decimal import Decimal


class CategoryBase(BaseModel):
    """Base category schema"""
    name: str
    parent_id: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class CategoryCreate(CategoryBase):
    """Schema for creating a category"""
    
    @validator("name")
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Category name must be at least 2 characters long")
        return v.strip()
    
    @validator("color")
    def validate_color(cls, v):
        if v and not v.startswith("#") or len(v) != 7:
            raise ValueError("Color must be a valid hex color code (e.g., #FF0000)")
        return v
    
    @validator("sort_order")
    def validate_sort_order(cls, v):
        if v < 0:
            raise ValueError("Sort order must be non-negative")
        return v


class CategoryUpdate(CategoryBase):
    """Schema for updating a category"""
    name: Optional[str] = None
    parent_id: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryInDBBase(CategoryBase):
    """Base schema for category in database"""
    id: str
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @validator("id", "user_id", "parent_id", pre=True)
    def convert_uuid_to_string(cls, v):
        """Convert UUID objects to strings"""
        if v is None:
            return v
        return str(v)
    
    class Config:
        from_attributes = True


class Category(CategoryInDBBase):
    """Schema for category response"""
    pass


class CategoryWithStats(Category):
    """Category with usage statistics"""
    expense_count: int = 0
    total_amount: Decimal = Decimal("0")
    subcategory_count: int = 0


class CategoryTree(BaseModel):
    """Schema for hierarchical category tree"""
    id: str
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
    expense_count: int = 0
    total_amount: Decimal = Decimal("0")
    subcategories: List["CategoryTree"] = []


class CategoryHierarchy(BaseModel):
    """Schema for category with parent information"""
    id: str
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
    parent: Optional[Category] = None
    full_path: str
    is_primary: bool
    is_subcategory: bool


class CategoryReorder(BaseModel):
    """Schema for reordering categories"""
    category_id: str
    sort_order: int


class CategoryBulkReorder(BaseModel):
    """Schema for bulk reordering categories"""
    categories: List[CategoryReorder]


# Update forward reference
CategoryTree.model_rebuild()