from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import date, datetime, timedelta
from uuid import UUID
from decimal import Decimal

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.budget import Budget, BudgetPeriod
from app.models.category import Category
from app.models.transaction import Transaction, TransactionType
from app.schemas.budget import (
    Budget as BudgetSchema,
    BudgetCreate,
    BudgetUpdate,
    BudgetWithStatus,
    BudgetSummary
)

router = APIRouter()


def calculate_budget_status(budget: Budget, db: Session) -> BudgetWithStatus:
    """Calculate budget status with spent amount and remaining balance."""
    # Get transactions for this budget's period
    query = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == budget.user_id,
        Transaction.type == TransactionType.EXPENSE,
        Transaction.date >= budget.start_date,
        Transaction.date <= budget.end_date
    )
    
    # Filter by category if budget is category-specific
    if budget.category_id:
        query = query.filter(Transaction.category_id == budget.category_id)
    
    spent_amount = query.scalar()
    remaining_amount = budget.amount - spent_amount
    percentage_used = (spent_amount / budget.amount * 100) if budget.amount > 0 else 0
    
    # Calculate days remaining
    today = date.today()
    days_remaining = (budget.end_date - today).days if budget.end_date >= today else 0
    
    # Create BudgetWithStatus object
    budget_dict = {
        "id": budget.id,
        "user_id": budget.user_id,
        "category_id": budget.category_id,
        "name": budget.name,
        "amount": budget.amount,
        "currency": budget.currency,
        "period": budget.period,
        "start_date": budget.start_date,
        "end_date": budget.end_date,
        "alert_threshold": budget.alert_threshold,
        "is_active": budget.is_active,
        "created_at": budget.created_at,
        "updated_at": budget.updated_at,
        "spent_amount": spent_amount,
        "remaining_amount": remaining_amount,
        "percentage_used": percentage_used,
        "is_over_budget": spent_amount > budget.amount,
        "days_remaining": days_remaining,
        "category": budget.category
    }
    
    return BudgetWithStatus(**budget_dict)


@router.get("/", response_model=List[BudgetWithStatus])
async def list_budgets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = None,
    category_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List user budgets with their current status.
    """
    query = db.query(Budget).filter(Budget.user_id == current_user.id)
    
    if is_active is not None:
        query = query.filter(Budget.is_active == is_active)
    
    if category_id:
        query = query.filter(Budget.category_id == category_id)
    
    # Order by start date descending
    budgets = query.order_by(Budget.start_date.desc()).offset(skip).limit(limit).all()
    
    # Calculate status for each budget
    budgets_with_status = [calculate_budget_status(budget, db) for budget in budgets]
    
    return budgets_with_status


@router.get("/summary", response_model=BudgetSummary)
async def get_budget_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get budget summary for active budgets.
    """
    today = date.today()
    
    # Get active budgets
    active_budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.is_active == True,
        Budget.start_date <= today,
        Budget.end_date >= today
    ).all()
    
    # Calculate totals
    total_budgeted = Decimal(0)
    total_spent = Decimal(0)
    over_budget_count = 0
    budgets_with_status = []
    
    for budget in active_budgets:
        budget_status = calculate_budget_status(budget, db)
        budgets_with_status.append(budget_status)
        
        total_budgeted += budget.amount
        total_spent += budget_status.spent_amount
        
        if budget_status.is_over_budget:
            over_budget_count += 1
    
    total_remaining = total_budgeted - total_spent
    percentage_used = (total_spent / total_budgeted * 100) if total_budgeted > 0 else 0
    
    return BudgetSummary(
        total_budgeted=total_budgeted,
        total_spent=total_spent,
        total_remaining=total_remaining,
        percentage_used=percentage_used,
        active_budgets=len(active_budgets),
        over_budget_count=over_budget_count,
        budgets=budgets_with_status
    )


@router.get("/{budget_id}", response_model=BudgetWithStatus)
async def get_budget(
    budget_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get a specific budget by ID with its current status.
    """
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    return calculate_budget_status(budget, db)


@router.post("/", response_model=BudgetSchema, status_code=status.HTTP_201_CREATED)
async def create_budget(
    budget_data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Create a new budget.
    """
    # Verify category belongs to user if provided
    if budget_data.category_id:
        category = db.query(Category).filter(
            Category.id == budget_data.category_id,
            Category.user_id == current_user.id
        ).first()
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Verify category is expense type
        if category.type != "expense":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Budget can only be created for expense categories"
            )
    
    # Check for overlapping budgets
    existing_budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == budget_data.category_id,
        Budget.is_active == True,
        Budget.start_date <= budget_data.end_date,
        Budget.end_date >= budget_data.start_date
    ).first()
    
    if existing_budget:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active budget already exists for this period"
        )
    
    # Create budget
    db_budget = Budget(
        **budget_data.dict(),
        user_id=current_user.id
    )
    
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    
    return db_budget


@router.put("/{budget_id}", response_model=BudgetSchema)
async def update_budget(
    budget_id: UUID,
    budget_update: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Update a budget.
    """
    # Get existing budget
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    # Verify category if being updated
    if budget_update.category_id is not None:
        if budget_update.category_id:  # Not null
            category = db.query(Category).filter(
                Category.id == budget_update.category_id,
                Category.user_id == current_user.id
            ).first()
            
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Category not found"
                )
            
            if category.type != "expense":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Budget can only be created for expense categories"
                )
    
    # Update budget
    update_data = budget_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)
    
    budget.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(budget)
    
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Delete a budget.
    """
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    db.delete(budget)
    db.commit()