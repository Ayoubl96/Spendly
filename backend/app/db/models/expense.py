"""
Expense model for tracking individual expenses
"""

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
    
    def settle(self):
        """Mark the shared expense as settled"""
        self.is_settled = True
        self.settled_at = date.today()
    
    def __repr__(self) -> str:
        return f"<SharedExpense(expense_id='{self.expense_id}', user_id='{self.shared_with_user_id}', amount='{self.amount_owed}')>"