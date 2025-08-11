"""
User Payment Method model for custom payment methods per user
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base


class UserPaymentMethod(Base):
    """Model for user-specific payment methods"""
    
    __tablename__ = "user_payment_methods"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # User relationship
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Payment method information
    name = Column(String(100), nullable=False)  # e.g., "My Credit Card", "Cash", "PayPal"
    description = Column(Text, nullable=True)   # Optional description
    icon = Column(String(50), nullable=True)    # Icon identifier (e.g., "credit-card", "banknote")
    color = Column(String(7), nullable=True)    # Hex color code (e.g., "#3B82F6")
    
    # Display and sorting
    sort_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_default = Column(Boolean, default=False, nullable=False)  # System defaults
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="payment_methods")
    expenses = relationship("Expense", back_populates="payment_method_obj")
    
    @property
    def can_delete(self) -> bool:
        """Check if payment method can be deleted (not used in expenses)"""
        return len(self.expenses) == 0
    
    def soft_delete(self):
        """Soft delete by marking as inactive"""
        self.is_active = False
    
    def __repr__(self) -> str:
        return f"<UserPaymentMethod(name='{self.name}', user_id='{self.user_id}', active='{self.is_active}')>"
