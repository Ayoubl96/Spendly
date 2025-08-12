"""
Budget Group model for umbrella budget management
"""

from sqlalchemy import Column, String, Date, Boolean, ForeignKey, CheckConstraint, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from decimal import Decimal
from datetime import date, datetime
import uuid

from app.core.database import Base


class BudgetGroup(Base):
    """Budget Group model for umbrella budget management"""
    
    __tablename__ = "budget_groups"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Budget group information
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Period information
    period_type = Column(String(20), nullable=False)  # 'monthly', 'yearly', 'quarterly', 'custom'
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    
    # Base currency for the group
    currency = Column(String(3), ForeignKey("currencies.code"), nullable=False, index=True)
    
    # Relationships
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Settings
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="budget_groups")
    # Use non-dynamic loading so eager loaders (joinedload/selectinload) can populate
    budgets = relationship("Budget", back_populates="budget_group", lazy="selectin")
    currency_obj = relationship("Currency", back_populates="budget_groups")
    
    # Constraints
    __table_args__ = (
        CheckConstraint("end_date > start_date", name="valid_budget_group_date_range"),
    )
    
    @property
    def total_budgeted_amount(self) -> Decimal:
        """Get total budgeted amount across all budgets in this group"""
        total = sum(budget.amount_decimal for budget in self.budgets if budget.is_active)
        return Decimal(str(total))
    
    def get_total_spent_amount(self, db) -> Decimal:
        """Get total amount spent across all budgets in this group"""
        total_spent = Decimal("0")
        for budget in self.budgets:
            if budget.is_active:
                total_spent += budget.get_spent_amount(db)
        return total_spent
    
    def get_remaining_amount(self, db) -> Decimal:
        """Get total remaining amount across all budgets in this group"""
        return self.total_budgeted_amount - self.get_total_spent_amount(db)
    
    def get_percentage_used(self, db) -> Decimal:
        """Get percentage of total budget used"""
        total_budgeted = self.total_budgeted_amount
        if total_budgeted == 0:
            return Decimal("0")
        total_spent = self.get_total_spent_amount(db)
        return (total_spent / total_budgeted) * 100
    
    def get_status(self, db) -> str:
        """Get overall budget group status"""
        percentage_used = self.get_percentage_used(db)
        total_spent = self.get_total_spent_amount(db)
        total_budgeted = self.total_budgeted_amount
        
        if total_spent > total_budgeted:
            return "over_budget"
        elif percentage_used >= 80:  # Default alert threshold
            return "warning"
        else:
            return "on_track"
    
    def get_category_summary(self, db):
        """Get summary grouped by main categories and subcategories"""
        from app.db.models.category import Category
        from sqlalchemy import func
        
        # Get all budgets in this group with their categories
        category_summaries = {}
        
        for budget in self.budgets:
            if not budget.is_active or not budget.category:
                continue
                
            category = budget.category
            spent_amount = budget.get_spent_amount(db)
            
            # Determine if this is a main category or subcategory
            if category.is_primary_category:
                # This is a main category
                main_category_name = category.name
                subcategory_name = None
            else:
                # This is a subcategory
                main_category_name = category.parent.name if category.parent else "Uncategorized"
                subcategory_name = category.name
            
            # Initialize main category if not exists
            if main_category_name not in category_summaries:
                # For main categories, use the main category ID (parent if this is a subcategory, or the category itself if it's already main)
                main_category_id = category.parent.id if category.parent else category.id
                category_summaries[main_category_name] = {
                    "categoryId": main_category_id,
                    "categoryName": main_category_name,
                    "budgeted": Decimal("0"),        # Main category's own budget
                    "spent": Decimal("0"),           # Main category's own spent
                    "remaining": Decimal("0"),       # Main category's own remaining
                    "total_budgeted": Decimal("0"),  # Total including subcategories
                    "total_spent": Decimal("0"),     # Total spent including subcategories
                    "total_remaining": Decimal("0"), # Total remaining including subcategories
                    "subcategories": {}
                }
            
            main_cat = category_summaries[main_category_name]
            
            if subcategory_name:
                # This is a subcategory budget
                if subcategory_name not in main_cat["subcategories"]:
                    main_cat["subcategories"][subcategory_name] = {
                        "categoryId": category.id,
                        "categoryName": subcategory_name,
                        "budgeted": Decimal("0"),
                        "spent": Decimal("0"),
                        "remaining": Decimal("0")
                    }
                
                subcat = main_cat["subcategories"][subcategory_name]
                subcat["budgeted"] += budget.amount_decimal
                subcat["spent"] += spent_amount
                subcat["remaining"] = subcat["budgeted"] - subcat["spent"]
                
                # Add subcategory amounts to main category totals only
                main_cat["total_budgeted"] += budget.amount_decimal
                main_cat["total_spent"] += spent_amount
            else:
                # This is a main category budget (not a subcategory)
                main_cat["budgeted"] += budget.amount_decimal
                main_cat["spent"] += spent_amount
                main_cat["remaining"] = main_cat["budgeted"] - main_cat["spent"]
                
                # Also add to totals
                main_cat["total_budgeted"] += budget.amount_decimal
                main_cat["total_spent"] += spent_amount
            
            # Update total remaining for main category
            main_cat["total_remaining"] = main_cat["total_budgeted"] - main_cat["total_spent"]
        
        return category_summaries
    
    def is_current_period(self, check_date: date = None) -> bool:
        """Check if the budget group is active for the given date"""
        if check_date is None:
            check_date = date.today()
        
        return self.start_date <= check_date <= self.end_date
    
    def __repr__(self) -> str:
        return f"<BudgetGroup(name='{self.name}', period='{self.period_type}', start='{self.start_date}')>"
