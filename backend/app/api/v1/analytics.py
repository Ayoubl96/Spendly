from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from typing import List, Optional, Dict
from datetime import date, datetime, timedelta
from decimal import Decimal
from collections import defaultdict

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.transaction import Transaction, TransactionType
from app.models.category import Category, CategoryType
from app.models.budget import Budget
from app.models.asset import Asset
from app.models.net_worth import NetWorthSnapshot

router = APIRouter()


@router.get("/summary")
async def get_financial_summary(
    period: str = Query("month", regex="^(week|month|quarter|year|all)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get financial summary for the specified period.
    """
    # Calculate date range
    today = date.today()
    if period == "week":
        start_date = today - timedelta(days=7)
    elif period == "month":
        start_date = today - timedelta(days=30)
    elif period == "quarter":
        start_date = today - timedelta(days=90)
    elif period == "year":
        start_date = today - timedelta(days=365)
    else:  # all
        start_date = None
    
    # Base query
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    
    # Calculate totals
    income_total = query.filter(Transaction.type == TransactionType.INCOME).with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar()
    
    expense_total = query.filter(Transaction.type == TransactionType.EXPENSE).with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar()
    
    # Get current net worth
    latest_snapshot = db.query(NetWorthSnapshot).filter(
        NetWorthSnapshot.user_id == current_user.id
    ).order_by(NetWorthSnapshot.date.desc()).first()
    
    # Get active budgets
    active_budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.is_active == True,
        Budget.start_date <= today,
        Budget.end_date >= today
    ).count()
    
    # Get asset summary
    assets = db.query(Asset).filter(Asset.user_id == current_user.id).all()
    total_assets = sum(asset.value for asset in assets)
    
    return {
        "period": period,
        "income_total": float(income_total),
        "expense_total": float(expense_total),
        "net_income": float(income_total - expense_total),
        "savings_rate": float((income_total - expense_total) / income_total * 100) if income_total > 0 else 0,
        "current_net_worth": float(latest_snapshot.net_worth) if latest_snapshot else 0,
        "total_assets": float(total_assets),
        "active_budgets": active_budgets,
        "last_updated": datetime.utcnow()
    }


@router.get("/expenses")
async def get_expense_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    group_by: str = Query("category", regex="^(category|month|week|day)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get detailed expense analytics grouped by category or time period.
    """
    # Base query
    query = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.EXPENSE
    )
    
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    if group_by == "category":
        # Group by category
        results = query.join(Category, Transaction.category_id == Category.id, isouter=True).with_entities(
            func.coalesce(Category.name, "Uncategorized").label("category"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
            func.avg(Transaction.amount).label("average")
        ).group_by(Category.name).all()
        
        total_expenses = sum(r.total for r in results)
        
        return {
            "group_by": group_by,
            "total_expenses": float(total_expenses),
            "breakdown": [
                {
                    "category": r.category,
                    "total": float(r.total),
                    "count": r.count,
                    "average": float(r.average),
                    "percentage": float(r.total / total_expenses * 100) if total_expenses > 0 else 0
                }
                for r in sorted(results, key=lambda x: x.total, reverse=True)
            ]
        }
    
    else:
        # Group by time period
        if group_by == "month":
            date_trunc = func.date_trunc('month', Transaction.date)
            date_format = '%Y-%m'
        elif group_by == "week":
            date_trunc = func.date_trunc('week', Transaction.date)
            date_format = '%Y-W%V'
        else:  # day
            date_trunc = Transaction.date
            date_format = '%Y-%m-%d'
        
        results = query.with_entities(
            date_trunc.label("period"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count")
        ).group_by(date_trunc).order_by(date_trunc).all()
        
        return {
            "group_by": group_by,
            "breakdown": [
                {
                    "period": r.period.strftime(date_format) if hasattr(r.period, 'strftime') else str(r.period),
                    "total": float(r.total),
                    "count": r.count
                }
                for r in results
            ]
        }


@router.get("/income")
async def get_income_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    group_by: str = Query("category", regex="^(category|month|source)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get detailed income analytics.
    """
    # Base query
    query = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.INCOME
    )
    
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    if group_by in ["category", "source"]:
        # Group by category/source
        results = query.join(Category, Transaction.category_id == Category.id, isouter=True).with_entities(
            func.coalesce(Category.name, "Other").label("source"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count")
        ).group_by(Category.name).all()
        
        total_income = sum(r.total for r in results)
        
        return {
            "group_by": group_by,
            "total_income": float(total_income),
            "breakdown": [
                {
                    "source": r.source,
                    "total": float(r.total),
                    "count": r.count,
                    "percentage": float(r.total / total_income * 100) if total_income > 0 else 0
                }
                for r in sorted(results, key=lambda x: x.total, reverse=True)
            ]
        }
    
    else:  # month
        results = query.with_entities(
            func.date_trunc('month', Transaction.date).label("month"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count")
        ).group_by(func.date_trunc('month', Transaction.date)).order_by(
            func.date_trunc('month', Transaction.date)
        ).all()
        
        return {
            "group_by": group_by,
            "breakdown": [
                {
                    "month": r.month.strftime('%Y-%m'),
                    "total": float(r.total),
                    "count": r.count
                }
                for r in results
            ]
        }


@router.get("/networth")
async def get_net_worth_analytics(
    period: str = Query("6m", regex="^(1m|3m|6m|1y|all)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get net worth trends and analytics.
    """
    # Calculate date range
    today = date.today()
    if period == "1m":
        start_date = today - timedelta(days=30)
    elif period == "3m":
        start_date = today - timedelta(days=90)
    elif period == "6m":
        start_date = today - timedelta(days=180)
    elif period == "1y":
        start_date = today - timedelta(days=365)
    else:  # all
        start_date = None
    
    # Get snapshots
    query = db.query(NetWorthSnapshot).filter(NetWorthSnapshot.user_id == current_user.id)
    if start_date:
        query = query.filter(NetWorthSnapshot.date >= start_date)
    
    snapshots = query.order_by(NetWorthSnapshot.date).all()
    
    if not snapshots:
        return {
            "period": period,
            "current_net_worth": 0,
            "change_amount": 0,
            "change_percentage": 0,
            "trends": []
        }
    
    # Calculate changes
    latest = snapshots[-1]
    earliest = snapshots[0]
    change_amount = latest.net_worth - earliest.net_worth
    change_percentage = (change_amount / earliest.net_worth * 100) if earliest.net_worth != 0 else 0
    
    # Get current assets
    assets = db.query(Asset).filter(Asset.user_id == current_user.id).all()
    assets_by_type = defaultdict(Decimal)
    for asset in assets:
        assets_by_type[asset.type.value] += asset.value
    
    return {
        "period": period,
        "current_net_worth": float(latest.net_worth),
        "current_assets": float(latest.total_assets),
        "current_liabilities": float(latest.total_liabilities),
        "change_amount": float(change_amount),
        "change_percentage": float(change_percentage),
        "asset_allocation": {
            asset_type: float(value)
            for asset_type, value in assets_by_type.items()
        },
        "trends": [
            {
                "date": snapshot.date.isoformat(),
                "net_worth": float(snapshot.net_worth),
                "assets": float(snapshot.total_assets),
                "liabilities": float(snapshot.total_liabilities)
            }
            for snapshot in snapshots
        ]
    }


@router.get("/categories")
async def get_category_analytics(
    type: Optional[CategoryType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get category usage analytics.
    """
    # Get categories with transaction counts
    query = db.query(
        Category,
        func.count(Transaction.id).label("transaction_count"),
        func.coalesce(func.sum(Transaction.amount), 0).label("total_amount")
    ).outerjoin(
        Transaction, Category.id == Transaction.category_id
    ).filter(
        Category.user_id == current_user.id
    ).group_by(Category.id)
    
    if type:
        query = query.filter(Category.type == type)
    
    results = query.all()
    
    categories_data = []
    for category, count, total in results:
        categories_data.append({
            "id": str(category.id),
            "name": category.name,
            "type": category.type.value,
            "color": category.color,
            "icon": category.icon,
            "transaction_count": count,
            "total_amount": float(total),
            "has_subcategories": len(category.subcategories) > 0
        })
    
    return {
        "total_categories": len(categories_data),
        "categories": sorted(categories_data, key=lambda x: x["total_amount"], reverse=True)
    }


@router.get("/trends")
async def get_financial_trends(
    metric: str = Query("expenses", regex="^(expenses|income|savings|networth)$"),
    period: str = Query("12m", regex="^(3m|6m|12m|24m)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get financial trends over time.
    """
    # Calculate date range
    today = date.today()
    if period == "3m":
        start_date = today - timedelta(days=90)
    elif period == "6m":
        start_date = today - timedelta(days=180)
    elif period == "12m":
        start_date = today - timedelta(days=365)
    else:  # 24m
        start_date = today - timedelta(days=730)
    
    if metric in ["expenses", "income", "savings"]:
        # Get monthly transaction data
        query = db.query(
            func.date_trunc('month', Transaction.date).label("month"),
            func.sum(
                func.case(
                    [(Transaction.type == TransactionType.INCOME, Transaction.amount)],
                    else_=0
                )
            ).label("income"),
            func.sum(
                func.case(
                    [(Transaction.type == TransactionType.EXPENSE, Transaction.amount)],
                    else_=0
                )
            ).label("expenses")
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date
        ).group_by(
            func.date_trunc('month', Transaction.date)
        ).order_by(
            func.date_trunc('month', Transaction.date)
        ).all()
        
        trends = []
        for row in query:
            month_data = {
                "month": row.month.strftime('%Y-%m'),
                "income": float(row.income),
                "expenses": float(row.expenses),
                "savings": float(row.income - row.expenses),
                "savings_rate": float((row.income - row.expenses) / row.income * 100) if row.income > 0 else 0
            }
            trends.append(month_data)
        
        return {
            "metric": metric,
            "period": period,
            "trends": trends
        }
    
    else:  # networth
        snapshots = db.query(NetWorthSnapshot).filter(
            NetWorthSnapshot.user_id == current_user.id,
            NetWorthSnapshot.date >= start_date
        ).order_by(NetWorthSnapshot.date).all()
        
        return {
            "metric": metric,
            "period": period,
            "trends": [
                {
                    "date": snapshot.date.isoformat(),
                    "net_worth": float(snapshot.net_worth),
                    "assets": float(snapshot.total_assets),
                    "liabilities": float(snapshot.total_liabilities)
                }
                for snapshot in snapshots
            ]
        }