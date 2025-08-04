"""
Users API endpoints
"""

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.crud.crud_user import user_crud
from app.schemas.user import User, UserUpdate, PasswordUpdate
from app.db.models.user import User as UserModel

router = APIRouter()


@router.get("/", response_model=List[User])
def read_users(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Get all active users for expense sharing
    """
    users = db.query(UserModel).filter(
        UserModel.is_active == True,
        UserModel.id != current_user.id  # Exclude current user
    ).all()
    return users


@router.get("/me", response_model=User)
def read_user_me(
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Get current user information
    """
    return current_user


@router.put("/me", response_model=User)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Update current user information
    """
    user = user_crud.update(db, db_obj=current_user, obj_in=user_in)
    return user


@router.put("/me/password")
def update_password(
    *,
    db: Session = Depends(get_db),
    password_update: PasswordUpdate,
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Update current user password
    """
    # Verify current password
    if not user_crud.authenticate(db, email=current_user.email, password=password_update.current_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Update password
    user_crud.update_password(db, user=current_user, new_password=password_update.new_password)
    
    return {"message": "Password updated successfully"}


@router.delete("/me")
def deactivate_user_me(
    *,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Deactivate current user account
    """
    user_crud.deactivate(db, user=current_user)
    return {"message": "Account deactivated successfully"}