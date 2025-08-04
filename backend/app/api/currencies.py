"""
Currencies API endpoints
"""

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.crud.crud_currency import currency_crud
from app.schemas.currency import Currency

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