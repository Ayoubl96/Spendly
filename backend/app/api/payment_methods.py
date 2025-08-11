"""
Payment Methods API endpoints
"""

from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.dependencies import get_db, get_current_user
from app.crud import payment_method as payment_method_crud
from app.db.models.user import User
from app.schemas.payment_method import (
    PaymentMethod,
    PaymentMethodCreate,
    PaymentMethodUpdate,
    PaymentMethodWithStats,
    BulkPaymentMethodUpdate
)

router = APIRouter()


@router.get("/", response_model=List[PaymentMethod])
def read_payment_methods(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    include_inactive: bool = False
) -> Any:
    """
    Retrieve payment methods for the current user.
    """
    payment_methods = payment_method_crud.get_by_user(
        db, user_id=current_user.id, include_inactive=include_inactive
    )
    
    # Add can_delete property
    result = []
    for pm in payment_methods:
        pm_dict = pm.__dict__.copy()
        pm_dict["can_delete"] = pm.can_delete
        result.append(PaymentMethod(**pm_dict))
    
    return result


@router.get("/with-stats", response_model=List[PaymentMethodWithStats])
def read_payment_methods_with_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    include_inactive: bool = False
) -> Any:
    """
    Retrieve payment methods with usage statistics for the current user.
    """
    stats_data = payment_method_crud.get_with_stats(
        db, user_id=current_user.id, include_inactive=include_inactive
    )
    
    result = []
    for item in stats_data:
        pm = item["payment_method"]
        # Convert SQLAlchemy object to dict, excluding internal attributes
        pm_dict = {key: value for key, value in pm.__dict__.items() if not key.startswith('_')}
        # Convert UUID objects to strings for JSON serialization
        if 'id' in pm_dict:
            pm_dict['id'] = str(pm_dict['id'])
        if 'user_id' in pm_dict:
            pm_dict['user_id'] = str(pm_dict['user_id'])
        
        pm_dict.update({
            "expense_count": item["expense_count"] or 0,
            "total_amount": float(item["total_amount"] or 0.0),
            "last_used": item["last_used"],
        })
        result.append(PaymentMethodWithStats(**pm_dict))
    
    return result


@router.post("/", response_model=PaymentMethod)
def create_payment_method(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    payment_method_in: PaymentMethodCreate
) -> Any:
    """
    Create new payment method for the current user.
    """
    # Check for duplicate name
    existing = payment_method_crud.get_by_user_and_name(
        db, user_id=current_user.id, name=payment_method_in.name
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment method with this name already exists"
        )
    
    payment_method = payment_method_crud.create_for_user(
        db, obj_in=payment_method_in, user_id=current_user.id
    )
    
    # Add can_delete property
    pm_dict = payment_method.__dict__.copy()
    pm_dict["can_delete"] = payment_method.can_delete
    
    return PaymentMethod(**pm_dict)


@router.put("/{payment_method_id}", response_model=PaymentMethod)
def update_payment_method(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    payment_method_id: UUID,
    payment_method_in: PaymentMethodUpdate
) -> Any:
    """
    Update a payment method.
    """
    payment_method = payment_method_crud.get(db, id=payment_method_id)
    if not payment_method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found"
        )
    
    if payment_method.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check for duplicate name if name is being changed
    if payment_method_in.name and payment_method_in.name != payment_method.name:
        existing = payment_method_crud.get_by_user_and_name(
            db, user_id=current_user.id, name=payment_method_in.name
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment method with this name already exists"
            )
    
    payment_method = payment_method_crud.update_for_user(
        db, db_obj=payment_method, obj_in=payment_method_in, user_id=current_user.id
    )
    
    # Add can_delete property
    pm_dict = payment_method.__dict__.copy()
    pm_dict["can_delete"] = payment_method.can_delete
    
    return PaymentMethod(**pm_dict)


@router.delete("/{payment_method_id}")
def delete_payment_method(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    payment_method_id: UUID,
    force: bool = False
) -> Any:
    """
    Delete a payment method (soft delete by default).
    Use force=true to hard delete if no expenses are using it.
    """
    payment_method = payment_method_crud.get(db, id=payment_method_id)
    if not payment_method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found"
        )
    
    if payment_method.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    if force and payment_method.can_delete:
        # Hard delete
        payment_method_crud.remove(db, id=payment_method_id)
        return {"message": "Payment method deleted permanently"}
    else:
        # Soft delete
        payment_method_crud.soft_delete_for_user(
            db, id=payment_method_id, user_id=current_user.id
        )
        return {"message": "Payment method deactivated"}


@router.post("/reorder", response_model=List[PaymentMethod])
def reorder_payment_methods(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    bulk_update: BulkPaymentMethodUpdate
) -> Any:
    """
    Reorder payment methods for the current user.
    """
    try:
        updated_methods = payment_method_crud.reorder_for_user(
            db, 
            user_id=current_user.id, 
            payment_method_orders=bulk_update.payment_methods
        )
        
        # Convert to response format
        result = []
        for pm in updated_methods:
            pm_dict = pm.__dict__.copy()
            pm_dict["can_delete"] = pm.can_delete
            result.append(PaymentMethod(**pm_dict))
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to reorder payment methods: {str(e)}"
        )


@router.post("/create-defaults", response_model=List[PaymentMethod])
def create_default_payment_methods(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Create default payment methods for the current user.
    Useful for users who don't have any payment methods yet.
    """
    existing_methods = payment_method_crud.get_by_user(db, user_id=current_user.id)
    if existing_methods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has payment methods"
        )
    
    created_methods = payment_method_crud.create_default_payment_methods(
        db, user_id=current_user.id
    )
    
    # Convert to response format
    result = []
    for pm in created_methods:
        pm_dict = pm.__dict__.copy()
        pm_dict["can_delete"] = pm.can_delete
        result.append(PaymentMethod(**pm_dict))
    
    return result
