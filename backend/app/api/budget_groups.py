"""
Budget Groups API endpoints
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user, CommonQueryParams
from app.crud.crud_budget_group import budget_group_crud
from app.crud.crud_budget import budget_crud
from app.schemas.budget_group import (
    BudgetGroup, 
    BudgetGroupCreate, 
    BudgetGroupUpdate, 
    BudgetGroupSummary,
    BudgetGroupList,
    BudgetGroupWithBudgets,
    GenerateBudgetsRequest,
    BulkBudgetsUpdateRequest,
)
from app.schemas.budget import Budget
from app.db.models.user import User

router = APIRouter()


@router.get("/", response_model=BudgetGroupList)
def read_budget_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    commons: CommonQueryParams = Depends(),
    is_active: Optional[bool] = Query(None),
    period_type: Optional[str] = Query(None),
    currency: Optional[str] = Query(None)
) -> Any:
    """
    Retrieve user's budget groups with filtering
    """
    budget_groups = budget_group_crud.get_by_user(
        db,
        user_id=current_user.id,
        skip=commons.skip,
        limit=commons.limit,
        is_active=is_active,
        period_type=period_type,
        currency=currency
    )
    
    # Get summary statistics
    total_groups = len(budget_groups)
    active_groups = len([bg for bg in budget_groups if bg.is_active])
    current_period_groups = len([
        bg for bg in budget_groups 
        if bg.is_current_period() and bg.is_active
    ])
    
    return BudgetGroupList(
        items=budget_groups,
        total=total_groups,
        active_groups=active_groups,
        current_period_groups=current_period_groups
    )


@router.post("/", response_model=BudgetGroup, status_code=status.HTTP_201_CREATED)
def create_budget_group(
    *,
    db: Session = Depends(get_db),
    budget_group_in: BudgetGroupCreate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Create new budget group
    """
    # Check for overlapping budget groups
    overlapping = budget_group_crud.get_overlapping_groups(
        db,
        user_id=current_user.id,
        start_date=budget_group_in.start_date,
        end_date=budget_group_in.end_date
    )
    
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Budget group overlaps with existing group: {overlapping[0].name}"
        )
    
    budget_group = budget_group_crud.create_for_user(
        db, 
        obj_in=budget_group_in, 
        user_id=current_user.id
    )
    return budget_group


@router.get("/current", response_model=List[BudgetGroup])
def read_current_budget_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get budget groups for current period
    """
    budget_groups = budget_group_crud.get_current_period_groups(
        db, 
        user_id=current_user.id
    )
    return budget_groups


@router.get("/summary", response_model=dict)
def read_budget_groups_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    include_inactive: bool = Query(False)
) -> Any:
    """
    Get comprehensive summary of all user's budget groups
    """
    summary = budget_group_crud.get_user_summary(
        db, 
        user_id=current_user.id,
        include_inactive=include_inactive
    )
    return summary


@router.get("/{budget_group_id}", response_model=BudgetGroup)
def read_budget_group(
    *,
    db: Session = Depends(get_db),
    budget_group_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get budget group by ID
    """
    budget_group = budget_group_crud.get(db, id=budget_group_id)
    if not budget_group or budget_group.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget group not found"
        )
    return budget_group


