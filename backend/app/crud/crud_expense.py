"""
CRUD operations for Expense model
"""

from typing import List, Optional, Any, Dict
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc, Text

from app.crud.base import CRUDBase
from app.db.models.expense import Expense, ExpenseAttachment, SharedExpense, ExpenseShare
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseShareCreate


class CRUDExpense(CRUDBase[Expense, ExpenseCreate, ExpenseUpdate]):
    """CRUD operations for Expense"""
    
    def get_by_user(
        self, 
        db: Session, 
        *, 
        user_id: Any,
        skip: int = 0,
        limit: int = 9000,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[Any] = None,
        subcategory_id: Optional[Any] = None,
        currency: Optional[str] = None,
        payment_method: Optional[str] = None,
        payment_method_id: Optional[Any] = None,
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
        
        # Payment method filtering
        if payment_method_id:
            # Filter by new user payment method ID
            query = query.filter(Expense.payment_method_id == payment_method_id)
        elif payment_method:
            # Filter by legacy payment method string
            query = query.filter(Expense.payment_method == payment_method)
        
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
        payment_method: Optional[str] = None,
        payment_method_id: Optional[Any] = None,
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
        
        # Payment method filtering
        if payment_method_id:
            query = query.filter(Expense.payment_method_id == payment_method_id)
        elif payment_method:
            query = query.filter(Expense.payment_method == payment_method)
        
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
        """Create a new expense for a user with shared expense support"""
        from decimal import Decimal
        
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
            payment_method_id=obj_in.payment_method_id,
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
        
        # Handle shared expense configuration
        if obj_in.is_shared and obj_in.shared_expense_config:
            
            total_amount = Decimal(obj_in.amount_in_base_currency or obj_in.amount)
            participants = obj_in.shared_expense_config.participants
            
            # Process share configuration
            if obj_in.shared_expense_config.auto_calculate:
                # Auto-calculate equal shares if requested
                equal_percentage = Decimal("100") / Decimal(len(participants))
                for participant in participants:
                    if participant.share_type == "equal":
                        participant.share_percentage = equal_percentage
                        participant.share_amount = (total_amount * equal_percentage / Decimal("100"))
            
            # Create expense shares
            for participant in participants:
                share_amount = participant.share_amount
                if not share_amount:
                    # Calculate based on percentage if amount not provided
                    share_amount = (total_amount * participant.share_percentage / Decimal("100"))
                
                # Create expense share directly to avoid circular import
                expense_share = ExpenseShare(
                    expense_id=db_obj.id,
                    user_id=participant.user_id,
                    share_percentage=str(participant.share_percentage),
                    share_amount=str(share_amount),
                    currency=obj_in.currency,
                    share_type=participant.share_type,
                    custom_amount=str(participant.custom_amount) if participant.custom_amount else None
                )
                db.add(expense_share)
            
            # Commit the expense shares
            db.commit()
            
            # Refresh the expense object to load the relationships
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


class CRUDExpenseShare(CRUDBase[ExpenseShare, ExpenseShareCreate, dict]):
    """CRUD operations for ExpenseShare"""
    
    def create_share(
        self,
        db: Session,
        *,
        expense_id: Any,
        user_id: Any,
        share_percentage: Any,
        share_amount: Any,
        currency: str,
        share_type: str = "percentage",
        custom_amount: Any = None
    ) -> ExpenseShare:
        """Create a new expense share"""
        db_obj = ExpenseShare(
            expense_id=expense_id,
            user_id=user_id,
            share_percentage=str(share_percentage),
            share_amount=str(share_amount),
            currency=currency,
            share_type=share_type,
            custom_amount=str(custom_amount) if custom_amount else None
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_by_expense(self, db: Session, *, expense_id: Any) -> List[ExpenseShare]:
        """Get all shares for an expense"""
        return (
            db.query(ExpenseShare)
            .filter(ExpenseShare.expense_id == expense_id)
            .all()
        )
    
    def get_by_user_and_expense(self, db: Session, *, user_id: Any, expense_id: Any) -> Optional[ExpenseShare]:
        """Get a specific user's share for an expense"""
        return (
            db.query(ExpenseShare)
            .filter(ExpenseShare.user_id == user_id, ExpenseShare.expense_id == expense_id)
            .first()
        )
    
    def delete_by_expense(self, db: Session, *, expense_id: Any) -> int:
        """Delete all shares for an expense"""
        deleted_count = (
            db.query(ExpenseShare)
            .filter(ExpenseShare.expense_id == expense_id)
            .delete()
        )
        db.commit()
        return deleted_count
    
    def update_shares_for_expense(
        self, 
        db: Session, 
        *, 
        expense_id: Any, 
        shares: List[ExpenseShareCreate]
    ) -> List[ExpenseShare]:
        """Update all shares for an expense (replace existing)"""
        # Delete existing shares
        self.delete_by_expense(db, expense_id=expense_id)
        
        # Create new shares
        created_shares = []
        for share_data in shares:
            db_obj = ExpenseShare(
                expense_id=expense_id,
                user_id=share_data.user_id,
                share_percentage=str(share_data.share_percentage),
                share_amount=str(share_data.share_amount),
                currency=share_data.currency,
                share_type=share_data.share_type,
                custom_amount=str(share_data.custom_amount) if share_data.custom_amount else None
            )
            db.add(db_obj)
            created_shares.append(db_obj)
        
        db.commit()
        for share in created_shares:
            db.refresh(share)
        
        return created_shares


# Create instances
expense_crud = CRUDExpense(Expense)
expense_attachment_crud = CRUDExpenseAttachment(ExpenseAttachment)
expense_share_crud = CRUDExpenseShare(ExpenseShare)