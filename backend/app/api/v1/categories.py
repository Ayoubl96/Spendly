from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.category import (
    Category as CategorySchema,
    CategoryCreate,
    CategoryUpdate,
    CategoryWithSubcategories
)

router = APIRouter()


@router.get("/", response_model=List[CategoryWithSubcategories])
async def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List all user categories with their subcategories.
    """
    # Get root categories (no parent)
    root_categories = db.query(Category).filter(
        Category.user_id == current_user.id,
        Category.parent_id == None
    ).all()
    
    return root_categories


@router.get("/{category_id}", response_model=CategoryWithSubcategories)
async def get_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get a specific category by ID.
    """
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return category


@router.post("/", response_model=CategorySchema, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Create a new category.
    """
    # Verify parent category if provided
    if category_data.parent_id:
        parent_category = db.query(Category).filter(
            Category.id == category_data.parent_id,
            Category.user_id == current_user.id
        ).first()
        
        if not parent_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent category not found"
            )
        
        # Ensure parent and child have same type
        if parent_category.type != category_data.type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent and child categories must have the same type"
            )
    
    # Check for duplicate name at same level
    existing = db.query(Category).filter(
        Category.user_id == current_user.id,
        Category.name == category_data.name,
        Category.parent_id == category_data.parent_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists at this level"
        )
    
    # Create category
    db_category = Category(
        **category_data.dict(),
        user_id=current_user.id
    )
    
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return db_category


@router.put("/{category_id}", response_model=CategorySchema)
async def update_category(
    category_id: UUID,
    category_update: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Update a category.
    """
    # Get existing category
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Verify new parent if being updated
    if category_update.parent_id is not None:
        if category_update.parent_id:  # Not null
            # Prevent setting self as parent
            if category_update.parent_id == category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category cannot be its own parent"
                )
            
            parent_category = db.query(Category).filter(
                Category.id == category_update.parent_id,
                Category.user_id == current_user.id
            ).first()
            
            if not parent_category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent category not found"
                )
            
            # Check for circular reference
            current_parent = parent_category
            while current_parent.parent_id:
                if current_parent.parent_id == category_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Circular reference detected"
                    )
                current_parent = db.query(Category).filter(
                    Category.id == current_parent.parent_id
                ).first()
    
    # Check for duplicate name if name is being updated
    if category_update.name:
        parent_id = category_update.parent_id if category_update.parent_id is not None else category.parent_id
        existing = db.query(Category).filter(
            Category.user_id == current_user.id,
            Category.name == category_update.name,
            Category.parent_id == parent_id,
            Category.id != category_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists at this level"
            )
    
    # Update category
    update_data = category_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Delete a category. Transactions will have their category_id set to null.
    """
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category has transactions
    transaction_count = db.query(Transaction).filter(
        Transaction.category_id == category_id
    ).count()
    
    if transaction_count > 0:
        # Update transactions to remove category reference
        db.query(Transaction).filter(
            Transaction.category_id == category_id
        ).update({"category_id": None})
    
    # Delete category (subcategories will be handled by cascade)
    db.delete(category)
    db.commit()