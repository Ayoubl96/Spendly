"""
Expenses API endpoints
"""

from typing import Any, List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user, CommonQueryParams
from app.crud.crud_expense import expense_crud
from app.schemas.expense import Expense, ExpenseCreate, ExpenseUpdate, ExpenseSummary
from app.db.models.user import User
from app.services.currency_service import CurrencyConversionService

router = APIRouter()


@router.get("/", response_model=List[Expense])
def read_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    commons: CommonQueryParams = Depends(),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category_id: Optional[str] = Query(None),
    subcategory_id: Optional[str] = Query(None),
    currency: Optional[str] = Query(None)
) -> Any:
    """
    Retrieve user's expenses with filtering
    """
    expenses = expense_crud.get_by_user(
        db,
        user_id=current_user.id,
        skip=commons.skip,
        limit=commons.limit,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        subcategory_id=subcategory_id,
        currency=currency,
        search=commons.search,
        sort_by=commons.sort_by or "expense_date",
        sort_order=commons.sort_order
    )
    return expenses


@router.post("/", response_model=Expense, status_code=status.HTTP_201_CREATED)
async def create_expense(
    *,
    db: Session = Depends(get_db),
    expense_in: ExpenseCreate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Create new expense with automatic currency conversion
    """
    # Initialize currency service
    currency_service = CurrencyConversionService(db)
    
    # Get user's default currency
    user_default_currency = current_user.default_currency or "EUR"
    
    # Handle currency conversion
    if expense_in.currency != user_default_currency:
        # Check if frontend provided conversion data
        if expense_in.amount_in_base_currency is not None and expense_in.exchange_rate is not None:
            # Frontend always sends conversion data, use it (whether manual or API-calculated)
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Using frontend conversion: {expense_in.amount} {expense_in.currency} = {expense_in.amount_in_base_currency} {user_default_currency} (rate: {expense_in.exchange_rate})")
        else:
            # Fallback: Frontend didn't send conversion data, calculate it
            # This should rarely happen with current FE implementation
            try:
                conversion_result = await currency_service.convert_amount(
                    amount=expense_in.amount,
                    from_currency=expense_in.currency,
                    to_currency=user_default_currency
                )
                
                if conversion_result:
                    expense_in.amount_in_base_currency = conversion_result["converted_amount"]
                    expense_in.exchange_rate = conversion_result["exchange_rate"]
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Fallback conversion: {expense_in.amount} {expense_in.currency} = {expense_in.amount_in_base_currency} {user_default_currency} (rate: {expense_in.exchange_rate})")
                    
            except Exception as e:
                # Log error but don't fail the expense creation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Currency conversion error: {e}")
    else:
        # Same currency, set 1:1 conversion
        expense_in.amount_in_base_currency = expense_in.amount
        expense_in.exchange_rate = Decimal("1.0")
    
    expense = expense_crud.create_for_user(db, obj_in=expense_in, user_id=current_user.id)
    return expense


@router.get("/{expense_id}", response_model=Expense)
def read_expense(
    *,
    db: Session = Depends(get_db),
    expense_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get expense by ID
    """
    expense = expense_crud.get(db, id=expense_id)
    if not expense or expense.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    return expense


@router.put("/{expense_id}", response_model=Expense)
def update_expense(
    *,
    db: Session = Depends(get_db),
    expense_id: str,
    expense_in: ExpenseUpdate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update expense
    """
    expense = expense_crud.get(db, id=expense_id)
    if not expense or expense.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    expense = expense_crud.update(db, db_obj=expense, obj_in=expense_in)
    return expense


@router.delete("/{expense_id}")
def delete_expense(
    *,
    db: Session = Depends(get_db),
    expense_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Delete expense
    """
    expense = expense_crud.get(db, id=expense_id)
    if not expense or expense.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    expense_crud.remove(db, id=expense_id)
    return {"message": "Expense deleted successfully"}


@router.get("/summary/monthly")
def get_monthly_summary(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    year: int = Query(...),
    month: int = Query(...)
) -> Any:
    """
    Get monthly expense summary
    """
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid month"
        )
    
    summary = expense_crud.get_monthly_summary(
        db,
        user_id=current_user.id,
        year=year,
        month=month
    )
    return summary