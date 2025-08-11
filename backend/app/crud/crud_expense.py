"""
CRUD operations for Expense model
"""

from typing import List, Optional, Any, Dict
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc, Text

from app.crud.base import CRUDBase
from app.db.models.expense import Expense, ExpenseAttachment, SharedExpense
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


class CRUDExpense(CRUDBase[Expense, ExpenseCreate, ExpenseUpdate]):
    """CRUD operations for Expense"""
    
    def get_by_user(
        self, 
        db: Session, 
        *, 
        user_id: Any,
        skip: int = 0,
        limit: int = 100,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[Any] = None,
        subcategory_id: Optional[Any] = None,
        currency: Optional[str] = None,
        search: Optional[str] = None,
        tags: Optional[List[str]] = None,
        sort_by: str = "expense_date",
        sort_order: str = "desc"
    ) -> List[Expense]:
        """Get expenses for a user with filtering and sorting"""
        query = db.query(Expense).filter(Expense.user_id == user_id)
        
        # Date filtering
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)
        
        # Category filtering
        if category_id and subcategory_id:
            # Both primary category and subcategory specified
            query = query.filter(
                and_(
                    Expense.category_id == category_id,
                    Expense.subcategory_id == subcategory_id
                )
            )
        elif category_id:
            # Only primary category specified - include expenses from category and its subcategories
            query = query.filter(
                or_(
                    Expense.category_id == category_id,
                    Expense.subcategory_id == category_id
                )
            )
        elif subcategory_id:
            # Only subcategory specified
            query = query.filter(Expense.subcategory_id == subcategory_id)
        
        # Currency filtering
        if currency:
            query = query.filter(Expense.currency == currency)
        
        # Search filtering
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Expense.description.ilike(search_pattern),
                    Expense.vendor.ilike(search_pattern),
                    Expense.location.ilike(search_pattern),
                    Expense.notes.ilike(search_pattern)
                )
            )
        
        # Tag filtering
        if tags:
            # Filter expenses that contain all specified tags
            # Using PostgreSQL JSON text search for better compatibility
            for tag in tags:
                query = query.filter(
                    and_(
                        Expense.tags.isnot(None),
                        func.cast(Expense.tags, Text).like(f'%"{tag}"%')
                    )
                )
        
        # Sorting
        sort_column = getattr(Expense, sort_by, Expense.expense_date)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
        
        return query.offset(skip).limit(limit).all()
    
    def count_by_user(
        self,
        db: Session,
        *,
        user_id: Any,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[Any] = None,
        currency: Optional[str] = None,
        search: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> int:
        """Count expenses for a user with filtering"""
        query = db.query(Expense).filter(Expense.user_id == user_id)
        
        # Apply same filters as get_by_user
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)
        if category_id:
            query = query.filter(
                or_(
                    Expense.category_id == category_id,
                    Expense.subcategory_id == category_id
                )
            )
        if currency:
            query = query.filter(Expense.currency == currency)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Expense.description.ilike(search_pattern),
                    Expense.vendor.ilike(search_pattern),
                    Expense.location.ilike(search_pattern),
                    Expense.notes.ilike(search_pattern)
                )
            )
        
        # Tag filtering
        if tags:
            # Filter expenses that contain all specified tags
            # Using PostgreSQL JSON text search for better compatibility
            for tag in tags:
                query = query.filter(
                    and_(
                        Expense.tags.isnot(None),
                        func.cast(Expense.tags, Text).like(f'%"{tag}"%')
                    )
                )
        
        return query.count()
    
    def create_for_user(
        self, 
        db: Session, 
        *, 
        obj_in: ExpenseCreate, 
        user_id: Any
    ) -> Expense:
        """Create a new expense for a user"""
        db_obj = Expense(
            amount=str(obj_in.amount),
            currency=obj_in.currency,
            amount_in_base_currency=str(obj_in.amount_in_base_currency) if obj_in.amount_in_base_currency else None,
            exchange_rate=str(obj_in.exchange_rate) if obj_in.exchange_rate else None,
            description=obj_in.description,
            expense_date=obj_in.expense_date,
            user_id=user_id,
            category_id=obj_in.category_id,
            subcategory_id=obj_in.subcategory_id,
            payment_method=obj_in.payment_method,
            notes=obj_in.notes,
            location=obj_in.location,
            vendor=obj_in.vendor,
            is_shared=obj_in.is_shared,
            shared_with=obj_in.shared_with,
            tags=obj_in.tags
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_monthly_summary(
        self, 
        db: Session, 
        *, 
        user_id: Any, 
        year: int, 
        month: int
    ) -> Dict[str, Any]:
        """Get monthly expense summary for a user"""
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        # Get expenses for the month
        expenses = self.get_by_user(
            db, 
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Calculate totals
        total_amount = sum(expense.amount_in_base_currency_decimal for expense in expenses)
        total_count = len(expenses)
        
        # Group by category
        category_totals = {}
        for expense in expenses:
            if expense.category:
                cat_name = expense.category.name
                if cat_name not in category_totals:
                    category_totals[cat_name] = {
                        "amount": 0,
                        "count": 0,
                        "category_id": expense.category.id
                    }
                category_totals[cat_name]["amount"] += expense.amount_in_base_currency_decimal
                category_totals[cat_name]["count"] += 1
        
        return {
            "year": year,
            "month": month,
            "total_amount": total_amount,
            "total_count": total_count,
            "category_breakdown": category_totals,
            "expenses": expenses
        }
    
    def get_yearly_summary(
        self, 
        db: Session, 
        *, 
        user_id: Any, 
        year: int
    ) -> Dict[str, Any]:
        """Get yearly expense summary for a user"""
        start_date = date(year, 1, 1)
        end_date = date(year + 1, 1, 1)
        
        # Get monthly totals
        monthly_totals = []
        for month in range(1, 13):
            monthly_summary = self.get_monthly_summary(db, user_id=user_id, year=year, month=month)
            monthly_totals.append({
                "month": month,
                "total_amount": monthly_summary["total_amount"],
                "total_count": monthly_summary["total_count"]
            })
        
        # Calculate yearly totals
        yearly_total = sum(month["total_amount"] for month in monthly_totals)
        yearly_count = sum(month["total_count"] for month in monthly_totals)
        
        return {
            "year": year,
            "total_amount": yearly_total,
            "total_count": yearly_count,
            "monthly_breakdown": monthly_totals
        }
    
    def get_by_category(
        self, 
        db: Session, 
        *, 
        category_id: Any
    ) -> List[Expense]:
        """Get expenses that use this category as primary category"""
        return db.query(Expense).filter(Expense.category_id == category_id).all()
    
    def get_by_subcategory(
        self, 
        db: Session, 
        *, 
        subcategory_id: Any
    ) -> List[Expense]:
        """Get expenses that use this category as subcategory"""
        return db.query(Expense).filter(Expense.subcategory_id == subcategory_id).all()
    
    def get_by_category_or_subcategory(
        self, 
        db: Session, 
        *, 
        user_id: Any, 
        category_id: Any,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[Expense]:
        """Get expenses by category (as primary or subcategory)"""
        return self.get_by_user(
            db,
            user_id=user_id,
            category_id=category_id,
            start_date=start_date,
            end_date=end_date
        )


class CRUDExpenseAttachment(CRUDBase[ExpenseAttachment, dict, dict]):
    """CRUD operations for ExpenseAttachment"""
    
    def create_attachment(
        self,
        db: Session,
        *,
        expense_id: Any,
        filename: str,
        original_filename: str,
        file_path: str,
        file_size: int,
        mime_type: str
    ) -> ExpenseAttachment:
        """Create a new expense attachment"""
        db_obj = ExpenseAttachment(
            expense_id=expense_id,
            filename=filename,
            original_filename=original_filename,
            file_path=file_path,
            file_size=str(file_size),
            mime_type=mime_type
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_by_expense(self, db: Session, *, expense_id: Any) -> List[ExpenseAttachment]:
        """Get all attachments for an expense"""
        return (
            db.query(ExpenseAttachment)
            .filter(ExpenseAttachment.expense_id == expense_id)
            .all()
        )


# Create instances
expense_crud = CRUDExpense(Expense)
expense_attachment_crud = CRUDExpenseAttachment(ExpenseAttachment)