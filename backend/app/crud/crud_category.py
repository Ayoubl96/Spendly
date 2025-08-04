"""
CRUD operations for Category model
"""

from typing import List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.crud.base import CRUDBase
from app.db.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    """CRUD operations for Category"""
    
    def get_by_user(self, db: Session, *, user_id: Any) -> List[Category]:
        """Get all categories for a user"""
        return (
            db.query(Category)
            .filter(Category.user_id == user_id, Category.is_active == True)
            .order_by(Category.sort_order, Category.name)
            .all()
        )
    
    def get_primary_categories(self, db: Session, *, user_id: Any) -> List[Category]:
        """Get primary categories (no parent) for a user"""
        return (
            db.query(Category)
            .filter(
                Category.user_id == user_id,
                Category.parent_id.is_(None),
                Category.is_active == True
            )
            .order_by(Category.sort_order, Category.name)
            .all()
        )
    
    def get_subcategories(self, db: Session, *, user_id: Any, parent_id: Any) -> List[Category]:
        """Get subcategories for a parent category"""
        return (
            db.query(Category)
            .filter(
                Category.user_id == user_id,
                Category.parent_id == parent_id,
                Category.is_active == True
            )
            .order_by(Category.sort_order, Category.name)
            .all()
        )
    
    def get_by_name(
        self, 
        db: Session, 
        *, 
        user_id: Any, 
        name: str, 
        parent_id: Optional[Any] = None
    ) -> Optional[Category]:
        """Get category by name for a user (considering parent)"""
        query = db.query(Category).filter(
            Category.user_id == user_id,
            Category.name == name,
            Category.is_active == True
        )
        
        if parent_id is None:
            query = query.filter(Category.parent_id.is_(None))
        else:
            query = query.filter(Category.parent_id == parent_id)
        
        return query.first()
    
    def create_for_user(
        self, 
        db: Session, 
        *, 
        obj_in: CategoryCreate, 
        user_id: Any
    ) -> Category:
        """Create a new category for a user"""
        db_obj = Category(
            name=obj_in.name,
            parent_id=obj_in.parent_id,
            user_id=user_id,
            color=obj_in.color,
            icon=obj_in.icon,
            sort_order=obj_in.sort_order
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def deactivate(self, db: Session, *, category_id: Any, user_id: Any) -> Optional[Category]:
        """Deactivate a category (soft delete)"""
        category = (
            db.query(Category)
            .filter(Category.id == category_id, Category.user_id == user_id)
            .first()
        )
        if category:
            category.is_active = False
            db.add(category)
            db.commit()
            db.refresh(category)
        return category
    
    def reorder_categories(
        self, 
        db: Session, 
        *, 
        user_id: Any, 
        category_orders: List[dict]
    ) -> List[Category]:
        """Reorder categories for a user"""
        updated_categories = []
        
        for order_data in category_orders:
            category = (
                db.query(Category)
                .filter(
                    Category.id == order_data["id"],
                    Category.user_id == user_id
                )
                .first()
            )
            if category:
                category.sort_order = order_data["sort_order"]
                db.add(category)
                updated_categories.append(category)
        
        db.commit()
        
        for category in updated_categories:
            db.refresh(category)
        
        return updated_categories
    
    def get_category_tree(self, db: Session, *, user_id: Any) -> List[dict]:
        """Get hierarchical category tree for a user"""
        # Get all categories
        categories = self.get_by_user(db, user_id=user_id)
        
        # Build tree structure
        category_dict = {cat.id: cat for cat in categories}
        tree = []
        
        for category in categories:
            if category.parent_id is None:
                # Primary category
                cat_data = {
                    "id": str(category.id),
                    "name": category.name,
                    "color": category.color,
                    "icon": category.icon,
                    "sort_order": category.sort_order,
                    "expense_count": 0,
                    "total_amount": 0,
                    "subcategories": []
                }
                
                # Find subcategories
                for subcat in categories:
                    if subcat.parent_id == category.id:
                        cat_data["subcategories"].append({
                            "id": str(subcat.id),
                            "name": subcat.name,
                            "color": subcat.color,
                            "icon": subcat.icon,
                            "sort_order": subcat.sort_order,
                            "expense_count": 0,
                            "total_amount": 0,
                            "subcategories": []
                        })
                
                # Sort subcategories
                cat_data["subcategories"].sort(key=lambda x: (x["sort_order"], x["name"]))
                tree.append(cat_data)
        
        # Sort primary categories
        tree.sort(key=lambda x: (x["sort_order"], x["name"]))
        return tree


# Create instance
category_crud = CRUDCategory(Category)