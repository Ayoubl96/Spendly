"""
Budget model for budget tracking and alerts
"""

from sqlalchemy import Column, String, Date, Boolean, ForeignKey, CheckConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from decimal import Decimal
from datetime import date, datetime
import uuid

from app.core.database import Base


class Budget(Base):
    """Budget model for tracking spending limits"""
    
    __tablename__ = "budgets"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Budget information
    name = Column(String(200), nullable=False)
    amount = Column(String, nullable=False)  # Store as string to preserve precision
    currency = Column(String(3), ForeignKey("currencies.code"), nullable=False, index=True)
    
    # Period information
    period_type = Column(String(20), nullable=False)  # 'monthly', 'yearly', 'weekly', 'custom'
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True, index=True)
    
    # Relationships
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True)
    budget_group_id = Column(UUID(as_uuid=True), ForeignKey("budget_groups.id"), nullable=True, index=True)
    
    # Settings
    alert_threshold = Column(String, default="80.0", nullable=False)  # Alert at X% of budget
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")
    currency_obj = relationship("Currency", back_populates="budgets")
    budget_group = relationship("BudgetGroup", back_populates="budgets")
    
    # Constraints
    __table_args__ = (
        CheckConstraint("CAST(amount AS NUMERIC) > 0", name="positive_budget_amount"),
        CheckConstraint("CAST(alert_threshold AS NUMERIC) > 0 AND CAST(alert_threshold AS NUMERIC) <= 100", name="valid_alert_threshold"),
        CheckConstraint("end_date IS NULL OR end_date > start_date", name="valid_date_range"),
    )
    
    @property
    def amount_decimal(self) -> Decimal:
        """Get budget amount as Decimal"""
        return Decimal(self.amount)
    
    @property
    def alert_threshold_decimal(self) -> Decimal:
        """Get alert threshold as Decimal"""
        return Decimal(self.alert_threshold)
    
    @property
    def alert_amount(self) -> Decimal:
        """Get the amount at which to trigger alerts"""
        return self.amount_decimal * (self.alert_threshold_decimal / 100)
    
    def is_current_period(self, check_date: date = None) -> bool:
        """Check if the budget is active for the given date"""
        if check_date is None:
            check_date = date.today()
        
        if check_date < self.start_date:
            return False
        
        if self.end_date and check_date > self.end_date:
            return False
        
        return True
    
    def get_spent_amount(self, db) -> Decimal:
        """Get total amount spent against this budget"""
        from app.db.models.expense import Expense
        from sqlalchemy import func, Numeric
        
        query = db.query(func.sum(func.cast(Expense.amount_in_base_currency, Numeric))).filter(
            Expense.user_id == self.user_id,
            Expense.expense_date >= self.start_date
        )
        
        if self.end_date:
            query = query.filter(Expense.expense_date <= self.end_date)
        
        if self.category_id:
            query = query.filter(Expense.category_id == self.category_id)
        
        result = query.scalar()
        return Decimal(str(result)) if result else Decimal("0")
    
    def get_remaining_amount(self, db) -> Decimal:
        """Get remaining budget amount"""
        spent = self.get_spent_amount(db)
        return self.amount_decimal - spent
    
    def get_percentage_used(self, db) -> Decimal:
        """Get percentage of budget used"""
        spent = self.get_spent_amount(db)
        if self.amount_decimal == 0:
            return Decimal("0")
        return (spent / self.amount_decimal) * 100
    
    def is_over_budget(self, db) -> bool:
        """Check if budget is exceeded"""
        return self.get_spent_amount(db) > self.amount_decimal
    
    def should_alert(self, db) -> bool:
        """Check if budget should trigger an alert"""
        percentage_used = self.get_percentage_used(db)
        return percentage_used >= self.alert_threshold_decimal
    
    def get_status(self, db) -> str:
        """Get budget status: 'on_track', 'warning', 'over_budget'"""
        if self.is_over_budget(db):
            return "over_budget"
        elif self.should_alert(db):
            return "warning"
        else:
            return "on_track"
    
    def __repr__(self) -> str:
        return f"<Budget(name='{self.name}', amount='{self.amount}', period='{self.period_type}')>"