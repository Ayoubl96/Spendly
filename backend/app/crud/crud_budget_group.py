"""
CRUD operations for Budget Groups
"""

from typing import List, Optional, Dict, Any
from datetime import date
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc
from uuid import UUID
from decimal import Decimal

from app.crud.base import CRUDBase
from app.db.models.budget_group import BudgetGroup
from app.db.models.category import Category
from app.db.models.budget import Budget
from app.schemas.budget_group import (
    BudgetGroupCreate, 
    BudgetGroupUpdate, 
    BudgetGroupSummary,
    BudgetGroupStatus,
    CategorySummary,
    GenerateBudgetsRequest,
    BulkBudgetsUpdateRequest
)


class CRUDBudgetGroup(CRUDBase[BudgetGroup, BudgetGroupCreate, BudgetGroupUpdate]):
    
    def get_by_user(
        self,
        db: Session,
        *,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        period_type: Optional[str] = None,
        currency: Optional[str] = None
    ) -> List[BudgetGroup]:
        """Get budget groups for a specific user with filtering"""
        query = db.query(self.model).filter(self.model.user_id == user_id)
        
        if is_active is not None:
            query = query.filter(self.model.is_active == is_active)
        
        if period_type:
            query = query.filter(self.model.period_type == period_type)
        
        if currency:
            query = query.filter(self.model.currency == currency)
        
        return query.order_by(desc(self.model.start_date)).offset(skip).limit(limit).all()
    
    def get_current_period_groups(
        self,
        db: Session,
        *,
        user_id: UUID,
        check_date: Optional[date] = None
    ) -> List[BudgetGroup]:
        """Get budget groups that are active for the current period"""
        if check_date is None:
            check_date = date.today()
        
        return db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.is_active == True,
                self.model.start_date <= check_date,
                self.model.end_date >= check_date
            )
        ).order_by(desc(self.model.start_date)).all()
    
    def get_with_budgets(
        self,
        db: Session,
        *,
        budget_group_id: UUID,
        user_id: UUID
    ) -> Optional[BudgetGroup]:
        """Get budget group with its associated budgets"""
        return db.query(self.model).options(
            joinedload(self.model.budgets)
        ).filter(
            and_(
                self.model.id == budget_group_id,
                self.model.user_id == user_id
            )
        ).first()
    
    def create_for_user(
        self,
        db: Session,
        *,
        obj_in: BudgetGroupCreate,
        user_id: UUID
    ) -> BudgetGroup:
        """Create a budget group for a specific user"""
        payload = obj_in.model_dump()
        # Keep only columns defined on the model
        db_fields = {
            "name": payload.get("name"),
            "description": payload.get("description"),
            "period_type": payload.get("period_type"),
            "start_date": payload.get("start_date"),
            "end_date": payload.get("end_date"),
            "currency": payload.get("currency"),
            "is_active": payload.get("is_active", True),
            "user_id": user_id,
        }
        
        db_obj = self.model(**db_fields)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # Optionally auto-create budgets for user's categories
        if obj_in.auto_create_budgets:
            self._generate_budgets_for_group(
                db,
                budget_group=db_obj,
                user_id=user_id,
                category_scope=obj_in.category_scope,
                default_amount=obj_in.default_amount,
                include_inactive=obj_in.include_inactive_categories,
                category_configs=obj_in.category_configs or [],
            )
            db.refresh(db_obj)
        
        return db_obj

    def _generate_budgets_for_group(
        self,
        db: Session,
        *,
        budget_group: BudgetGroup,
        user_id: UUID,
        category_scope: str = "all",
        default_amount: Decimal = Decimal("0"),
        include_inactive: bool = False,
        category_configs: List = None,
    ) -> int:
        """Generate budgets for categories within a group. Returns number created."""
        query = db.query(Category).filter(Category.user_id == user_id)
        if not include_inactive:
            query = query.filter(Category.is_active == True)

        if category_scope == "primary":
            query = query.filter(Category.parent_id == None)
        elif category_scope == "subcategories":
            query = query.filter(Category.parent_id != None)
        # else "all": no additional filter

        categories = query.order_by(Category.sort_order.asc(), Category.name.asc()).all()

        # Enforce DB constraint: budget amount must be > 0
        effective_amount = default_amount
        # Safety: should already be validated at schema level, but enforce anyway
        if effective_amount is None or effective_amount <= Decimal("0"):
            raise ValueError("Default amount must be greater than 0")

        # Create a map of category configs for quick lookup
        category_amounts = {}
        if category_configs:
            for config in category_configs:
                category_amounts[str(config.category_id)] = config.amount

        created = 0
        for cat in categories:
            # Skip if a budget already exists for this category in the group period
            exists = (
                db.query(Budget)
                .filter(
                    Budget.user_id == user_id,
                    Budget.budget_group_id == budget_group.id,
                    Budget.category_id == cat.id,
                    Budget.is_active == True,
                )
                .first()
            )
            if exists:
                continue

            # Use category-specific amount if configured, otherwise use default
            category_amount = category_amounts.get(str(cat.id), effective_amount)

            budget = Budget(
                name=f"{cat.name}",
                amount=str(category_amount),
                currency=budget_group.currency,
                period_type=budget_group.period_type,
                start_date=budget_group.start_date,
                end_date=budget_group.end_date,
                user_id=user_id,
                category_id=cat.id,
                budget_group_id=budget_group.id,
                alert_threshold="80.0",
                is_active=True,
            )
            db.add(budget)
            created += 1

        db.commit()
        return created

    def generate_budgets(
        self,
        db: Session,
        *,
        budget_group_id: UUID,
        user_id: UUID,
        request: GenerateBudgetsRequest,
    ) -> int:
        """Public method to generate budgets for a group on demand."""
        budget_group = self.get(db, id=budget_group_id)
        if not budget_group or budget_group.user_id != user_id:
            return 0
        return self._generate_budgets_for_group(
            db,
            budget_group=budget_group,
            user_id=user_id,
            category_scope=request.category_scope,
            default_amount=request.default_amount,
            include_inactive=request.include_inactive_categories,
        )

    def bulk_update_amounts(
        self,
        db: Session,
        *,
        budget_group_id: UUID,
        user_id: UUID,
        request: BulkBudgetsUpdateRequest,
    ) -> int:
        """Bulk update amounts for budgets in a given group. Returns number updated."""
        count = 0
        for item in request.items:
            # Skip invalid amounts (server-side protection)
            if item.amount < 0:
                continue
                
            budget = None
            if item.budget_id:
                budget = db.query(Budget).filter(
                    Budget.id == item.budget_id,
                    Budget.user_id == user_id,
                    Budget.budget_group_id == budget_group_id,
                ).first()
            elif item.category_id:
                budget = db.query(Budget).filter(
                    Budget.user_id == user_id,
                    Budget.budget_group_id == budget_group_id,
                    Budget.category_id == item.category_id,
                ).first()
            if not budget:
                continue
            budget.amount = str(item.amount)
            db.add(budget)
            count += 1
        db.commit()
        return count
    
    def get_budget_group_summary(
        self,
        db: Session,
        *,
        budget_group_id: UUID,
        user_id: UUID
    ) -> Optional[BudgetGroupSummary]:
        """Get comprehensive summary for a budget group"""
        budget_group = self.get_with_budgets(
            db, 
            budget_group_id=budget_group_id, 
            user_id=user_id
        )
        
        if not budget_group:
            return None
        
        # Calculate totals
        total_budgeted = budget_group.total_budgeted_amount
        total_spent = budget_group.get_total_spent_amount(db)
        total_remaining = total_budgeted - total_spent
        percentage_used = budget_group.get_percentage_used(db)
        status = BudgetGroupStatus(budget_group.get_status(db))
        
        # Get category summaries
        category_summaries_raw = budget_group.get_category_summary(db)
        category_summaries = {}
        
        for cat_name, cat_data in category_summaries_raw.items():
            # Convert subcategories dict
            subcategories = {}
            for subcat_name, subcat_data in cat_data.get("subcategories", {}).items():
                subcategories[subcat_name] = {
                    "categoryId": str(subcat_data["categoryId"]),
                    "categoryName": subcat_data["categoryName"],
                    "budgeted": subcat_data["budgeted"],
                    "spent": subcat_data["spent"],
                    "remaining": subcat_data["remaining"],
                    "percentage_used": (
                        (subcat_data["spent"] / subcat_data["budgeted"] * 100) 
                        if subcat_data["budgeted"] > 0 else Decimal("0")
                    )
                }
            
            category_summaries[cat_name] = CategorySummary(
                categoryId=str(cat_data["categoryId"]),
                categoryName=cat_data["categoryName"],
                budgeted=cat_data["budgeted"],
                spent=cat_data["spent"],
                remaining=cat_data["remaining"],
                percentage_used=(
                    (cat_data["spent"] / cat_data["budgeted"] * 100) 
                    if cat_data["budgeted"] > 0 else Decimal("0")
                ),
                main_category_budgeted=cat_data.get("main_category_budgeted", Decimal("0")),
                subcategories=subcategories
            )
        
        return BudgetGroupSummary(
            budget_group=budget_group,
            total_budgeted=total_budgeted,
            total_spent=total_spent,
            total_remaining=total_remaining,
            percentage_used=percentage_used,
            status=status,
            budget_count=len([b for b in budget_group.budgets if b.is_active]),
            category_summaries=category_summaries
        )
    
    def get_user_summary(
        self,
        db: Session,
        *,
        user_id: UUID,
        include_inactive: bool = False
    ) -> Dict[str, Any]:
        """Get summary of all budget groups for a user"""
        query = db.query(self.model).filter(self.model.user_id == user_id)
        
        if not include_inactive:
            query = query.filter(self.model.is_active == True)
        
        budget_groups = query.all()
        
        total_groups = len(budget_groups)
        active_groups = len([bg for bg in budget_groups if bg.is_active])
        current_period_groups = len([
            bg for bg in budget_groups 
            if bg.is_current_period() and bg.is_active
        ])
        
        # Calculate overall totals for current period groups
        total_budgeted = Decimal("0")
        total_spent = Decimal("0")
        
        for budget_group in budget_groups:
            if budget_group.is_current_period() and budget_group.is_active:
                total_budgeted += budget_group.total_budgeted_amount
                total_spent += budget_group.get_total_spent_amount(db)
        
        overall_percentage = (
            (total_spent / total_budgeted * 100) 
            if total_budgeted > 0 else Decimal("0")
        )
        
        # Determine overall status
        if total_spent > total_budgeted:
            overall_status = "over_budget"
        elif overall_percentage >= 80:
            overall_status = "warning"
        else:
            overall_status = "on_track"
        
        return {
            "total_groups": total_groups,
            "active_groups": active_groups,
            "current_period_groups": current_period_groups,
            "total_budgeted": total_budgeted,
            "total_spent": total_spent,
            "total_remaining": total_budgeted - total_spent,
            "overall_percentage": overall_percentage,
            "overall_status": overall_status
        }
    
    def deactivate(
        self,
        db: Session,
        *,
        budget_group_id: UUID,
        user_id: UUID
    ) -> Optional[BudgetGroup]:
        """Deactivate a budget group (soft delete)"""
        budget_group = db.query(self.model).filter(
            and_(
                self.model.id == budget_group_id,
                self.model.user_id == user_id
            )
        ).first()
        
        if budget_group:
            budget_group.is_active = False
            db.commit()
            db.refresh(budget_group)
        
        return budget_group
    
    def get_overlapping_groups(
        self,
        db: Session,
        *,
        user_id: UUID,
        start_date: date,
        end_date: date,
        exclude_id: Optional[UUID] = None
    ) -> List[BudgetGroup]:
        """Get budget groups that overlap with the given date range"""
        query = db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.is_active == True,
                or_(
                    and_(
                        self.model.start_date <= start_date,
                        self.model.end_date >= start_date
                    ),
                    and_(
                        self.model.start_date <= end_date,
                        self.model.end_date >= end_date
                    ),
                    and_(
                        self.model.start_date >= start_date,
                        self.model.end_date <= end_date
                    )
                )
            )
        )
        
        if exclude_id:
            query = query.filter(self.model.id != exclude_id)
        
        return query.all()


budget_group_crud = CRUDBudgetGroup(BudgetGroup)
