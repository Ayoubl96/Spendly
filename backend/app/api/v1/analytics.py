from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


@router.get("/summary")
async def get_financial_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get financial summary for the current user.
    """
    # TODO: Implement financial summary
    return {"message": "Financial summary endpoint - to be implemented"}


@router.get("/expenses")
async def get_expense_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get expense analytics by category, time period, etc.
    """
    # TODO: Implement expense analytics
    return {"message": "Expense analytics endpoint - to be implemented"}