from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


@router.get("/")
async def list_transactions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List user transactions with pagination.
    """
    # TODO: Implement transaction listing
    return {"message": "Transaction listing endpoint - to be implemented"}


@router.post("/")
async def create_transaction(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Create a new transaction.
    """
    # TODO: Implement transaction creation
    return {"message": "Transaction creation endpoint - to be implemented"}