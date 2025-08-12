"""
Expense model for tracking individual expenses
"""

from typing import Any
from sqlalchemy import Column, String, Date, Boolean, ForeignKey, Text, CheckConstraint, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from decimal import Decimal
from datetime import date, datetime
import uuid

from app.core.database import Base


class Expense(Base):
    """Expense model for individual expense records"""
    
    __tablename__ = "expenses"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic expense information
    amount = Column(String, nullable=False)  # Store as string to preserve precision
    currency = Column(String(3), ForeignKey("currencies.code"), nullable=False, index=True)
    amount_in_base_currency = Column(String, nullable=True)  # Converted amount
    exchange_rate = Column(String, nullable=True)  # Rate used for conversion
    description = Column(String(500), nullable=False)
    expense_date = Column(Date, nullable=False, index=True)
    
    # Relationships
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    
    # Additional information
    payment_method = Column(String(50), nullable=True)  # Legacy: 'cash', 'card', 'bank_transfer', 'other'
    payment_method_id = Column(UUID(as_uuid=True), ForeignKey("user_payment_methods.id"), nullable=True, index=True)
    receipt_url = Column(String(500), nullable=True)  # File path or URL
    notes = Column(Text, nullable=True)
    location = Column(String(200), nullable=True)
    vendor = Column(String(200), nullable=True)
    
    # Shared expenses
    is_shared = Column(Boolean, default=False, nullable=False, index=True)
    shared_with = Column(JSON, nullable=True)  # Array of user IDs
    
    # Tags
    tags = Column(JSON, nullable=True)  # Array of tags
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="expenses")
    category = relationship("Category", foreign_keys=[category_id], back_populates="expenses")
    subcategory = relationship("Category", foreign_keys=[subcategory_id], overlaps="subcategory_expenses")
    currency_obj = relationship("Currency", back_populates="expenses")
    payment_method_obj = relationship("UserPaymentMethod", back_populates="expenses")
    attachments = relationship("ExpenseAttachment", back_populates="expense", lazy="dynamic")
    shared_expense_records = relationship("SharedExpense", back_populates="expense", lazy="dynamic")
    expense_shares = relationship("ExpenseShare", back_populates="expense", lazy="select", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint("CAST(amount AS NUMERIC) > 0", name="positive_amount"),
    )
    
    @property
    def amount_decimal(self) -> Decimal:
        """Get amount as Decimal"""
        return Decimal(self.amount)
    
    @property
    def amount_in_base_currency_decimal(self) -> Decimal:
        """Get base currency amount as Decimal"""
        if self.amount_in_base_currency:
            return Decimal(self.amount_in_base_currency)
        return self.amount_decimal
    
    @property
    def exchange_rate_decimal(self) -> Decimal:
        """Get exchange rate as Decimal"""
        if self.exchange_rate:
            return Decimal(self.exchange_rate)
        return Decimal("1.0")
    
    def get_display_amount(self, currency_code: str = None) -> tuple[Decimal, str]:
        """Get amount in specified currency for display"""
        if currency_code and currency_code != self.currency:
            # Return converted amount
            return self.amount_in_base_currency_decimal, currency_code
        return self.amount_decimal, self.currency
    
    def add_tag(self, tag: str):
        """Add a tag to the expense"""
        if not self.tags:
            self.tags = []
        if tag not in self.tags:
            self.tags.append(tag)
    
    def remove_tag(self, tag: str):
        """Remove a tag from the expense"""
        if self.tags and tag in self.tags:
            self.tags.remove(tag)
    
    def get_user_share_amount(self, user_id: Any) -> Decimal:
        """Get the amount this user owes for this shared expense"""
        if not self.is_shared:
            # Not shared, user pays full amount if they're the owner
            return self.amount_in_base_currency_decimal if str(self.user_id) == str(user_id) else Decimal("0")
        
        # Find user's share in expense_shares
        for share in self.expense_shares:
            if str(share.user_id) == str(user_id):
                return share.share_amount_decimal
        
        # For shared expenses, if user has no explicit share, they owe nothing
        return Decimal("0")
    
    def get_user_share_percentage(self, user_id: Any) -> Decimal:
        """Get the percentage this user owes for this shared expense"""
        if not self.is_shared:
            return Decimal("100") if str(self.user_id) == str(user_id) else Decimal("0")
        
        # Find user's share in expense_shares
        for share in self.expense_shares:
            if str(share.user_id) == str(user_id):
                return share.share_percentage_decimal
        
        # For shared expenses, if user has no explicit share, they owe 0%
        return Decimal("0")
    
    def calculate_share_amounts(self):
        """Recalculate all share amounts based on current percentages"""
        total_amount = self.amount_in_base_currency_decimal
        total_participants = self.expense_shares.count()
        
        for share in self.expense_shares:
            share.update_share_amount(total_amount, total_participants)
    
    def get_total_shared_percentage(self) -> Decimal:
        """Get total percentage allocated across all shares"""
        total = Decimal("0")
        for share in self.expense_shares:
            total += share.share_percentage_decimal
        return total
    
    def is_fully_allocated(self) -> bool:
        """Check if all shares add up to 100%"""
        return self.get_total_shared_percentage() == Decimal("100")
    
    def __repr__(self) -> str:
        return f"<Expense(amount='{self.amount}', currency='{self.currency}', description='{self.description[:50]}...')>"


