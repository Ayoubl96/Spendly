from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import User as UserSchema, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserSchema)
async def read_user_me(
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get current user profile.
    """
    return current_user


@router.put("/me", response_model=UserSchema)
async def update_user_me(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Update current user profile.
    """
    # Update user fields if provided
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    
    if user_update.email is not None:
        # Check if new email is already taken
        if user_update.email != current_user.email:
            existing_user = db.query(User).filter(User.email == user_update.email).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            current_user.email = user_update.email
    
    if user_update.password is not None:
        current_user.hashed_password = security.get_password_hash(user_update.password)
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.delete("/me")
async def delete_user_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Delete current user account.
    
    This will permanently delete the user and all associated data.
    """
    db.delete(current_user)
    db.commit()
    
    return {"message": "User account deleted successfully"}