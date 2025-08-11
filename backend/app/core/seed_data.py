"""
Initial seed data for the database
"""

from sqlalchemy.orm import Session
from app.db.models.currency import Currency
from app.db.models.category import Category
from app.crud.crud_currency import currency_crud
from app.crud.crud_category import category_crud
from app.crud.crud_payment_method import payment_method
from app.schemas.currency import CurrencyCreate
from app.schemas.category import CategoryCreate


async def seed_initial_data(db: Session):
    """Seed initial data into the database"""
    await seed_currencies(db)


async def seed_currencies(db: Session):
    """Seed initial currencies"""
    currencies_data = [
        {
            "code": "EUR",
            "name": "Euro",
            "symbol": "€",
            "decimal_places": 2,
            "is_active": True
        },
        {
            "code": "USD", 
            "name": "US Dollar",
            "symbol": "$",
            "decimal_places": 2,
            "is_active": True
        },
        {
            "code": "MAD",
            "name": "Moroccan Dirham", 
            "symbol": "MAD",
            "decimal_places": 2,
            "is_active": True
        }
    ]
    
    for currency_data in currencies_data:
        # Check if currency already exists
        existing = currency_crud.get_by_code(db, code=currency_data["code"])
        if not existing:
            currency_obj = CurrencyCreate(**currency_data)
            currency_crud.create(db, obj_in=currency_obj)
            print(f"✅ Seeded currency: {currency_data['name']} ({currency_data['code']})")
        else:
            print(f"ℹ️  Currency already exists: {currency_data['name']} ({currency_data['code']})")


def seed_default_categories(db: Session, user_id: str):
    """Seed default categories for a new user"""
    default_categories = [
        {
            "name": "Food & Dining",
            "color": "#FF6B6B",
            "icon": "utensils",
            "sort_order": 1
        },
        {
            "name": "Transportation",
            "color": "#4ECDC4",
            "icon": "car",
            "sort_order": 2
        },
        {
            "name": "Shopping",
            "color": "#45B7D1",
            "icon": "shopping-bag",
            "sort_order": 3
        },
        {
            "name": "Entertainment",
            "color": "#96CEB4",
            "icon": "film",
            "sort_order": 4
        },
        {
            "name": "Bills & Utilities",
            "color": "#FFEAA7",
            "icon": "file-text",
            "sort_order": 5
        },
        {
            "name": "Healthcare",
            "color": "#DDA0DD",
            "icon": "heart",
            "sort_order": 6
        },
        {
            "name": "Other",
            "color": "#A8A8A8",
            "icon": "more-horizontal",
            "sort_order": 7
        }
    ]
    
    for category_data in default_categories:
        # Check if category already exists for this user
        existing = category_crud.get_by_name(
            db, 
            user_id=user_id, 
            name=category_data["name"]
        )
        if not existing:
            category_obj = CategoryCreate(**category_data)
            category_crud.create_for_user(db, obj_in=category_obj, user_id=user_id)
            print(f"✅ Seeded category: {category_data['name']} for user {user_id}")
        else:
            print(f"ℹ️  Category already exists: {category_data['name']} for user {user_id}")


def seed_default_payment_methods(db: Session, user_id: str):
    """Seed default payment methods for a new user"""
    # Check if user already has payment methods
    existing_methods = payment_method.get_by_user(db, user_id=user_id)
    
    if not existing_methods:
        created_methods = payment_method.create_default_payment_methods(
            db, user_id=user_id
        )
        print(f"✅ Seeded {len(created_methods)} default payment methods for user {user_id}")
    else:
        print(f"ℹ️  User {user_id} already has {len(existing_methods)} payment methods")


def seed_user_defaults(db: Session, user_id: str):
    """Seed all default data for a new user (categories and payment methods)"""
    seed_default_categories(db, user_id)
    seed_default_payment_methods(db, user_id)