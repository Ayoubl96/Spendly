"""
Budgets API endpoints
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user, CommonQueryParams
from app.crud.crud_budget import budget_crud
from app.schemas.budget import Budget, BudgetCreate, BudgetUpdate, BudgetSummary, BudgetPerformance
from app.db.models.user import User

router = APIRouter()


@router.get("/", response_model=List[Budget])
def read_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    commons: CommonQueryParams = Depends(),
    is_active: Optional[bool] = Query(None),
    period_type: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    budget_group_id: Optional[str] = Query(None)
) -> Any:
    """
    Retrieve user's budgets with filtering
    """
    budgets = budget_crud.get_by_user(
        db,
        user_id=current_user.id,
        skip=commons.skip,
        limit=commons.limit,
        is_active=is_active,
        period_type=period_type,
        category_id=category_id,
        budget_group_id=budget_group_id
    )
    return budgets


@router.post("/", response_model=Budget, status_code=status.HTTP_201_CREATED)
def create_budget(
    *,
    db: Session = Depends(get_db),
    budget_in: BudgetCreate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Create new budget
    """
    budget = budget_crud.create_for_user(db, obj_in=budget_in, user_id=current_user.id)
    return budget


@router.get("/summary", response_model=BudgetSummary)
def read_budget_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get budget summary for current user
    """
    summary = budget_crud.get_budget_summary(db, user_id=current_user.id)
    return summary


@router.get("/{budget_id}", response_model=Budget)
def read_budget(
    *,
    db: Session = Depends(get_db),
    budget_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get budget by ID
    """
    budget = budget_crud.get(db, id=budget_id)
    if not budget or budget.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    return budget


@router.get("/{budget_id}/performance", response_model=BudgetPerformance)
def read_budget_performance(
    *,
    db: Session = Depends(get_db),
    budget_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get budget performance metrics
    """
    budget = budget_crud.get(db, id=budget_id)
    if not budget or budget.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    performance = budget_crud.get_budget_performance(db, budget=budget)
    return performance


@router.put("/{budget_id}", response_model=Budget)
def update_budget(
    *,
    db: Session = Depends(get_db),
    budget_id: str,
    budget_in: BudgetUpdate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update budget
    """
    budget = budget_crud.get(db, id=budget_id)
    if not budget or budget.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    budget = budget_crud.update(db, db_obj=budget, obj_in=budget_in)
    return budget


@router.delete("/{budget_id}")
def delete_budget(
    *,
    db: Session = Depends(get_db),
    budget_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Delete budget (deactivate)
    """
    budget = budget_crud.deactivate(db, budget_id=budget_id, user_id=current_user.id)
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    return {"message": "Budget deleted successfully"}