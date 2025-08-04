"""
Analytics API endpoints
"""

from typing import Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.crud.crud_expense import expense_crud
from app.crud.crud_budget import budget_crud
from app.db.models.user import User

router = APIRouter()


@router.get("/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    year: int = Query(2024)
) -> Any:
    """
    Get analytics summary for the user
    """
    # Get yearly summary
    yearly_summary = expense_crud.get_yearly_summary(db, user_id=current_user.id, year=year)
    
    # Get budget summary
    budget_summary = budget_crud.get_budget_summary(db, user_id=current_user.id)
    
    return {
        "yearly_expenses": yearly_summary,
        "budget_performance": budget_summary,
        "year": year
    }


@router.get("/trends")
def get_spending_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get spending trends and patterns
    """
    # This is a placeholder for more complex analytics
    return {
        "message": "Spending trends analysis coming soon",
        "user_id": current_user.id
    }