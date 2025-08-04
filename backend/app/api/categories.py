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