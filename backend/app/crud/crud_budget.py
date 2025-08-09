"""
CRUD operations for Budget model
"""

from typing import List, Optional, Any, Dict
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from uuid import UUID

from app.crud.base import CRUDBase
from app.db.models.budget import Budget
from app.schemas.budget import BudgetCreate, BudgetUpdate


class CRUDBudget(CRUDBase[Budget, BudgetCreate, BudgetUpdate]):
    """CRUD operations for Budget"""
    
    def get_by_user(
        self, 
        db: Session, 
        *, 
        user_id: Any,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        period_type: Optional[str] = None,
        category_id: Optional[Any] = None,
        budget_group_id: Optional[Any] = None
    ) -> List[Budget]:
        """Get budgets for a user with filtering"""
        query = db.query(Budget).filter(Budget.user_id == user_id)
        
        if is_active is not None:
            query = query.filter(Budget.is_active == is_active)
        
        if period_type:
            query = query.filter(Budget.period_type == period_type)
        
        if category_id:
            # Convert category_id to UUID for filtering if it's a string
            filter_category_id = UUID(category_id) if isinstance(category_id, str) else category_id
            query = query.filter(Budget.category_id == filter_category_id)
        
        if budget_group_id:
            # Convert budget_group_id to UUID for filtering if it's a string
            filter_budget_group_id = UUID(budget_group_id) if isinstance(budget_group_id, str) else budget_group_id
            query = query.filter(Budget.budget_group_id == filter_budget_group_id)
        
        return query.order_by(Budget.start_date.desc()).offset(skip).limit(limit).all()
    
    def get_active_budgets(self, db: Session, *, user_id: Any) -> List[Budget]:
        """Get all active budgets for a user"""
        return self.get_by_user(db, user_id=user_id, is_active=True)
    
    def get_current_budgets(
        self, 
        db: Session, 
        *, 
        user_id: Any,
        check_date: Optional[date] = None
    ) -> List[Budget]:
        """Get budgets that are active for the given date"""
        if check_date is None:
            check_date = date.today()
        
        query = (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                Budget.is_active == True,
                Budget.start_date <= check_date
            )
        )
        
        # Filter by end_date if it exists
        query = query.filter(
            or_(
                Budget.end_date.is_(None),
                Budget.end_date >= check_date
            )
        )
        
        return query.all()
    
    def create_for_user(
        self, 
        db: Session, 
        *, 
        obj_in: BudgetCreate, 
        user_id: Any
    ) -> Budget:
        """Create a new budget for a user"""
        # Convert category_id from string to UUID if provided
        category_id = None
        if obj_in.category_id:
            category_id = UUID(obj_in.category_id) if isinstance(obj_in.category_id, str) else obj_in.category_id
        
        # Convert budget_group_id from string to UUID if provided
        budget_group_id = None
        if hasattr(obj_in, 'budget_group_id') and obj_in.budget_group_id:
            budget_group_id = UUID(obj_in.budget_group_id) if isinstance(obj_in.budget_group_id, str) else obj_in.budget_group_id
        
        db_obj = Budget(
            name=obj_in.name,
            amount=str(obj_in.amount),
            currency=obj_in.currency,
            period_type=obj_in.period_type,
            start_date=obj_in.start_date,
            end_date=obj_in.end_date,
            user_id=user_id,
            category_id=category_id,
            budget_group_id=budget_group_id,
            alert_threshold=str(obj_in.alert_threshold),
            is_active=obj_in.is_active
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(self, db: Session, *, db_obj: Budget, obj_in: BudgetUpdate) -> Budget:
        """Update budget with UUID conversion for category_id and budget_group_id"""
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # Convert category_id from string to UUID if provided
        if 'category_id' in update_data and update_data['category_id']:
            if isinstance(update_data['category_id'], str):
                update_data['category_id'] = UUID(update_data['category_id'])
        
        # Convert budget_group_id from string to UUID if provided
        if 'budget_group_id' in update_data and update_data['budget_group_id']:
            if isinstance(update_data['budget_group_id'], str):
                update_data['budget_group_id'] = UUID(update_data['budget_group_id'])
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_budget_performance(
        self, 
        db: Session, 
        *, 
        budget: Budget
    ) -> Dict[str, Any]:
        """Get budget performance metrics"""
        spent_amount = budget.get_spent_amount(db)
        remaining_amount = budget.get_remaining_amount(db)
        percentage_used = budget.get_percentage_used(db)
        status = budget.get_status(db)
        is_over_budget = budget.is_over_budget(db)
        should_alert = budget.should_alert(db)
        
        return {
            "budget_id": budget.id,
            "name": budget.name,
            "amount": budget.amount_decimal,
            "spent": spent_amount,
            "remaining": remaining_amount,
            "percentage_used": percentage_used,
            "status": status,
            "is_over_budget": is_over_budget,
            "should_alert": should_alert,
            "alert_threshold": budget.alert_threshold_decimal,
            "currency": budget.currency,
            "period_type": budget.period_type,
            "start_date": budget.start_date,
            "end_date": budget.end_date,
            # Include category_id so the summary API exposes it per budget (serialize to string)
            "category_id": str(budget.category_id) if budget.category_id else None
        }
    
    def get_budget_summary(
        self, 
        db: Session, 
        *, 
        user_id: Any,
        check_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Get overall budget summary for a user"""
        current_budgets = self.get_current_budgets(db, user_id=user_id, check_date=check_date)
        
        total_budget = sum(budget.amount_decimal for budget in current_budgets)
        total_spent = sum(budget.get_spent_amount(db) for budget in current_budgets)
        total_remaining = total_budget - total_spent
        
        # Calculate status counts
        status_counts = {"on_track": 0, "warning": 0, "over_budget": 0}
        budget_performances = []
        
        for budget in current_budgets:
            performance = self.get_budget_performance(db, budget=budget)
            budget_performances.append(performance)
            status_counts[performance["status"]] += 1
        
        overall_percentage = (total_spent / total_budget * 100) if total_budget > 0 else 0
        overall_status = "on_track"
        
        if total_spent > total_budget:
            overall_status = "over_budget"
        elif overall_percentage >= 80:  # Default warning threshold
            overall_status = "warning"
        
        return {
            "total_budget": total_budget,
            "total_spent": total_spent,
            "total_remaining": total_remaining,
            "overall_percentage": overall_percentage,
            "overall_status": overall_status,
            "budget_count": len(current_budgets),
            "status_counts": status_counts,
            "budgets": budget_performances,
            "category_id": current_budgets[0].category_id
        }
    
    def get_by_category(
        self, 
        db: Session, 
        *, 
        user_id: Any, 
        category_id: Any
    ) -> List[Budget]:
        """Get budgets for a specific category"""
        # Convert category_id to UUID if it's a string
        filter_category_id = UUID(category_id) if isinstance(category_id, str) else category_id
        
        return (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                Budget.category_id == filter_category_id,
                Budget.is_active == True
            )
            .order_by(Budget.start_date.desc())
            .all()
        )
    
    def get_by_budget_group(
        self, 
        db: Session, 
        *, 
        user_id: Any, 
        budget_group_id: Any
    ) -> List[Budget]:
        """Get budgets for a specific budget group"""
        # Convert budget_group_id to UUID if it's a string
        filter_budget_group_id = UUID(budget_group_id) if isinstance(budget_group_id, str) else budget_group_id
        
        return (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                Budget.budget_group_id == filter_budget_group_id,
                Budget.is_active == True
            )
            .order_by(Budget.start_date.desc())
            .all()
        )
    
    def deactivate(self, db: Session, *, budget_id: Any, user_id: Any) -> Optional[Budget]:
        """Deactivate a budget"""
        budget = (
            db.query(Budget)
            .filter(Budget.id == budget_id, Budget.user_id == user_id)
            .first()
        )
        if budget:
            budget.is_active = False
            db.add(budget)
            db.commit()
            db.refresh(budget)
        return budget
    
    def get_budget_alerts(
        self, 
        db: Session, 
        *, 
        user_id: Any
    ) -> List[Dict[str, Any]]:
        """Get budgets that should trigger alerts"""
        current_budgets = self.get_current_budgets(db, user_id=user_id)
        alerts = []
        
        for budget in current_budgets:
            if budget.should_alert(db):
                performance = self.get_budget_performance(db, budget=budget)
                alerts.append({
                    "budget": budget,
                    "performance": performance,
                    "alert_type": "over_budget" if performance["is_over_budget"] else "warning"
                })
        
        return alerts


# Create instance
budget_crud = CRUDBudget(Budget)