"""
Currencies API endpoints
"""

from typing import Any, List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.dependencies import get_db, get_current_user
from app.crud.crud_currency import currency_crud, exchange_rate_crud
from app.schemas.currency import Currency
from app.services.currency_service import CurrencyConversionService
from app.db.models.user import User

class CurrencyConversionRequest(BaseModel):
    amount: Decimal
    from_currency: str
    to_currency: str

router = APIRouter()


@router.get("/", response_model=List[Currency])
def read_currencies(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve available currencies
    """
    currencies = currency_crud.get_active(db)
    return currencies


@router.get("/{code}", response_model=Currency)
def read_currency(
    *,
    db: Session = Depends(get_db),
    code: str
) -> Any:
    """
    Get currency by code
    """
    currency = currency_crud.get_by_code(db, code=code)
    if not currency:
        raise HTTPException(
            status_code=404,
            detail="Currency not found"
        )
    return currency


@router.get("/exchange-rate/{from_currency}/{to_currency}")
async def get_exchange_rate(
    *,
    db: Session = Depends(get_db),
    from_currency: str,
    to_currency: str,
    force_refresh: bool = Query(False)
) -> Any:
    """
    Get current exchange rate between two currencies
    """
    currency_service = CurrencyConversionService(db)
    
    try:
        rate = await currency_service.get_exchange_rate(
            from_currency=from_currency.upper(),
            to_currency=to_currency.upper(),
            force_refresh=force_refresh
        )
        
        if rate is None:
            raise HTTPException(
                status_code=404,
                detail=f"Exchange rate not available for {from_currency}/{to_currency}"
            )
        
        return {
            "from_currency": from_currency.upper(),
            "to_currency": to_currency.upper(),
            "rate": rate,
            "timestamp": "now"  # You might want to get the actual timestamp from the service
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching exchange rate: {str(e)}"
        )


@router.post("/convert")
async def convert_currency(
    *,
    db: Session = Depends(get_db),
    request: CurrencyConversionRequest,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Convert amount from one currency to another
    """
    currency_service = CurrencyConversionService(db)
    
    try:
        result = await currency_service.convert_amount(
            amount=request.amount,
            from_currency=request.from_currency.upper(),
            to_currency=request.to_currency.upper()
        )
        
        if result is None:
            raise HTTPException(
                status_code=404,
                detail=f"Currency conversion not available for {request.from_currency}/{request.to_currency}"
            )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error converting currency: {str(e)}"
        )