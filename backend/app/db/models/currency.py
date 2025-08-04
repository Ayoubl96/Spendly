"""
Currency model for multi-currency support
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base


class Currency(Base):
    """Currency model for supported currencies"""
    
    __tablename__ = "currencies"
    
    # Primary key is the currency code (EUR, USD, etc.)
    code = Column(String(3), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    symbol = Column(String(10), nullable=False)
    decimal_places = Column(Integer, default=2, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    expenses = relationship("Expense", back_populates="currency_obj", lazy="dynamic")
    budgets = relationship("Budget", back_populates="currency_obj", lazy="dynamic")
    exchange_rates_from = relationship(
        "ExchangeRate", 
        foreign_keys="ExchangeRate.from_currency",
        back_populates="from_currency_obj",
        lazy="dynamic"
    )
    exchange_rates_to = relationship(
        "ExchangeRate",
        foreign_keys="ExchangeRate.to_currency", 
        back_populates="to_currency_obj",
        lazy="dynamic"
    )
    
    def __repr__(self) -> str:
        return f"<Currency(code='{self.code}', name='{self.name}', symbol='{self.symbol}')>"


class ExchangeRate(Base):
    """Exchange rate model for currency conversion"""
    
    __tablename__ = "exchange_rates"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    from_currency = Column(String(3), ForeignKey("currencies.code"), nullable=False, index=True)
    to_currency = Column(String(3), ForeignKey("currencies.code"), nullable=False, index=True)
    rate = Column(String, nullable=False)  # Using String to store Decimal as text
    rate_date = Column(DateTime, nullable=False, index=True)
    source = Column(String(50), default="manual", nullable=False)  # 'api', 'manual'
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    from_currency_obj = relationship(
        "Currency",
        foreign_keys=[from_currency],
        back_populates="exchange_rates_from"
    )
    to_currency_obj = relationship(
        "Currency", 
        foreign_keys=[to_currency],
        back_populates="exchange_rates_to"
    )
    
    def __repr__(self) -> str:
        return f"<ExchangeRate({self.from_currency}/{self.to_currency}: {self.rate})>"