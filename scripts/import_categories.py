"""
Database category import script based on real Excel data
Run this script to populate the database with categories from the expense spreadsheet
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to the path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

try:
    from sqlalchemy.orm import Session
    from app.core.database import SessionLocal
    from app.crud.crud_category import category_crud
    from app.schemas.category import CategoryCreate
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're running this from the project root and the backend dependencies are installed")
    sys.exit(1)

# Categories data extracted from Excel file
CATEGORIES_DATA = {
  "Housing": [
    "Cleaning",
    "CondoFee",
    "Electricity",
    "Gas",
    "Home Insurance",
    "Internet",
    "Maintenance",
    "Mortgage",
    "Phone",
    "Property Tax",
    "Rent",
    "Repairs",
    "Security",
    "Utilities",
    "Water"
  ],
  "Groceries": [
    "Bulk Shopping",
    "Convenience Store",
    "Farmers Market",
    "Fresh Produce",
    "Frozen Foods",
    "Organic",
    "Specialty Foods",
    "Supermarket"
  ],
  "Transport": [
    "Bus",
    "Car Insurance",
    "Car Maintenance",
    "Car Payment",
    "Flight",
    "Gas",
    "Lyft",
    "Parking",
    "Public Transit",
    "Taxi",
    "Tolls",
    "Train",
    "Uber"
  ],
  "Health": [
    "Dentist",
    "Doctor",
    "Gym",
    "Medical Insurance",
    "Medical Tests",
    "Personal Care",
    "Pharmacy",
    "Therapy",
    "Vision",
    "Vitamins"
  ],
  "Out": [
    "Bar",
    "Coffee",
    "Concerts",
    "Delivery",
    "Events",
    "Fast Food",
    "Gaming",
    "Movies",
    "Restaurant",
    "Sports"
  ],
  "Travel": [
    "Activities",
    "Business Travel",
    "Car Rental",
    "Flights",
    "Hotels",
    "Tours",
    "Travel Insurance",
    "Vacation",
    "Visas"
  ],
  "Clothing": [
    "Accessories",
    "Casual Wear",
    "Formal Wear",
    "Seasonal Clothing",
    "Shoes",
    "Sportswear",
    "Work Clothes"
  ],
  "Leisure": [
    "Art Supplies",
    "Books",
    "Games",
    "Hobbies",
    "Music",
    "Photography",
    "Sports Equipment",
    "Streaming"
  ],
  "Gifts": [
    "Anniversary",
    "Birthday Gifts",
    "Charity",
    "Donations",
    "Holiday Gifts",
    "Tips",
    "Wedding Gifts"
  ],
  "Fees": [
    "ATM Fees",
    "Bank Fees",
    "Credit Card Fees",
    "Membership Fees",
    "Processing Fees",
    "Service Charges",
    "Subscription Fees"
  ],
  "YouTube": [
    "Cloud Storage",
    "Digital Services",
    "Netflix",
    "Online Subscriptions",
    "Software",
    "Spotify",
    "YouTube Premium"
  ],
  "OtherExpenses": [
    "Education",
    "Emergency",
    "Miscellaneous",
    "Office Supplies",
    "One-time",
    "Pet Care",
    "Training",
    "Unexpected"
  ]
}

def import_categories_for_user(user_id: str):
    """Import categories for a specific user"""
    
    db: Session = SessionLocal()
    
    try:
        print(f"📥 Importing categories for user: {user_id}")
        
        # Define colors for categories (using a nice color palette)
        colors = [
            "#FF6B6B",  # Red
            "#4ECDC4",  # Teal  
            "#45B7D1",  # Blue
            "#96CEB4",  # Green
            "#FFEAA7",  # Yellow
            "#DDA0DD",  # Purple
            "#F7DC6F",  # Light Yellow
            "#BB8FCE",  # Light Purple
            "#85C1E9",  # Light Blue
            "#82E0AA",  # Light Green
            "#F8C471",  # Orange
            "#F1948A"   # Pink
        ]
        
        # Define icons for categories
        category_icons = {{
            "Housing": "home",
            "Groceries": "shopping-cart",
            "Transport": "car",
            "Health": "heart",
            "Out": "utensils",
            "Travel": "plane",
            "Clothing": "shirt",
            "Leisure": "gamepad-2",
            "Gifts": "gift",
            "Fees": "file-text",
            "YouTube": "youtube",
            "OtherExpenses": "more-horizontal"
        }}
        
        sort_order = 1
        total_categories = 0
        total_subcategories = 0
        
        for category_name, subcategories in CATEGORIES_DATA.items():
            print(f"\n🔸 Processing category: {category_name}")
            
            # Check if category already exists for this user
            existing_category = category_crud.get_by_name(
                db, user_id=user_id, name=category_name
            )
            
            if existing_category:
                print(f"  ↪️  Category '{category_name}' already exists")
                parent_category = existing_category
            else:
                category_data = CategoryCreate(
                    name=category_name,
                    color=colors[(sort_order - 1) % len(colors)],
                    icon=category_icons.get(category_name, "folder"),
                    sort_order=sort_order
                )
                
                parent_category = category_crud.create_for_user(
                    db, obj_in=category_data, user_id=user_id
                )
                print(f"  ✅ Created category: {category_name}")
                total_categories += 1
            
            # Create subcategories
            subcategory_order = 1
            for subcategory_name in subcategories:
                existing_subcategory = category_crud.get_by_name(
                    db, 
                    user_id=user_id, 
                    name=subcategory_name, 
                    parent_id=str(parent_category.id)
                )
                
                if not existing_subcategory:
                    subcategory_data = CategoryCreate(
                        name=subcategory_name,
                        parent_id=str(parent_category.id),
                        color=colors[(sort_order - 1) % len(colors)],
                        icon="tag",
                        sort_order=subcategory_order
                    )
                    
                    category_crud.create_for_user(
                        db, obj_in=subcategory_data, user_id=user_id
                    )
                    print(f"    ✅ Created subcategory: {subcategory_name}")
                    total_subcategories += 1
                else:
                    print(f"    ↪️  Subcategory '{subcategory_name}' already exists")
                
                subcategory_order += 1
            
            sort_order += 1
        
        print(f"\n🎉 Import completed successfully!")
        print(f"📊 Summary:")
        print(f"   • {total_categories} new categories created")
        print(f"   • {total_subcategories} new subcategories created")
        print(f"   • Total categories: {len(CATEGORIES_DATA)}")
        
    except Exception as e:
        print(f"❌ Error during import: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def list_categories():
    """List all available categories"""
    print("📋 Available categories to import:")
    for i, (category, subcategories) in enumerate(CATEGORIES_DATA.items(), 1):
        print(f"\n{i}. {category} ({len(subcategories)} subcategories)")
        for sub in subcategories[:5]:  # Show first 5
            print(f"   • {sub}")
        if len(subcategories) > 5:
            print(f"   ... and {len(subcategories) - 5} more")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❓ Usage:")
        print("  python import_categories.py <user_id>     # Import for specific user")
        print("  python import_categories.py list          # List available categories")
        print("")
        list_categories()
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "list":
        list_categories()
    else:
        # Import for specific user
        user_id = command
        try:
            import_categories_for_user(user_id)
        except Exception as e:
            print(f"❌ Import failed: {e}")
            sys.exit(1)
