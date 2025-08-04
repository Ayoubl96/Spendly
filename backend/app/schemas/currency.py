"""
Currency Pydantic schemas
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, validator
from decimal import Decimal


class CurrencyBase(BaseModel):
    """Base currency schema"""
    name: str
    symbol: str
    decimal_places: int = 2
    is_active: bool = True


class CurrencyCreate(CurrencyBase):
    """Schema for creating a currency"""
    code: str
    
    @validator("code")
    def validate_code(cls, v):
        if not v or len(v) != 3:
            raise ValueError("Currency code must be exactly 3 characters")
        return v.upper()
    
    @validator("decimal_places")
    def validate_decimal_places(cls, v):
        if v < 0 or v > 10:
            raise ValueError("Decimal places must be between 0 and 10")
        return v


class CurrencyUpdate(CurrencyBase):
    """Schema for updating a currency"""
    name: Optional[str] = None
    symbol: Optional[str] = None
    decimal_places: Optional[int] = None
    is_active: Optional[bool] = None


class CurrencyInDBBase(CurrencyBase):
    """Base schema for currency in database"""
    code: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Currency(CurrencyInDBBase):
    """Schema for currency response"""
    pass


class CurrencyWithStats(Currency):
    """Currency with usage statistics"""
    expense_count: Optional[int] = 0
    total_amount: Optional[Decimal] = Decimal("0")


class ExchangeRateBase(BaseModel):
    """Base exchange rate schema"""
    from_currency: str
    to_currency: str
    rate: Decimal
    source: str = "manual"


class ExchangeRateCreate(ExchangeRateBase):
    """Schema for creating an exchange rate"""
    rate_date: datetime
    
    @validator("rate")
    def validate_rate(cls, v):
        if v <= 0:
            raise ValueError("Exchange rate must be positive")
        return v


class ExchangeRate(ExchangeRateBase):
    """Schema for exchange rate response"""
    id: str
    rate_date: datetime
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CurrencyConversion(BaseModel):
    """Schema for currency conversion request"""
    amount: Decimal
    from_currency: str
    to_currency: str
    
    @validator("amount")
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class CurrencyConversionResult(BaseModel):
    """Schema for currency conversion result"""
    original_amount: Decimal
    from_currency: str
    converted_amount: Decimal
    to_currency: str
    exchange_rate: Decimal
    rate_date: datetime