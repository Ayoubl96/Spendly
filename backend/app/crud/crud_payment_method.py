"""
CRUD operations for User Payment Methods
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func, Float
from uuid import UUID

from app.crud.base import CRUDBase
from app.db.models.payment_method import UserPaymentMethod
from app.db.models.expense import Expense
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate, DEFAULT_PAYMENT_METHODS


class CRUDPaymentMethod(CRUDBase[UserPaymentMethod, PaymentMethodCreate, PaymentMethodUpdate]):
    """CRUD operations for user payment methods"""
    
    def get_by_user(
        self, 
        db: Session, 
        *, 
        user_id: UUID, 
        include_inactive: bool = False
    ) -> List[UserPaymentMethod]:
        """Get all payment methods for a user"""
        query = db.query(self.model).filter(self.model.user_id == user_id)
        
        if not include_inactive:
            query = query.filter(self.model.is_active == True)
        
        return query.order_by(self.model.sort_order, self.model.name).all()
    
    def get_by_user_and_name(
        self, 
        db: Session, 
        *, 
        user_id: UUID, 
        name: str
    ) -> Optional[UserPaymentMethod]:
        """Get payment method by user and name"""
        return db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.name == name,
                self.model.is_active == True
            )
        ).first()
    
    def create_for_user(
        self, 
        db: Session, 
        *, 
        obj_in: PaymentMethodCreate, 
        user_id: UUID
    ) -> UserPaymentMethod:
        """Create a payment method for a specific user"""
        db_obj = UserPaymentMethod(
            user_id=user_id,
            name=obj_in.name,
            description=obj_in.description,
            icon=obj_in.icon,
            color=obj_in.color,
            sort_order=obj_in.sort_order,
            is_active=obj_in.is_active
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update_for_user(
        self, 
        db: Session, 
        *, 
        db_obj: UserPaymentMethod, 
        obj_in: PaymentMethodUpdate,
        user_id: UUID
    ) -> UserPaymentMethod:
        """Update a payment method for a specific user"""
        # Verify ownership
        if db_obj.user_id != user_id:
            raise ValueError("Payment method does not belong to user")
        
        return super().update(db, db_obj=db_obj, obj_in=obj_in)
    
    def soft_delete_for_user(
        self, 
        db: Session, 
        *, 
        id: UUID, 
        user_id: UUID
    ) -> Optional[UserPaymentMethod]:
        """Soft delete a payment method for a specific user"""
        db_obj = db.query(self.model).filter(
            and_(
                self.model.id == id,
                self.model.user_id == user_id
            )
        ).first()
        
        if db_obj:
            db_obj.soft_delete()
            db.commit()
            db.refresh(db_obj)
            return db_obj
        return None
    
    def reorder_for_user(
        self, 
        db: Session, 
        *, 
        user_id: UUID, 
        payment_method_orders: List[dict]
    ) -> List[UserPaymentMethod]:
        """Reorder payment methods for a user"""
        updated_methods = []
        
        for item in payment_method_orders:
            db_obj = db.query(self.model).filter(
                and_(
                    self.model.id == item["id"],
                    self.model.user_id == user_id
                )
            ).first()
            
            if db_obj:
                db_obj.sort_order = item["sort_order"]
                updated_methods.append(db_obj)
        
        db.commit()
        
        # Refresh and return updated objects
        for obj in updated_methods:
            db.refresh(obj)
        
        return updated_methods
    
    def get_with_stats(
        self, 
        db: Session, 
        *, 
        user_id: UUID, 
        include_inactive: bool = False
    ) -> List[dict]:
        """Get payment methods with usage statistics"""
        query = db.query(
            self.model,
            func.count(Expense.id).label("expense_count"),
            func.coalesce(func.sum(func.cast(Expense.amount, Float)), 0).label("total_amount"),
            func.max(Expense.expense_date).label("last_used")
        ).outerjoin(
            Expense, 
            and_(
                Expense.payment_method_id == self.model.id,
                Expense.user_id == user_id
            )
        ).filter(
            self.model.user_id == user_id
        )
        
        if not include_inactive:
            query = query.filter(self.model.is_active == True)
        
        results = query.group_by(self.model.id).order_by(
            self.model.sort_order, 
            self.model.name
        ).all()
        
        # Format results
        formatted_results = []
        for payment_method, expense_count, total_amount, last_used in results:
            formatted_results.append({
                "payment_method": payment_method,
                "expense_count": expense_count or 0,
                "total_amount": float(total_amount or 0),
                "last_used": last_used,
                "can_delete": expense_count == 0
            })
        
        return formatted_results
    
    def create_default_payment_methods(
        self, 
        db: Session, 
        *, 
        user_id: UUID
    ) -> List[UserPaymentMethod]:
        """Create default payment methods for a new user"""
        created_methods = []
        
        for default_method in DEFAULT_PAYMENT_METHODS:
            # Check if method already exists
            existing = self.get_by_user_and_name(
                db, user_id=user_id, name=default_method["name"]
            )
            
            if not existing:
                db_obj = UserPaymentMethod(
                    user_id=user_id,
                    name=default_method["name"],
                    description=default_method["description"],
                    icon=default_method["icon"],
                    color=default_method["color"],
                    sort_order=default_method["sort_order"],
                    is_default=default_method["is_default"],
                    is_active=True
                )
                db.add(db_obj)
                created_methods.append(db_obj)
        
        if created_methods:
            db.commit()
            for obj in created_methods:
                db.refresh(obj)
        
        return created_methods
    
    def migrate_legacy_payment_method(
        self, 
        db: Session, 
        *, 
        user_id: UUID, 
        legacy_value: str
    ) -> Optional[UserPaymentMethod]:
        """Migrate legacy payment method string to user payment method"""
        # Map legacy values to default payment method names
        legacy_mapping = {
            "cash": "Cash",
            "card": "Card", 
            "bank_transfer": "Bank Transfer",
            "other": "Other"
        }
        
        payment_method_name = legacy_mapping.get(legacy_value)
        if not payment_method_name:
            return None
        
        # Find or create the corresponding user payment method
        payment_method = self.get_by_user_and_name(
            db, user_id=user_id, name=payment_method_name
        )
        
        if not payment_method:
            # Create default payment methods if they don't exist
            self.create_default_payment_methods(db, user_id=user_id)
            payment_method = self.get_by_user_and_name(
                db, user_id=user_id, name=payment_method_name
            )
        
        return payment_method


# Create instance
payment_method = CRUDPaymentMethod(UserPaymentMethod)
