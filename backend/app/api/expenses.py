"""
Expenses API endpoints
"""

from typing import Any, List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user, CommonQueryParams
from app.crud.crud_expense import expense_crud, expense_share_crud
from app.schemas.expense import Expense, ExpenseCreate, ExpenseUpdate, ExpenseSummary, ExpenseWithDetails
from app.db.models.user import User
from app.services.currency_service import CurrencyConversionService

router = APIRouter()


@router.get("/", response_model=List[ExpenseWithDetails])
def read_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    commons: CommonQueryParams = Depends(),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category_id: Optional[str] = Query(None),
    subcategory_id: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None, description="Legacy payment method filter"),
    payment_method_id: Optional[str] = Query(None, description="User payment method ID filter"),
    tags: Optional[List[str]] = Query(None),
    include_shared: Optional[bool] = Query(True, description="Include shared expenses where user participates")
) -> Any:
    """
    Retrieve user's expenses with filtering and shared expense support
    """
    # Get user's own expenses
    own_expenses = expense_crud.get_by_user(
        db,
        user_id=current_user.id,
        skip=commons.skip,
        limit=commons.limit,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        subcategory_id=subcategory_id,
        currency=currency,
        payment_method=payment_method,
        payment_method_id=payment_method_id,
        search=commons.search,
        tags=tags,
        sort_by=commons.sort_by or "expense_date",
        sort_order=commons.sort_order
    )
    
    # Convert to ExpenseWithDetails and add user share information
    result = []
    for expense in own_expenses:
        expense_dict = {
            "id": str(expense.id),
            "amount": float(expense.amount_decimal),
            "currency": expense.currency,
            "amount_in_base_currency": float(expense.amount_in_base_currency_decimal) if expense.amount_in_base_currency else None,
            "exchange_rate": float(expense.exchange_rate_decimal) if expense.exchange_rate else None,
            "description": expense.description,
            "expense_date": expense.expense_date.isoformat(),
            "user_id": str(expense.user_id),
            "category_id": str(expense.category_id) if expense.category_id else None,
            "subcategory_id": str(expense.subcategory_id) if expense.subcategory_id else None,
            "payment_method": expense.payment_method,
            "payment_method_id": str(expense.payment_method_id) if expense.payment_method_id else None,
            "receipt_url": expense.receipt_url,
            "notes": expense.notes,
            "location": expense.location,
            "vendor": expense.vendor,
            "is_shared": expense.is_shared,
            "shared_with": expense.shared_with,
            "tags": expense.tags,
            "created_at": expense.created_at.isoformat() if expense.created_at else None,
            "updated_at": expense.updated_at.isoformat() if expense.updated_at else None,
            "expense_shares": [],
            "user_share_amount": None,
            "user_share_percentage": None
        }
        
        # Add share information for shared expenses
        if expense.is_shared:
            # Get user's share amount and percentage
            user_share_amount = expense.get_user_share_amount(current_user.id)
            user_share_percentage = expense.get_user_share_percentage(current_user.id)
            
            expense_dict["user_share_amount"] = float(user_share_amount)
            expense_dict["user_share_percentage"] = float(user_share_percentage)
            
            # Populate expense_shares array
            expense_dict["expense_shares"] = [
                {
                    "id": str(share.id),
                    "expense_id": str(share.expense_id),
                    "user_id": str(share.user_id),
                    "share_percentage": float(share.share_percentage_decimal),
                    "share_amount": float(share.share_amount_decimal),
                    "currency": share.currency,
                    "share_type": share.share_type,
                    "custom_amount": float(share.custom_amount_decimal) if share.custom_amount else None,
                    "created_at": share.created_at.isoformat() if share.created_at else None,
                    "updated_at": share.updated_at.isoformat() if share.updated_at else None
                }
                for share in expense.expense_shares
            ]
            
            # Override the displayed amount with user's share
            if user_share_amount > 0:
                expense_dict["amount_in_base_currency"] = float(user_share_amount)
        
        result.append(expense_dict)
    
    return result


