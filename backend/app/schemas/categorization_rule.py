"""
Categorization rule Pydantic schemas
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, validator
from enum import Enum


class PatternType(str, Enum):
    """Pattern matching types"""
    CONTAINS = "contains"
    EXACT = "exact"
    REGEX = "regex"
    STARTS_WITH = "starts_with"


class FieldToMatch(str, Enum):
    """Fields that can be matched"""
    VENDOR = "vendor"
    DESCRIPTION = "description"
    NOTES = "notes"


class CategorizationRuleBase(BaseModel):
    """Base categorization rule schema"""
    pattern: str
    pattern_type: PatternType = PatternType.CONTAINS
    field_to_match: FieldToMatch = FieldToMatch.VENDOR
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    name: str
    priority: int = 100
    is_active: bool = True
    confidence: int = 90
    notes: Optional[str] = None


class CategorizationRuleCreate(CategorizationRuleBase):
    """Schema for creating a categorization rule"""
    
    @validator("pattern")
    def validate_pattern(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Pattern must be at least 2 characters long")
        return v.strip()
    
    @validator("name")
    def validate_name(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError("Rule name must be at least 3 characters long")
        return v.strip()
    
    @validator("priority")
    def validate_priority(cls, v):
        if v < 1 or v > 1000:
            raise ValueError("Priority must be between 1 and 1000")
        return v
    
    @validator("confidence")
    def validate_confidence(cls, v):
        if v < 0 or v > 100:
            raise ValueError("Confidence must be between 0 and 100")
        return v
    
    @validator("category_id", "subcategory_id")
    def validate_category_ids(cls, v):
        if v is None or v == "":
            return None
        # Basic UUID format validation
        import uuid
        try:
            uuid.UUID(v)
            return v
        except (ValueError, TypeError):
            raise ValueError("Category ID must be a valid UUID or null")


class CategorizationRuleUpdate(CategorizationRuleBase):
    """Schema for updating a categorization rule"""
    pattern: Optional[str] = None
    name: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    confidence: Optional[int] = None


class CategorizationRuleInDBBase(CategorizationRuleBase):
    """Base schema for categorization rule in database"""
    id: str
    user_id: str
    times_applied: int = 0
    last_applied_at: Optional[datetime] = None
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


class CategorizationRule(CategorizationRuleInDBBase):
    """Schema for categorization rule response"""
    pass


class CategorizationRuleWithDetails(CategorizationRule):
    """Categorization rule with related information"""
    category: Optional[dict] = None
    subcategory: Optional[dict] = None


class RuleMatch(BaseModel):
    """Schema for rule match result"""
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    rule_id: str
    rule_name: str
    confidence: int
    matched_text: str
    matched_pattern: str


class CategorizationSuggestion(BaseModel):
    """Schema for categorization suggestion"""
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    category_name: Optional[str] = None
    subcategory_name: Optional[str] = None
    confidence: int
    reason: str  # "rule_match", "heuristic", "user_history"
    source: str  # Rule name or heuristic description


class BulkCategorizationRuleCreate(BaseModel):
    """Schema for creating multiple categorization rules"""
    rules: List[CategorizationRuleCreate]
    
    @validator("rules")
    def validate_rules(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one rule is required")
        if len(v) > 100:
            raise ValueError("Maximum 100 rules per batch")
        return v


class CategorizationRuleImport(BaseModel):
    """Schema for importing categorization rules from user actions"""
    vendor: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    create_vendor_rule: bool = True
    create_description_rule: bool = False
    rule_name: Optional[str] = None
    confidence: int = 85
