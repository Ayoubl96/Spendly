"""
Category model for expense categorization (primary and secondary)
"""

from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base


class Category(Base):
    """Category model for organizing expenses"""
    
    __tablename__ = "categories"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Category information
    name = Column(String(100), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Display settings
    color = Column(String(7), nullable=True)  # Hex color code #RRGGBB
    icon = Column(String(50), nullable=True)  # Icon identifier
    sort_order = Column(Integer, default=0, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="categories")
    parent = relationship("Category", remote_side="Category.id", backref="subcategories")
    expenses = relationship("Expense", foreign_keys="Expense.category_id", back_populates="category", lazy="dynamic")
    subcategory_expenses = relationship("Expense", foreign_keys="Expense.subcategory_id", lazy="dynamic")
    budgets = relationship("Budget", back_populates="category", lazy="dynamic")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("user_id", "name", "parent_id", name="uq_user_category_name"),
    )
    
    @property
    def is_primary_category(self) -> bool:
        """Check if this is a primary category (no parent)"""
        return self.parent_id is None
    
    @property
    def is_subcategory(self) -> bool:
        """Check if this is a subcategory (has parent)"""
        return self.parent_id is not None
    
    @property
    def full_path(self) -> str:
        """Get full category path (Parent > Child)"""
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name
    
    def get_expense_count(self, db) -> int:
        """Get count of expenses in this category"""
        return self.expenses.count()
    
    def get_total_amount(self, db) -> float:
        """Get total amount of expenses in this category"""
        from sqlalchemy import func
        from app.db.models.expense import Expense
        
        total = db.query(func.sum(func.cast(Expense.amount_in_base_currency, db.Numeric))).filter(
            Expense.category_id == self.id
        ).scalar()
        return float(total) if total else 0.0
    
    def __repr__(self) -> str:
        return f"<Category(name='{self.name}', user_id='{self.user_id}')>"