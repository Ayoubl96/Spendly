#!/usr/bin/env python3
"""
Script to create realistic categories based on the Excel file data
and import them into the database
"""

import pandas as pd
import json
from pathlib import Path

def extract_real_categories():
    """Extract actual categories and subcategories from the Excel file"""
    
    excel_file = Path("../sample/2024 - Ayoub Expenses - Personal.xlsx")
    
    try:
        # Read the Expenses sheet
        df = pd.read_excel(excel_file, sheet_name='Expenses')
        
        # Create a mapping of primary categories to their subcategories
        categories_mapping = {}
        
        # Process each row
        for _, row in df.iterrows():
            primary = row['Primary']
            secondary = row['Secondary']
            
            # Skip NaN values and system entries
            if pd.isna(primary) or primary in ['total', 'verify']:
                continue
                
            if pd.isna(secondary):
                continue
            
            # Clean up the category names
            primary = str(primary).strip()
            secondary = str(secondary).strip()
            
            # Add to mapping
            if primary not in categories_mapping:
                categories_mapping[primary] = set()
            
            categories_mapping[primary].add(secondary)
        
        # Convert sets to sorted lists
        for primary in categories_mapping:
            categories_mapping[primary] = sorted(list(categories_mapping[primary]))
        
        print("📊 Extracted categories from Excel:")
        for primary, subcategories in categories_mapping.items():
            print(f"\n🔸 {primary} ({len(subcategories)} subcategories)")
            for sub in subcategories:
                print(f"   - {sub}")
        
        return categories_mapping
        
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return {}

def create_enhanced_categories():
    """Create an enhanced version with both Excel data and common categories"""
    
    # Get real data from Excel
    excel_categories = extract_real_categories()
    
    # Enhanced mapping with more comprehensive subcategories
    enhanced_categories = {
        "Housing": [
            "Rent", "CondoFee", "Mortgage", "Property Tax", "Home Insurance",
            "Utilities", "Electricity", "Water", "Gas", "Internet", "Phone",
            "Repairs", "Maintenance", "Cleaning", "Security"
        ],
        "Groceries": [
            "Supermarket", "Organic", "Farmers Market", "Convenience Store",
            "Bulk Shopping", "Specialty Foods", "Frozen Foods", "Fresh Produce"
        ],
        "Transport": [
            "Gas", "Public Transit", "Taxi", "Uber", "Lyft", "Parking",
            "Car Insurance", "Car Maintenance", "Car Payment", "Tolls",
            "Flight", "Train", "Bus"
        ],
        "Health": [
            "Doctor", "Dentist", "Pharmacy", "Medical Tests", "Vision",
            "Therapy", "Medical Insurance", "Vitamins", "Gym", "Personal Care"
        ],
        "Out": [  # Dining & Entertainment
            "Restaurant", "Fast Food", "Coffee", "Bar", "Delivery",
            "Movies", "Concerts", "Events", "Gaming", "Sports"
        ],
        "Travel": [
            "Hotels", "Flights", "Car Rental", "Travel Insurance",
            "Vacation", "Business Travel", "Visas", "Tours", "Activities"
        ],
        "Clothing": [
            "Casual Wear", "Work Clothes", "Shoes", "Accessories",
            "Seasonal Clothing", "Sportswear", "Formal Wear"
        ],
        "Leisure": [
            "Hobbies", "Books", "Music", "Streaming", "Games",
            "Sports Equipment", "Art Supplies", "Photography"
        ],
        "Gifts": [
            "Birthday Gifts", "Holiday Gifts", "Wedding Gifts",
            "Anniversary", "Donations", "Charity", "Tips"
        ],
        "Fees": [
            "Bank Fees", "ATM Fees", "Credit Card Fees", "Service Charges",
            "Subscription Fees", "Membership Fees", "Processing Fees"
        ],
        "YouTube": [  # Digital/Online Services
            "YouTube Premium", "Netflix", "Spotify", "Online Subscriptions",
            "Digital Services", "Cloud Storage", "Software"
        ],
        "OtherExpenses": [
            "Miscellaneous", "Emergency", "Unexpected", "One-time",
            "Education", "Training", "Office Supplies", "Pet Care"
        ]
    }
    
    # Merge Excel data with enhanced categories
    final_categories = {}
    
    for category in enhanced_categories:
        subcategories = set(enhanced_categories[category])
        
        # Add Excel subcategories if they exist
        if category in excel_categories:
            subcategories.update(excel_categories[category])
        
        final_categories[category] = sorted(list(subcategories))
    
    # Add any Excel categories that weren't in our enhanced list
    for category in excel_categories:
        if category not in final_categories:
            final_categories[category] = excel_categories[category]
    
    return final_categories

# Create the import script content
IMPORT_SCRIPT = '''"""
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
CATEGORIES_DATA = {categories_json}

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
            print(f"\\n🔸 Processing category: {category_name}")
            
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
        
        print(f"\\n🎉 Import completed successfully!")
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
        print(f"\\n{i}. {category} ({len(subcategories)} subcategories)")
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
'''

if __name__ == "__main__":
    print("🎯 Creating enhanced category import script...")
    
    # Get enhanced categories
    categories = create_enhanced_categories()
    
    print(f"\n📊 Final category summary:")
    total_subcategories = sum(len(subs) for subs in categories.values())
    print(f"   • {len(categories)} main categories")
    print(f"   • {total_subcategories} total subcategories")
    
    # Create the import script
    categories_json = json.dumps(categories, indent=2)
    script_content = IMPORT_SCRIPT.replace('{categories_json}', categories_json)
    
    # Save the import script
    output_file = Path("import_categories.py")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    print(f"\n✅ Created category import script: {output_file}")
    print(f"\n🚀 To use the script:")
    print(f"   1. Get a user ID from your database")
    print(f"   2. Run: python3 {output_file} <user_id>")
    print(f"   3. Or list categories: python3 {output_file} list")