from typing import List, Optional, Dict, Any
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID

from app.db.models.expense import Expense
from app.db.models.category import Category
from app.schemas.analytics import GroupByType


class AnalyticsCRUD:
    def get_analytics_data(
        self,
        db: Session,
        user_id: UUID,
        start_date: date,
        end_date: date,
        group_by: GroupByType = "month",
        category_ids: Optional[List[UUID]] = None,
    ) -> List[Dict[str, Any]]:
        query = db.query(Expense).filter(
            and_(
                Expense.user_id == user_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
            )
        )

        if category_ids:
            query = query.filter(Expense.category_id.in_(category_ids))

        expenses = query.all()

        grouped_data: Dict[str, Dict[str, Any]] = {}

        for expense in expenses:
            if group_by == "day":
                key = expense.expense_date.isoformat()
            elif group_by == "week":
                days_since_monday = expense.expense_date.weekday()
                week_start = expense.expense_date - timedelta(days=days_since_monday)
                key = week_start.isoformat()
            else:
                key = expense.expense_date.replace(day=1).isoformat()

            if key not in grouped_data:
                grouped_data[key] = {
                    "date": key,
                    "total_amount": Decimal("0"),
                    "currency": expense.currency,
                    "categories": {},
                }
            amount = Decimal(expense.amount)
            grouped_data[key]["total_amount"] += amount

            if expense.category_id:
                cat_id = str(expense.category_id)
                if cat_id not in grouped_data[key]["categories"]:
                    category = (
                        db.query(Category)
                        .filter(Category.id == expense.category_id)
                        .first()
                    )
                    grouped_data[key]["categories"][cat_id] = {
                        "category_id": expense.category_id,
                        "category_name": category.name,
                        "amount": Decimal("0"),
                        "currency": expense.currency,
                    }
                grouped_data[key]["categories"][cat_id]["amount"] += amount

        result = []

        for group_key in sorted(grouped_data.keys()):
            group = grouped_data[group_key]
            result.append(
                {
                    "date": group["date"],
                    "total_amount": str(group["total_amount"]),
                    "currency": group["currency"],
                    "category_breakdowns": [
                        {
                            "category_id": cat_data["category_id"],
                            "category_name": cat_data["category_name"],
                            "amount": str(cat_data["amount"]),
                            "currency": cat_data["currency"],
                        }
                        for cat_data in group["categories"].values()
                    ],
                }
            )
        return result

    def calculate_summary(
        self,
        current_period_data: List[Dict[str, Any]],
        previous_period_data: List[Dict[str, Any]] = None,
        currency: str = "EUR",
    ) -> Dict[str, Any]:
        total_current = sum(
            Decimal(item["total_amount"]) for item in current_period_data
        )

        total_previous = None
        change_percentage = None

        if previous_period_data:
            total_previous = sum(
                Decimal(item["total_amount"]) for item in previous_period_data
            )

            if total_previous > 0:
                change = total_current - total_previous
                change_percentage = (change / total_previous) * 100

        period_count = len(current_period_data) if current_period_data else 1
        average_per_period = total_current / period_count if period_count > 0 else 0

        return {
            "total_current": str(total_current),
            "total_previous": str(total_previous),
            "change_percentage": str(round(change_percentage, 2))
            if change_percentage is not None
            else None,
            "average_per_period": str(round(average_per_period, 2)),
            "currency": currency,
            "period_count": period_count,
        }

    def getprevious_period_dates(
        self, start_date: date, end_date: date
    ) -> tuple[date, date]:
        period_length = (end_date - start_date).days + 1
        previous_end = start_date - timedelta(days=1)
        previous_start = previous_end - timedelta(days=period_length - 1)

        return previous_start, previous_end


# Create singleton instance
analytics_crud = AnalyticsCRUD()
