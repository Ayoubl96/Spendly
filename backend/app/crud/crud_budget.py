"""
CRUD operations for Budget model
"""

from typing import List, Optional, Any, Dict
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

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
        category_id: Optional[Any] = None
    ) -> List[Budget]:
        """Get budgets for a user with filtering"""
        query = db.query(Budget).filter(Budget.user_id == user_id)
        
        if is_active is not None:
            query = query.filter(Budget.is_active == is_active)
        
        if period_type:
            query = query.filter(Budget.period_type == period_type)
        
        if category_id:
            query = query.filter(Budget.category_id == category_id)
        
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
        db_obj = Budget(
            name=obj_in.name,
            amount=str(obj_in.amount),
            currency=obj_in.currency,
            period_type=obj_in.period_type,
            start_date=obj_in.start_date,
            end_date=obj_in.end_date,
            user_id=user_id,
            category_id=obj_in.category_id,
            alert_threshold=str(obj_in.alert_threshold)
        )
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
            "end_date": budget.end_date
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
            "budgets": budget_performances
        }
    
    def get_by_category(
        self, 
        db: Session, 
        *, 
        user_id: Any, 
        category_id: Any
    ) -> List[Budget]:
        """Get budgets for a specific category"""
        return (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                Budget.category_id == category_id,
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