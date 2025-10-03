from typing import List, Optional, Any, Dict
from datetime import date, datetime, timedelta
from calendar import monthrange
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc, extract
from decimal import Decimal

from app.db.models.expense import Expense
from app.db.models.category import Category
from app.schemas.analytics import (
    CategoryAnalytics,
    SubcategoryAnalytics,
    TrendAnalytics,
    MonthlyComparison,
    CategoryBreakdownItem,
    SubcategoryBreakdownItem,
    TrendDataPoint,
    MonthlyComparisonItem,
    AnalyticsSummary,
    PeriodType,
)


class CRUDAnalytics:
    def get_month_boundaries(self, year: int, month: int) -> tuple[date, date]:
        """
        Calculate the first and last day of a given month.

        Args:
            year: The year (e.g., 2024)
            month: The month (1-12)

        Returns:
            A tuple of (start_date, end_date) for the month
        """
        start_date = date(year, month, 1)
        last_day = monthrange(year, month)[1]
        end_date = date(year, month, last_day)

        return start_date, end_date

    def get_category_breakdown_by_month(
        self,
        db: Session,
        *,
        user_id: str,
        year: int,
        month: int,
        currency: Optional[str] = None,
    ) -> CategoryAnalytics:
        start_date, end_date = self.get_month_boundaries(year, month)

        query = db.query(Expense).filter(
            and_(
                Expense.user_id == user_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
            )
        )

        expenses = query.all()

        total_amount = sum(expense.amount for expense in expenses)

        # Group by category
        category_data = {}

        for expense in expenses:
            if expense.category_id:
                cat_id = str(expense.category_id)
                if cat_id not in category_data:
                    category = db.query(Category).filter(Category.id == cat_id).first()
                    category_name = category.name if category else "Uncategorized"
                    category_color = category.color if category else "#000000"
                    category_data[cat_id] = {
                        "category": expense.category_id,
                        "category_name": category_name,
                        "category_color": category_color,
                        "total_amount": Decimal("0"),
                        "expense_count": 0,
                    }
                category_data[cat_id]["total_amount"] += expense.amount
                category_data[cat_id]["expense_count"] += 1

        # Create category breakdown items
        categories = []

        for cat_id, data in category_data.items():
            percentage = (
                (data["total_amount"] / total_amount * 100)
                if total_amount > 0
                else Decimal("0")
            )
            categories.append(
                CategoryBreakdownItem(
                    category_id=cat_id,
                    category_name=data["category"].category_name,
                    category_color=data["category"].category_color,
                    total_amount=data["total_amount"],
                    expense_count=data["expense_count"],
                    percentage=percentage,
                )
            )

        # Sort by total amount
        categories.sort(key=lambda x: x.total_amount, reverse=True)

        return CategoryAnalytics(
            period_start=start_date,
            period_end=end_date,
            period_type=PeriodType.MONTHLY,
            total_amount=total_amount,
            currency=currency,
            categories=categories,
        )

    def get_subcategory_breakdown_by_month(
        self,
        db: Session,
        *,
        user_id: str,
        year: int,
        month: int,
        category_id: Optional[str] = None,
        currency: Optional[str] = None,
    ) -> SubcategoryAnalytics:
        start_date, end_date = self.get_month_boundaries(year, month)

        query = db.query(Expense).filter(
            and_(
                Expense.user_id == user_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
                Expense.subcategory_id.isnot(None),
            )
        )

        if category_id:
            query = query.filter(Expense.category_id == category_id)

        expenses = query.all()

        total_amount = sum(expense.amount for expense in expenses)
        total_expenses = len(expenses)

        # Group by subcategory

        subcategory_data = {}
        parent_category_info = None

        for expense in expenses:
            if expense.subcategory_id:
                subcat_id = str(expense.subcategory_id)
                category = db.query(Category).filter(Category.id == subcat_id).first()
                subcategory_name = category.name if category else "Uncategorized"
                parent_category = category.parent_id if category else None
                if subcat_id not in subcategory_data:
                    subcategory_data[subcat_id] = {
                        "subcategory_name": subcategory_name,
                        "parent_category": parent_category,
                        "total_amount": Decimal("0"),
                        "total_expenses": 0,
                    }
                    if not parent_category_info and expense.parent_category_id:
                        parent_category_info = {
                            "parent_category_name": db.query(Category)
                            .filter(Category.id == expense.parent_category_id)
                            .first()
                            .name,
                            "parent_category_id": expense.parent_category_id,
                        }
                subcategory_data[subcat_id]["total_amount"] += expense.amount
                subcategory_data[subcat_id]["total_expenses"] += 1

        subcategories = []
        for subcat_id, data in subcategory_data.items():
            percentage = (
                (data["total_amount"] / total_amount) * 100 if total_amount > 0 else 0
            )
            subcategories.append(
                SubcategoryBreakdownItem(
                    subcategory_id=subcat_id,
                    subcategory_name=data["subcategory"].subcategory_name,
                    parent_category_id=str(data["parent_category"].parent_category_id)
                    if data["parent_category"]
                    else None,
                    total_amount=data["total_amount"],
                    expense_count=data["total_expenses"],
                    percentage=percentage,
                )
            )

        subcategories.sort(key=lambda x: x.total_amount, reverse=True)

        return SubcategoryAnalytics(
            period_start=start_date,
            period_end=end_date,
            period_type=PeriodType.MONTHLY,
            total_amount=total_amount,
            total_expenses=total_expenses,
            currency=currency,
            subcategories=subcategories,
        )
