from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


@router.get("/")
async def list_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List user budgets.
    """
    # TODO: Implement budget listing
    return {"message": "Budget listing endpoint - to be implemented"}


@router.post("/")
async def create_budget(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Create a new budget.
    """
    # TODO: Implement budget creation
    return {"message": "Budget creation endpoint - to be implemented"}