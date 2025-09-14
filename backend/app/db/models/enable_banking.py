import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from app.db.base import Base
from sqlalchemy import Column, String, Date, Boolean, ForeignKey, Text, JSON, DateTime, UniqueConstraint, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


class BankConnectionStatus(str, Enum):
    #Bank connection status mapping
    ACTIVE = "AUTHORIZED"
    EXPIRED = "expired"
    REVOKED = "revoked"
    ERROR = "error"
    PENDING = "pending"


class BankConnection(Base):
    # Model for sorting user's bank connections via Enable Banking
    __tablename__ = "bank_connections"

    # primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # User relationship
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Bank information
    bank_name = Column(String(100), nullable=False)
    bank_code = Column(String(50), nullable=False)
    country_code = Column(String(2), nullable=False, default="IT")

    # Enable Banking session data
    session_id = Column(String(255), nullable=False, unique=False, index=True)
    account_uid = Column(String(255), nullable=False, unique=True, index=True)
    token_expires_at = Column(DateTime, nullable=True)

    # Connection metadata
    status = Column(String(20), nullable=False, default=BankConnectionStatus.PENDING)
    last_sync_at = Column(DateTime, nullable=True)
    next_sync_at = Column(DateTime, nullable=True)
    sync_enabled = Column(Boolean, nullable=False, default=True)
    telegram_notification = Column(Boolean, default=True, nullable=True)
    telegram_chat_id = Column(String, nullable=True)

    # Error tracking
    last_error = Column(Text, nullable=True)
    error_count = Column(Integer, nullable=False, default=0)

    # Additional settings
    auto_categorize = Column(Boolean, nullable=False, default=True)
    import_start_date = Column(Date, nullable=True)

    # Timestaps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationship
    user = relationship("User", back_populates="bank_connections")
    accounts = relationship("BankAccount", back_populates="connection", cascade="all, delete-orphan")

    def is_token_expired(self):
        if not self.token_expires_at:
            return False
        return datetime.utcnow() >= self.token_expires_at

    def __repr__(self):
        return f"<BankConnection(id={self.bank_name}, user_id={self.user_id}, status='{self.status}')>"

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)

    # Relationships
    connection_id = Column(UUID(as_uuid=True), ForeignKey("bank_connections.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Account information from Enable Banking
    external_account_id = Column(String(255), nullable=False)
    account_name = Column(String(255), nullable=True)
    account_number = Column(String(100), nullable=True)
    iban = Column(String(50), nullable=True)
    account_type = Column(String(50), nullable=True)
    currency = Column(String(3), ForeignKey("currencies.code"), nullable=False)

    # Balances
    current_balance = Column(String, nullable=True)
    available_balance = Column(String, nullable=True)
    last_balance_update = Column(DateTime, nullable=True)

    # Import settings
    import_enabled = Column(Boolean, default=False)
    last_transaction_sync = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    connection = relationship("BankConnection", back_populates="accounts")
    user = relationship("User")
    currency_obj = relationship("Currency")
    transactions = relationship("ImportedTransaction", back_populates="account", cascade="all, delete-orphan")

    # Unique constraint on external_account_id per connection
    __table_args__ = (
        UniqueConstraint('connection_id', 'external_account_id', name='uq_connection_external_account'),
    )

    @property
    def current_balance_decimal(self) -> Optional[Decimal]:
        """Get current balance as Decimal"""
        return Decimal(self.current_balance) if self.current_balance else None

    @property
    def available_balance_decimal(self) -> Optional[Decimal]:
        """Get available balance as Decimal"""
        return Decimal(self.available_balance) if self.available_balance else None

    def __repr__(self) -> str:
        return f"<BankAccount(name='{self.account_name}', type='{self.account_type}', currency='{self.currency}')>"


class ImportedTransaction(Base):
    __tablename__ = "imported_transactions"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Relationship
    account_id = Column(UUID(as_uuid=True), ForeignKey('bank_accounts.id'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    expense_id = Column(UUID(as_uuid=True), ForeignKey('expenses.id'), nullable=False, index=True)

    # Transaction details
    amount = Column(String, nullable=False)
    currency = Column(String(3), ForeignKey('currencies.code'), nullable=False)
    transaction_date = Column(Date, nullable=False, index=True)
    booking_date = Column(Date, nullable=True)
    value_date = Column(Date, nullable=True)

    # Description
    description = Column(Text, nullable=False)
    merchant_name = Column(String(255), nullable=True)
    merchant_category_code = Column(String(10), nullable=True) # MCC Code

    # Bank's categorization if exist
    bank_category = Column(String(100), nullable=True)
    transaction_type = Column(String(10), nullable=False, index=True)

    # processing status
    is_processed = Column(Boolean, nullable=False, default=False, index=True)
    is_duplicate = Column(Boolean, nullable=True, default=False)
    processing_error = Column(Text, nullable=True)

    # Auto-categorization result
    suggested_category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'), nullable=True)
    category_confidence = Column(String, nullable=True)

    # Raw data from API
    raw_data = Column(JSON, nullable=True)

    # Timestamps
    imported_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)

    # Relationships
    account = relationship("BankAccount", back_populates="transactions")
    user = relationship("User")
    expense = relationship("Expense")
    currency_obj = relationship("Currency")
    suggested_category = relationship("Category")

    @property
    def amount_decimal(self) -> Decimal:
        """Get amount as Decimal"""
        return Decimal(self.amount)

    @property
    def is_expense(self) -> bool:
        """Check if this is an expense (negative amount)"""
        return self.amount_decimal < 0

    def generate_fingerprint(self) -> str:
        """
        Generate unique fingerprint for deduplication
        Since transaction_id is often null, we create our own
        """
        import hashlib

        # Combine key fields that make a transaction unique
        fingerprint_data = f"{self.account_id}_{self.amount}_{self.transaction_date}_{self.description[:100]}"

        # Add booking date if available for extra uniqueness
        if self.booking_date:
            fingerprint_data += f"_{self.booking_date}"

        return hashlib.sha256(fingerprint_data.encode()).hexdigest()

    def to_expense_dict(self) -> dict:
        """Convert to expense creation dictionary"""
        return {
            "amount": str(abs(self.amount_decimal)),  # Make positive for expense
            "currency": self.currency,
            "description": self.description or f"Bank transaction from {self.merchant_name or 'Unknown'}",
            "expense_date": self.transaction_date,
            "vendor": self.merchant_name,
            "category_id": self.suggested_category_id,
            "payment_method": "bank_transfer",
            "notes": f"Imported from {self.account.connection.bank_name} on {self.imported_at.date()}",
            "tags": ["imported", "bank_sync"]
        }

    def __repr__(self) -> str:
        return f"<ImportedTransaction(amount='{self.amount}', date='{self.transaction_date}', desc='{self.description[:50]}...')>"

class TransactionImportLog(Base):
    __tablename__ = "transaction_import_logs"

    # PrimaryKey
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Job information
    connection_id = Column(UUID(as_uuid=True), ForeignKey('bank_connections.id'), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)

    # Import statistics

    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    status = Column(String(20), nullable=False)

    transaction_fetched = Column(Integer, nullable=False, default=0)
    transaction_imported = Column(Integer, nullable=False, default=0)
    transaction_skipped = Column(Integer, nullable=False, default=0)
    expenses_created = Column(Integer, nullable=False, default=0)

    # Error tracking

    error_message = Column(Text, nullable=True)

    # Relationships
    bank_connection = relationship("BankConnection")
    user = relationship("User")

    def __repr__(self) -> str:
        return f"<TransactionImportLog(connection_id='{self.connection_id}', status='{self.status}', imported={self.transactions_imported})>"
