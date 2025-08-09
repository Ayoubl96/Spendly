"""
Categorization rule model for automatic expense categorization
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base


class CategorizationRule(Base):
    """Model for user-defined categorization rules"""
    
    __tablename__ = "categorization_rules"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Rule ownership
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Rule definition
    pattern = Column(String(200), nullable=False)  # Pattern to match (vendor, description, etc.)
    pattern_type = Column(String(20), nullable=False, default="contains")  # contains, exact, regex, starts_with
    field_to_match = Column(String(20), nullable=False, default="vendor")  # vendor, description, notes
    
    # Action
    category_id = Column(UUID(as_uuid=True), nullable=True)
    subcategory_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Rule metadata
    name = Column(String(100), nullable=False)  # Human readable rule name
    priority = Column(Integer, default=100, nullable=False)  # Lower number = higher priority
    is_active = Column(Boolean, default=True, nullable=False)
    confidence = Column(Integer, default=90, nullable=False)  # 0-100 confidence score
    
    # Usage statistics
    times_applied = Column(Integer, default=0, nullable=False)
    last_applied_at = Column(DateTime, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_categorization_rules_user_active', 'user_id', 'is_active'),
        Index('idx_categorization_rules_priority', 'priority'),
    )
    
    def matches(self, text: str) -> bool:
        """Check if this rule matches the given text"""
        if not text or not self.pattern:
            return False
            
        text = text.lower().strip()
        pattern = self.pattern.lower().strip()
        
        if self.pattern_type == "exact":
            return text == pattern
        elif self.pattern_type == "starts_with":
            return text.startswith(pattern)
        elif self.pattern_type == "regex":
            import re
            try:
                return bool(re.search(pattern, text, re.IGNORECASE))
            except re.error:
                return False
        else:  # contains (default)
            return pattern in text
    
    def apply_to_expense_data(self, expense_data: dict) -> dict:
        """Apply this rule to expense data and return categorization"""
        field_value = expense_data.get(self.field_to_match, "")
        
        if self.matches(field_value):
            return {
                "category_id": str(self.category_id) if self.category_id else None,
                "subcategory_id": str(self.subcategory_id) if self.subcategory_id else None,
                "rule_id": str(self.id),
                "rule_name": self.name,
                "confidence": self.confidence,
                "matched_text": field_value,
                "matched_pattern": self.pattern
            }
        return None
    
    def increment_usage(self):
        """Increment usage statistics"""
        self.times_applied += 1
        self.last_applied_at = datetime.utcnow()
    
    def __repr__(self) -> str:
        return f"<CategorizationRule(name='{self.name}', pattern='{self.pattern}')>"
