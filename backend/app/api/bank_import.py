"""
  API endpoints for bank transaction import functionality
"""
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import httpx
from app.core.dependencies import get_db, get_current_user
from app.db.models.user import User
from app.services.bank_transaction_import_service import BankTransactionImportService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/{account_id}")
async def test_import_transactions(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    account_id: str,
    days_back: int = 30  # Default to last 30 days
) -> Any:

    try:
        date_to = datetime.now()
        date_from = date_to - timedelta(days=days_back)

        import_service = BankTransactionImportService(db)

        result = await import_service.import_transactions_as_expenses(
            user_id = str(current_user.id),
            account_id=account_id,
            date_from=date_from.date(),
            date_to=date_to.date()
        )

        return result
    except HTTPException:
        # Re-raise HTTPException from the service to preserve status codes
        raise
    except Exception as e:
        logger.error(f"error in test import: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        )
