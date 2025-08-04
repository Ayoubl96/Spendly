"""
API endpoints for Monthly Budget Plans
Provides a unified interface for managing multiple category budgets as monthly plans
"""

from typing import List, Optional, Any
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.db.models.user import User
from app.crud.crud_budget import budget_crud
from app.crud.crud_category import category_crud
from app.schemas.budget_plan import (
    MonthlyBudgetPlan,
    MonthlyBudgetPlanCreate,
    MonthlyBudgetPlanUpdate,
    MonthlyBudgetPlanSummary,
    CategoryBudgetAllocation
)
from app.schemas.budget import BudgetCreate, BudgetUpdate

router = APIRouter()


@router.post("/", response_model=MonthlyBudgetPlan)
def create_monthly_budget_plan(
    plan_data: MonthlyBudgetPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Create a new monthly budget plan
    This creates individual Budget records for each category
    """
    # Validate month/year
    if plan_data.month < 1 or plan_data.month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12"
        )
    
    if plan_data.year < 2020 or plan_data.year > 2030:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Year must be between 2020 and 2030"
        )
    
    # Calculate start and end dates for the month
    start_date = date(plan_data.year, plan_data.month, 1)
    if plan_data.month == 12:
        end_date = date(plan_data.year + 1, 1, 1) - date.resolution
    else:
        end_date = date(plan_data.year, plan_data.month + 1, 1) - date.resolution
    
    # Check if plan already exists for this month/year
    existing_budgets = budget_crud.get_by_user(
        db,
        user_id=current_user.id,
        skip=0,
        limit=1000  # Get all budgets to check for conflicts
    )
    
    # Check for overlapping budgets in the same month
    for budget in existing_budgets:
        if (budget.start_date.year == plan_data.year and 
            budget.start_date.month == plan_data.month):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Budget plan already exists for {plan_data.month}/{plan_data.year}"
            )
    
    # Create individual Budget records for each category
    created_budgets = []
    total_amount = 0
    
    for category_budget in plan_data.category_budgets:
        # Verify category exists and belongs to user
        category = category_crud.get(db, id=category_budget.category_id)
        if not category or category.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category {category_budget.category_id} not found"
            )
        
        # Create budget for this category
        budget_data = BudgetCreate(
            name=f"{category.name} - {plan_data.name}",
            amount=category_budget.budget_amount,
            currency=plan_data.currency,
            period_type="monthly",
            start_date=start_date,
            end_date=end_date,
            category_id=category_budget.category_id,
            alert_threshold=category_budget.alert_threshold,
            is_active=category_budget.is_active
        )
        
        budget = budget_crud.create_for_user(
            db, obj_in=budget_data, user_id=current_user.id
        )
        created_budgets.append(budget)
        total_amount += float(category_budget.budget_amount)
    
    # Build response with performance data
    category_allocations = []
    for budget in created_budgets:
        performance = budget_crud.get_budget_performance(db, budget=budget)
        category = category_crud.get(db, id=budget.category_id)
        
        allocation = CategoryBudgetAllocation(
            category_id=str(budget.category_id),
            category_name=category.name,
            parent_category_id=str(category.parent_id) if category.parent_id else None,
            parent_category_name=None,  # We'd need to fetch parent category for this
            budget_amount=float(budget.amount),
            alert_threshold=float(budget.alert_threshold),
            is_active=budget.is_active,
            budget_id=str(budget.id),
            spent=float(performance["spent"]),
            remaining=float(performance["remaining"]),
            percentage_used=float(performance["percentage_used"]),
            status=performance["status"]
        )
        category_allocations.append(allocation)
    
    return MonthlyBudgetPlan(
        name=plan_data.name,
        month=plan_data.month,
        year=plan_data.year,
        currency=plan_data.currency,
        total_amount=total_amount,
        category_budgets=category_allocations,
        created_at=datetime.utcnow()
    )


@router.get("/", response_model=List[MonthlyBudgetPlanSummary])
def get_monthly_budget_plans(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get all monthly budget plans for the user
    Groups existing budgets by month/year
    """
    # Get all user's budgets
    budgets = budget_crud.get_by_user(
        db,
        user_id=current_user.id,
        skip=0,
        limit=1000
    )
    
    # Filter by year if provided
    if year:
        budgets = [b for b in budgets if b.start_date.year == year]
    
    # Group budgets by month/year
    monthly_groups = {}
    for budget in budgets:
        key = f"{budget.start_date.year}-{budget.start_date.month:02d}"
        if key not in monthly_groups:
            monthly_groups[key] = []
        monthly_groups[key].append(budget)
    
    # Build summary for each month
    summaries = []
    for key, month_budgets in monthly_groups.items():
        year, month = map(int, key.split('-'))
        
        total_budget = sum(float(b.amount) for b in month_budgets)
        total_spent = 0
        total_remaining = 0
        
        status_counts = {'on_track': 0, 'warning': 0, 'over_budget': 0}
        
        for budget in month_budgets:
            performance = budget_crud.get_budget_performance(db, budget=budget)
            total_spent += float(performance["spent"])
            total_remaining += float(performance["remaining"])
            status_counts[performance["status"]] += 1
        
        # Determine overall status
        if status_counts['over_budget'] > 0:
            overall_status = 'over_budget'
        elif status_counts['warning'] > 0:
            overall_status = 'warning'
        else:
            overall_status = 'on_track'
        
        overall_percentage = (total_spent / total_budget * 100) if total_budget > 0 else 0
        
        summaries.append(MonthlyBudgetPlanSummary(
            plan_id=f"{year}-{month:02d}",  # Virtual ID for monthly plans
            name=f"{date(year, month, 1).strftime('%B %Y')} Budget Plan",
            month=month,
            year=year,
            currency=month_budgets[0].currency,  # Assume same currency for all budgets
            total_budget=total_budget,
            total_spent=total_spent,
            total_remaining=total_remaining,
            overall_percentage=overall_percentage,
            overall_status=overall_status,
            category_count=len(month_budgets),
            active_budget_count=len([b for b in month_budgets if b.is_active])
        ))
    
    # Sort by year/month descending
    summaries.sort(key=lambda x: (x.year, x.month), reverse=True)
    return summaries


@router.get("/{year}/{month}", response_model=MonthlyBudgetPlan)
def get_monthly_budget_plan(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get a specific monthly budget plan
    """
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12"
        )
    
    # Get all budgets for this month/year
    budgets = budget_crud.get_by_user(
        db,
        user_id=current_user.id,
        skip=0,
        limit=1000
    )
    
    month_budgets = [
        b for b in budgets 
        if b.start_date.year == year and b.start_date.month == month
    ]
    
    if not month_budgets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No budget plan found for {month}/{year}"
        )
    
    # Build category allocations
    category_allocations = []
    total_amount = 0
    
    for budget in month_budgets:
        performance = budget_crud.get_budget_performance(db, budget=budget)
        category = category_crud.get(db, id=budget.category_id)
        
        allocation = CategoryBudgetAllocation(
            category_id=str(budget.category_id),
            category_name=category.name,
            parent_category_id=str(category.parent_id) if category.parent_id else None,
            parent_category_name=None,
            budget_amount=float(budget.amount),
            alert_threshold=float(budget.alert_threshold),
            is_active=budget.is_active,
            budget_id=str(budget.id),
            spent=float(performance["spent"]),
            remaining=float(performance["remaining"]),
            percentage_used=float(performance["percentage_used"]),
            status=performance["status"]
        )
        category_allocations.append(allocation)
        total_amount += float(budget.amount)
    
    return MonthlyBudgetPlan(
        name=f"{date(year, month, 1).strftime('%B %Y')} Budget Plan",
        month=month,
        year=year,
        currency=month_budgets[0].currency,
        total_amount=total_amount,
        category_budgets=category_allocations
    )


@router.put("/{year}/{month}", response_model=MonthlyBudgetPlan)
def update_monthly_budget_plan(
    year: int,
    month: int,
    plan_data: MonthlyBudgetPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update a monthly budget plan
    Updates individual Budget records
    """
    # Get existing budgets for this month
    budgets = budget_crud.get_by_user(
        db,
        user_id=current_user.id,
        skip=0,
        limit=1000
    )
    
    month_budgets = [
        b for b in budgets 
        if b.start_date.year == year and b.start_date.month == month
    ]
    
    if not month_budgets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No budget plan found for {month}/{year}"
        )
    
    # Update existing budgets and create new ones
    budget_map = {str(b.category_id): b for b in month_budgets}
    updated_budgets = []
    
    if plan_data.category_budgets:
        for category_budget in plan_data.category_budgets:
            category_id = category_budget.category_id
            
            if category_id in budget_map:
                # Update existing budget
                existing_budget = budget_map[category_id]
                update_data = BudgetUpdate(
                    amount=category_budget.budget_amount,
                    alert_threshold=category_budget.alert_threshold,
                    is_active=category_budget.is_active
                )
                updated_budget = budget_crud.update(
                    db, db_obj=existing_budget, obj_in=update_data
                )
                updated_budgets.append(updated_budget)
            else:
                # Create new budget for this category
                category = category_crud.get(db, id=category_budget.category_id)
                if not category or category.user_id != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Category {category_budget.category_id} not found"
                    )
                
                start_date = date(year, month, 1)
                if month == 12:
                    end_date = date(year + 1, 1, 1) - date.resolution
                else:
                    end_date = date(year, month + 1, 1) - date.resolution
                
                # Fix f-string expression - extract strftime to avoid backslashes
                default_plan_name = f"{start_date.strftime('%B %Y')} Budget Plan"
                plan_name = plan_data.name or default_plan_name
                
                budget_data = BudgetCreate(
                    name=f"{category.name} - {plan_name}",
                    amount=category_budget.budget_amount,
                    currency=plan_data.currency or month_budgets[0].currency,
                    period_type="monthly",
                    start_date=start_date,
                    end_date=end_date,
                    category_id=category_budget.category_id,
                    alert_threshold=category_budget.alert_threshold,
                    is_active=category_budget.is_active
                )
                
                new_budget = budget_crud.create_for_user(
                    db, obj_in=budget_data, user_id=current_user.id
                )
                updated_budgets.append(new_budget)
    
    # Return updated plan
    return get_monthly_budget_plan(year, month, db, current_user)


@router.delete("/{year}/{month}")
def delete_monthly_budget_plan(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Delete a monthly budget plan
    Deletes all Budget records for the month
    """
    # Get budgets for this month
    budgets = budget_crud.get_by_user(
        db,
        user_id=current_user.id,
        skip=0,
        limit=1000
    )
    
    month_budgets = [
        b for b in budgets 
        if b.start_date.year == year and b.start_date.month == month
    ]
    
    if not month_budgets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No budget plan found for {month}/{year}"
        )
    
    # Delete all budgets for this month
    for budget in month_budgets:
        budget_crud.remove(db, id=budget.id)
    
    return {"message": f"Monthly budget plan for {month}/{year} deleted successfully"}