class ExpenseAttachment(Base):
    """Model for expense attachments (receipts, etc.)"""
    
    __tablename__ = "expense_attachments"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(String, nullable=False)  # Store as string for large files
    mime_type = Column(String(100), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    expense = relationship("Expense", back_populates="attachments")
    
    @property
    def file_size_int(self) -> int:
        """Get file size as integer"""
        return int(self.file_size)
    
    def __repr__(self) -> str:
        return f"<ExpenseAttachment(filename='{self.filename}', expense_id='{self.expense_id}')>"


class SharedExpense(Base):
    """Model for tracking shared expenses between users"""
    
    __tablename__ = "shared_expenses"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False, index=True)
    shared_with_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount_owed = Column(String, nullable=False)  # Amount this user owes
    share_percentage = Column(String, nullable=False, default="0")  # Percentage of the total expense (0-100)
    share_amount = Column(String, nullable=False)  # Calculated amount based on percentage
    currency = Column(String(3), ForeignKey("currencies.code"), nullable=False)
    is_settled = Column(Boolean, default=False, nullable=False, index=True)
    settled_at = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    expense = relationship("Expense", back_populates="shared_expense_records")
    shared_with_user = relationship("User")
    currency_obj = relationship("Currency")
    
    @property
    def amount_owed_decimal(self) -> Decimal:
        """Get amount owed as Decimal"""
        return Decimal(self.amount_owed)
    
    @property
    def share_percentage_decimal(self) -> Decimal:
        """Get share percentage as Decimal"""
        return Decimal(self.share_percentage)
    
    @property
    def share_amount_decimal(self) -> Decimal:
        """Get share amount as Decimal"""
        return Decimal(self.share_amount)
    
    def calculate_share_amount(self, total_expense_amount: Decimal) -> Decimal:
        """Calculate share amount based on percentage and total expense amount"""
        share_amount = (self.share_percentage_decimal / Decimal("100")) * total_expense_amount
        return share_amount.quantize(Decimal("0.01"))  # Round to 2 decimal places
    
    def update_share_amount(self, total_expense_amount: Decimal):
        """Update share amount based on current percentage"""
        self.share_amount = str(self.calculate_share_amount(total_expense_amount))
    
    def settle(self):
        """Mark the shared expense as settled"""
        self.is_settled = True
        self.settled_at = date.today()
    
    def __repr__(self) -> str:
        return f"<SharedExpense(expense_id='{self.expense_id}', user_id='{self.shared_with_user_id}', amount='{self.amount_owed}', share='{self.share_percentage}%')>"


class ExpenseShare(Base):
    """Model for configuring shared expense participants and their shares"""
    
    __tablename__ = "expense_shares"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    share_percentage = Column(String, nullable=False)  # User's percentage of the expense (0-100)
    share_amount = Column(String, nullable=False)  # Calculated amount based on percentage
    currency = Column(String(3), ForeignKey("currencies.code"), nullable=False)
    
    # Custom share configuration
    share_type = Column(String(20), nullable=False, default="percentage")  # 'percentage', 'fixed_amount', 'equal'
    custom_amount = Column(String, nullable=True)  # For fixed amount shares
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    expense = relationship("Expense", back_populates="expense_shares")
    user = relationship("User")
    currency_obj = relationship("Currency")
    
    # Constraints - ensure one share per user per expense
    __table_args__ = (
        CheckConstraint("CAST(share_percentage AS NUMERIC) >= 0 AND CAST(share_percentage AS NUMERIC) <= 100", name="valid_share_percentage"),
        CheckConstraint("share_type IN ('percentage', 'fixed_amount', 'equal')", name="valid_share_type"),
    )
    
    @property
    def share_percentage_decimal(self) -> Decimal:
        """Get share percentage as Decimal"""
        return Decimal(self.share_percentage)
    
    @property
    def share_amount_decimal(self) -> Decimal:
        """Get share amount as Decimal"""
        return Decimal(self.share_amount)
    
    @property
    def custom_amount_decimal(self) -> Decimal:
        """Get custom amount as Decimal"""
        return Decimal(self.custom_amount) if self.custom_amount else Decimal("0")
    
    def calculate_share_amount(self, total_expense_amount: Decimal, total_participants: int = 1) -> Decimal:
        """Calculate share amount based on share type"""
        if self.share_type == "equal":
            # Equal split among all participants
            return (total_expense_amount / Decimal(total_participants)).quantize(Decimal("0.01"))
        elif self.share_type == "fixed_amount":
            # Fixed custom amount
            return self.custom_amount_decimal
        else:  # percentage
            # Percentage-based split
            share_amount = (self.share_percentage_decimal / Decimal("100")) * total_expense_amount
            return share_amount.quantize(Decimal("0.01"))
    
    def update_share_amount(self, total_expense_amount: Decimal, total_participants: int = 1):
        """Update share amount based on current configuration"""
        calculated_amount = self.calculate_share_amount(total_expense_amount, total_participants)
        self.share_amount = str(calculated_amount)
        
        # Update percentage if using fixed amount or equal split
        if self.share_type in ["fixed_amount", "equal"]:
            if total_expense_amount > 0:
                percentage = (calculated_amount / total_expense_amount) * Decimal("100")
                self.share_percentage = str(percentage.quantize(Decimal("0.01")))
    
    def __repr__(self) -> str:
        return f"<ExpenseShare(expense_id='{self.expense_id}', user_id='{self.user_id}', type='{self.share_type}', share='{self.share_percentage}%')>"