@router.post("/", response_model=ExpenseWithDetails, status_code=status.HTTP_201_CREATED)
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
    
    # Return detailed expense information (same format as list endpoint)
    expense_dict = {
        "id": str(expense.id),
        "amount": float(expense.amount_decimal),
        "currency": expense.currency,
        "description": expense.description,
        "expense_date": expense.expense_date.isoformat() if expense.expense_date else None,
        "user_id": str(expense.user_id),
        "amount_in_base_currency": float(expense.amount_in_base_currency_decimal),
        "exchange_rate": float(expense.exchange_rate_decimal),
        "category_id": str(expense.category_id) if expense.category_id else None,
        "subcategory_id": str(expense.subcategory_id) if expense.subcategory_id else None,
        "payment_method": expense.payment_method,
        "payment_method_id": str(expense.payment_method_id) if expense.payment_method_id else None,
        "receipt_url": expense.receipt_url,
        "notes": expense.notes,
        "location": expense.location,
        "vendor": expense.vendor,
        "is_shared": expense.is_shared,
        "shared_with": expense.shared_with,
        "tags": expense.tags,
        "created_at": expense.created_at.isoformat() if expense.created_at else None,
        "updated_at": expense.updated_at.isoformat() if expense.updated_at else None,
        "expense_shares": [],
        "user_share_amount": None,
        "user_share_percentage": None
    }
    
    # Add share information for shared expenses
    if expense.is_shared:
        # Get user's share amount and percentage
        user_share_amount = expense.get_user_share_amount(current_user.id)
        user_share_percentage = expense.get_user_share_percentage(current_user.id)
        
        expense_dict["user_share_amount"] = float(user_share_amount)
        expense_dict["user_share_percentage"] = float(user_share_percentage)
        
        # Populate expense_shares array
        expense_dict["expense_shares"] = [
            {
                "id": str(share.id),
                "expense_id": str(share.expense_id),
                "user_id": str(share.user_id),
                "share_percentage": float(share.share_percentage_decimal),
                "share_amount": float(share.share_amount_decimal),
                "currency": share.currency,
                "share_type": share.share_type,
                "custom_amount": float(share.custom_amount_decimal) if share.custom_amount else None,
                "created_at": share.created_at.isoformat() if share.created_at else None,
                "updated_at": share.updated_at.isoformat() if share.updated_at else None
            }
            for share in expense.expense_shares
        ]
        
        # Override the displayed amount with user's share
        if user_share_amount > 0:
            expense_dict["amount_in_base_currency"] = float(user_share_amount)
    
    return expense_dict


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


@router.get("/{expense_id}/shares", response_model=List[dict])
def get_expense_shares(
    *,
    db: Session = Depends(get_db),
    expense_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get share configuration for a shared expense
    """
    expense = expense_crud.get(db, id=expense_id)
    if not expense or expense.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    if not expense.is_shared:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense is not shared"
        )
    
    shares = expense_share_crud.get_by_expense(db, expense_id=expense_id)
    return [
        {
            "id": str(share.id),
            "user_id": str(share.user_id),
            "share_percentage": float(share.share_percentage_decimal),
            "share_amount": float(share.share_amount_decimal),
            "currency": share.currency,
            "share_type": share.share_type,
            "custom_amount": float(share.custom_amount_decimal) if share.custom_amount else None
        }
        for share in shares
    ]


@router.put("/{expense_id}/shares")
def update_expense_shares(
    *,
    db: Session = Depends(get_db),
    expense_id: str,
    shares_data: dict,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update share configuration for a shared expense
    """
    from app.schemas.expense import ExpenseShareCreate
    from decimal import Decimal
    
    expense = expense_crud.get(db, id=expense_id)
    if not expense or expense.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    if not expense.is_shared:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense is not shared"
        )
    
    # Parse shares data
    shares = []
    total_percentage = Decimal("0")
    
    for share_data in shares_data.get("participants", []):
        share = ExpenseShareCreate(
            user_id=share_data["user_id"],
            share_percentage=Decimal(str(share_data["share_percentage"])),
            share_amount=Decimal(str(share_data["share_amount"])),
            currency=expense.currency,
            share_type=share_data.get("share_type", "percentage"),
            custom_amount=Decimal(str(share_data["custom_amount"])) if share_data.get("custom_amount") else None
        )
        shares.append(share)
        total_percentage += share.share_percentage
    
    # Validate that shares add up to 100%
    if abs(total_percentage - Decimal("100")) > Decimal("0.01"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Share percentages must add up to 100%, got {total_percentage}%"
        )
    
    # Update shares
    expense_share_crud.update_shares_for_expense(db, expense_id=expense_id, shares=shares)
    
    return {"message": "Expense shares updated successfully"}