"""
Simple script to generate test expenses for development
Usage: python scripts/seed_expenses.py
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

# Add the parent directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta
from decimal import Decimal
import random
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.db.models.expense import Expense
from app.db.models.category import Category
from app.db.models.payment_method import UserPaymentMethod

# User ID to create expenses for
USER_ID = "65c7eeee-55ac-453e-8e50-e54d318169c9"

# Sample expense descriptions by category
EXPENSE_DESCRIPTIONS = {
    "Food": [
        "Grocery shopping",
        "Restaurant lunch",
        "Coffee",
        "Takeout dinner",
        "Snacks",
    ],
    "Transport": ["Gas", "Uber ride", "Public transport", "Parking", "Car wash"],
    "Entertainment": [
        "Movie tickets",
        "Concert",
        "Streaming subscription",
        "Books",
        "Games",
    ],
    "Shopping": ["Clothes", "Electronics", "Shoes", "Accessories", "Online shopping"],
    "Bills": ["Internet", "Phone bill", "Electricity", "Water", "Insurance"],
    "Health": [
        "Pharmacy",
        "Doctor visit",
        "Gym membership",
        "Vitamins",
        "Medical supplies",
    ],
    "Other": ["Gift", "Donation", "Miscellaneous", "Service", "Repairs"],
}


def generate_expenses(db: Session):
    """Generate 1000 test expenses"""

    print(f"Generating expenses for user: {USER_ID}")

    # Get user's categories and subcategories
    categories = (
        db.query(Category)
        .filter(
            Category.user_id == USER_ID,
            Category.is_active == True,
            Category.parent_id == None,
        )
        .all()
    )

    if not categories:
        print("No categories found for user. Please create categories first.")
        return

    print(f"Found {len(categories)} categories")

    # Get all subcategories
    subcategories_map = {}
    for cat in categories:
        subcats = (
            db.query(Category)
            .filter(
                Category.user_id == USER_ID,
                Category.parent_id == cat.id,
                Category.is_active == True,
            )
            .all()
        )
        subcategories_map[str(cat.id)] = subcats
        print(f"Category '{cat.name}': {len(subcats)} subcategories")

    # Get user's payment methods
    payment_methods = (
        db.query(UserPaymentMethod)
        .filter(
            UserPaymentMethod.user_id == USER_ID, UserPaymentMethod.is_active == True
        )
        .all()
    )

    if not payment_methods:
        print("No payment methods found for user. Please create payment methods first.")
        return

    print(f"Found {len(payment_methods)} payment methods")

    # Generate expenses from last year to now
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=365)

    expenses_created = 0

    for i in range(1000):
        # Random date between start and end
        days_diff = (end_date - start_date).days
        random_days = random.randint(0, days_diff)
        expense_date = start_date + timedelta(days=random_days)

        # Random category
        category = random.choice(categories)

        # Random subcategory from that category
        subcategory = None
        if (
            str(category.id) in subcategories_map
            and subcategories_map[str(category.id)]
        ):
            subcategory = random.choice(subcategories_map[str(category.id)])

        # Random amount between 5 and 500
        amount = round(random.uniform(5, 500), 2)

        # Random payment method
        payment_method = random.choice(payment_methods)

        # Get description based on category name
        cat_name = category.name
        if cat_name in EXPENSE_DESCRIPTIONS:
            description = random.choice(EXPENSE_DESCRIPTIONS[cat_name])
        else:
            description = f"Expense {i + 1}"

        # Create expense
        expense = Expense(
            user_id=USER_ID,
            amount=str(amount),
            currency="EUR",
            amount_in_base_currency=str(amount),
            exchange_rate="1.0",
            description=description,
            expense_date=expense_date,
            category_id=category.id,
            subcategory_id=subcategory.id if subcategory else None,
            payment_method_id=payment_method.id,
            is_shared=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        db.add(expense)
        expenses_created += 1

        # Commit every 100 expenses
        if expenses_created % 100 == 0:
            db.commit()
            print(f"Created {expenses_created} expenses...")

    # Final commit
    db.commit()
    print(f"\nSuccessfully created {expenses_created} expenses!")


def main():
    """Main function"""
    db = SessionLocal()
    try:
        generate_expenses(db)
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
