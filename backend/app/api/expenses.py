"""
Expenses API endpoints
"""

from typing import Any, List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user, CommonQueryParams
from app.crud.crud_expense import expense_crud
from app.schemas.expense import Expense, ExpenseCreate, ExpenseUpdate, ExpenseSummary
from app.db.models.user import User

router = APIRouter()


@router.get("/", response_model=List[Expense])
def read_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    commons: CommonQueryParams = Depends(),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category_id: Optional[str] = Query(None),
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
        currency=currency,
        search=commons.search,
        sort_by=commons.sort_by or "expense_date",
        sort_order=commons.sort_order
    )
    return expenses


@router.post("/", response_model=Expense, status_code=status.HTTP_201_CREATED)
def create_expense(
    *,
    db: Session = Depends(get_db),
    expense_in: ExpenseCreate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Create new expense
    """
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