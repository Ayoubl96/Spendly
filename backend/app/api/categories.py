"""
Categories API endpoints
"""

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.crud.crud_category import category_crud
from app.schemas.category import Category, CategoryCreate, CategoryUpdate, CategoryTree
from app.db.models.user import User

router = APIRouter()


@router.get("/", response_model=List[Category])
def read_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Retrieve user's categories
    """
    categories = category_crud.get_by_user(db, user_id=current_user.id)
    return categories


@router.get("/tree", response_model=List[CategoryTree])
def read_category_tree(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Retrieve user's categories as hierarchical tree
    """
    category_tree = category_crud.get_category_tree(db, user_id=current_user.id)
    return category_tree


@router.post("/", response_model=Category, status_code=status.HTTP_201_CREATED)
def create_category(
    *,
    db: Session = Depends(get_db),
    category_in: CategoryCreate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Create new category
    """
    # Check if category name already exists for this user
    existing = category_crud.get_by_name(
        db, 
        user_id=current_user.id, 
        name=category_in.name,
        parent_id=category_in.parent_id
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
    
    category = category_crud.create_for_user(db, obj_in=category_in, user_id=current_user.id)
    return category


@router.get("/{category_id}", response_model=Category)
def read_category(
    *,
    db: Session = Depends(get_db),
    category_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get category by ID
    """
    category = category_crud.get(db, id=category_id)
    if not category or category.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category


@router.put("/{category_id}", response_model=Category)
def update_category(
    *,
    db: Session = Depends(get_db),
    category_id: str,
    category_in: CategoryUpdate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update category
    """
    category = category_crud.get(db, id=category_id)
    if not category or category.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if new name conflicts with existing categories
    if category_in.name and category_in.name != category.name:
        existing = category_crud.get_by_name(
            db,
            user_id=current_user.id,
            name=category_in.name,
            parent_id=category.parent_id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists"
            )
    
    category = category_crud.update(db, db_obj=category, obj_in=category_in)
    return category


@router.delete("/{category_id}")
def delete_category(
    *,
    db: Session = Depends(get_db),
    category_id: str,
    reassign_to_category_id: str = None,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Delete category and reassign expenses to another category
    """
    from app.crud.crud_expense import expense_crud
    
    category = category_crud.get(db, id=category_id)
    if not category or category.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category has subcategories
    subcategories = category_crud.get_subcategories(db, user_id=current_user.id, parent_id=category_id)
    if subcategories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with subcategories. Please delete subcategories first or reassign them."
        )
    
    # Get expenses using this category
    expenses_with_category = expense_crud.get_by_category(db, category_id=category_id)
    expenses_with_subcategory = expense_crud.get_by_subcategory(db, subcategory_id=category_id)
    
    total_expenses = len(expenses_with_category) + len(expenses_with_subcategory)
    
    if total_expenses > 0:
        if not reassign_to_category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category has {total_expenses} associated expenses. Please provide reassign_to_category_id to reassign them."
            )
        
        # Validate reassignment category exists and belongs to user
        reassign_category = category_crud.get(db, id=reassign_to_category_id)
        if not reassign_category or reassign_category.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reassignment category not found"
            )
        
        # Reassign expenses
        for expense in expenses_with_category:
            expense.category_id = reassign_to_category_id
            db.add(expense)
        
        for expense in expenses_with_subcategory:
            expense.subcategory_id = None  # Remove subcategory reference
            expense.category_id = reassign_to_category_id
            db.add(expense)
        
        db.commit()
    
    # Soft delete the category
    category_crud.deactivate(db, category_id=category_id, user_id=current_user.id)
    
    return {
        "message": "Category deleted successfully",
        "reassigned_expenses": total_expenses,
        "reassigned_to": reassign_category.name if total_expenses > 0 else None
    }


@router.get("/{category_id}/stats")
def get_category_stats(
    *,
    db: Session = Depends(get_db),
    category_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get category statistics
    """
    from app.crud.crud_expense import expense_crud
    
    category = category_crud.get(db, id=category_id)
    if not category or category.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Get expense counts and totals
    expenses_as_category = expense_crud.get_by_category(db, category_id=category_id)
    expenses_as_subcategory = expense_crud.get_by_subcategory(db, subcategory_id=category_id)
    
    total_expenses = len(expenses_as_category) + len(expenses_as_subcategory)
    total_amount = sum([float(e.amount_in_base_currency or e.amount) for e in expenses_as_category + expenses_as_subcategory])
    
    # Get subcategory count
    subcategories = category_crud.get_subcategories(db, user_id=current_user.id, parent_id=category_id)
    
    return {
        "category_id": category_id,
        "category_name": category.name,
        "expense_count": total_expenses,
        "total_amount": total_amount,
        "subcategory_count": len(subcategories),
        "can_delete": total_expenses == 0 and len(subcategories) == 0
    }


@router.post("/reorder")
def reorder_categories(
    *,
    db: Session = Depends(get_db),
    category_orders: List[dict],
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Reorder categories
    """
    updated_categories = category_crud.reorder_categories(
        db, user_id=current_user.id, category_orders=category_orders
    )
    return {
        "message": "Categories reordered successfully",
        "updated_count": len(updated_categories)
    }