@router.get("/{budget_group_id}/with-budgets", response_model=BudgetGroupWithBudgets)
def read_budget_group_with_budgets(
    *,
    db: Session = Depends(get_db),
    budget_group_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get budget group with its associated budgets
    """
    budget_group = budget_group_crud.get_with_budgets(
        db, 
        budget_group_id=budget_group_id, 
        user_id=current_user.id
    )
    if not budget_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget group not found"
        )
    
    # Convert budgets to dict format for response (match frontend Budget shape)
    budgets_data = []
    print(f"🔍 Budget group has {len(budget_group.budgets)} total budgets")
    
    for budget in budget_group.budgets:
        print(f"🔍 Budget: {budget.name}, Active: {budget.is_active}, Category ID: {budget.category_id}")
        if budget.is_active:
            budget_dict = {
                "id": str(budget.id),
                "name": budget.name,
                "amount": float(budget.amount_decimal),
                "currency": budget.currency,
                "periodType": budget.period_type,
                "startDate": budget.start_date.isoformat(),
                "endDate": budget.end_date.isoformat() if budget.end_date else None,
                "userId": str(budget.user_id),
                "categoryId": str(budget.category_id) if budget.category_id else None,
                "budgetGroupId": str(budget.budget_group_id) if budget.budget_group_id else None,
                "alertThreshold": float(budget.alert_threshold_decimal),
                "is_active": budget.is_active,
                "category": {
                    "id": str(budget.category.id),
                    "name": budget.category.name,
                    "color": budget.category.color,
                    "icon": budget.category.icon
                } if budget.category else None
            }
            budgets_data.append(budget_dict)
            print(f"✅ Added budget to response: {budget.name}")
        else:
            print(f"❌ Skipped inactive budget: {budget.name}")
    
    print(f"🔍 Final budgets_data length: {len(budgets_data)}")
    
    # Create the response using BudgetGroupWithBudgets schema
    from app.schemas.budget_group import BudgetGroupWithBudgets
    
    # Build the response data structure
    response_data = {
        "id": budget_group.id,
        "name": budget_group.name,
        "description": budget_group.description,
        "period_type": budget_group.period_type,
        "start_date": budget_group.start_date,
        "end_date": budget_group.end_date,
        "currency": budget_group.currency,
        "user_id": budget_group.user_id,
        "is_active": budget_group.is_active,
        "created_at": budget_group.created_at,
        "updated_at": budget_group.updated_at,
        "budgets": budgets_data,
    }
    
    print(f"🔍 Response data before schema: {response_data}")
    return BudgetGroupWithBudgets(**response_data)


@router.post("/{budget_group_id}/generate-budgets")
def generate_budgets_for_group(
    *,
    db: Session = Depends(get_db),
    budget_group_id: str,
    payload: GenerateBudgetsRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate budgets for all (or scoped) categories within a group."""
    created = budget_group_crud.generate_budgets(
        db,
        budget_group_id=budget_group_id,
        user_id=current_user.id,
        request=payload,
    )
    return {"created": created}


@router.post("/{budget_group_id}/bulk-update-budgets")
def bulk_update_budgets(
    *,
    db: Session = Depends(get_db),
    budget_group_id: str,
    payload: BulkBudgetsUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    """Bulk-update amounts for budgets inside a group (fast edits UI)."""
    updated = budget_group_crud.bulk_update_amounts(
        db,
        budget_group_id=budget_group_id,
        user_id=current_user.id,
        request=payload,
    )
    return {"updated": updated}


@router.get("/{budget_group_id}/summary", response_model=BudgetGroupSummary)
def read_budget_group_summary(
    *,
    db: Session = Depends(get_db),
    budget_group_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get comprehensive summary for a budget group
    """
    summary = budget_group_crud.get_budget_group_summary(
        db, 
        budget_group_id=budget_group_id, 
        user_id=current_user.id
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget group not found"
        )
    return summary


@router.get("/{budget_group_id}/budgets", response_model=List[Budget])
def read_budget_group_budgets(
    *,
    db: Session = Depends(get_db),
    budget_group_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get all budgets in a budget group
    """
    # First verify the budget group exists and belongs to user
    budget_group = budget_group_crud.get(db, id=budget_group_id)
    if not budget_group or budget_group.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget group not found"
        )
    
    budgets = budget_crud.get_by_budget_group(
        db, 
        user_id=current_user.id, 
        budget_group_id=budget_group_id
    )
    return budgets


@router.put("/{budget_group_id}", response_model=BudgetGroup)
def update_budget_group(
    *,
    db: Session = Depends(get_db),
    budget_group_id: str,
    budget_group_in: BudgetGroupUpdate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update budget group
    """
    budget_group = budget_group_crud.get(db, id=budget_group_id)
    if not budget_group or budget_group.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget group not found"
        )
    
    # Check for overlapping budget groups if dates are being updated
    if budget_group_in.start_date or budget_group_in.end_date:
        start_date = budget_group_in.start_date or budget_group.start_date
        end_date = budget_group_in.end_date or budget_group.end_date
        
        overlapping = budget_group_crud.get_overlapping_groups(
            db,
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date,
            exclude_id=budget_group.id
        )
        
        if overlapping:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Budget group would overlap with existing group: {overlapping[0].name}"
            )
    
    budget_group = budget_group_crud.update(
        db, 
        db_obj=budget_group, 
        obj_in=budget_group_in
    )
    return budget_group


@router.delete("/{budget_group_id}")
def delete_budget_group(
    *,
    db: Session = Depends(get_db),
    budget_group_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Delete budget group (deactivate)
    """
    budget_group = budget_group_crud.deactivate(
        db, 
        budget_group_id=budget_group_id, 
        user_id=current_user.id
    )
    if not budget_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget group not found"
        )
    
    return {"message": "Budget group deleted successfully"}
