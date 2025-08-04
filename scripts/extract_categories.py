#!/usr/bin/env python3
"""
Script to extract categories and subcategories from the Excel expense file
and create a database import script
"""

import pandas as pd
import json
from pathlib import Path

def extract_categories_from_excel():
    """Extract unique categories and subcategories from the Excel file"""
    
    # Path to the Excel file
    excel_file = Path("../sample/2024 - Ayoub Expenses - Personal.xlsx")
    
    if not excel_file.exists():
        print(f"Excel file not found: {excel_file}")
        return None
    
    try:
        # Read the Excel file
        print(f"Reading Excel file: {excel_file}")
        
        # Try to read all sheets first to see what's available
        excel_data = pd.ExcelFile(excel_file)
        print(f"Available sheets: {excel_data.sheet_names}")
        
        # Try different sheets that might contain expense data
        expense_sheets = ['Expenses', 'Expenses Short', 'Template']
        df = None
        
        for sheet_name in expense_sheets:
            if sheet_name in excel_data.sheet_names:
                print(f"\nTrying sheet: {sheet_name}")
                try:
                    temp_df = pd.read_excel(excel_file, sheet_name=sheet_name)
                    print(f"  Columns: {list(temp_df.columns)}")
                    print(f"  Rows: {len(temp_df)}")
                    print(f"  First few rows:")
                    print(temp_df.head(3))
                    
                    # Check if this looks like expense data
                    str_columns = [col for col in temp_df.columns if isinstance(col, str)]
                    if str_columns:
                        df = temp_df
                        print(f"  ✅ Using sheet '{sheet_name}' - has string columns")
                        break
                except Exception as e:
                    print(f"  ❌ Error reading sheet '{sheet_name}': {e}")
                    continue
        
        if df is None:
            print("No suitable expense sheet found, using first sheet")
            df = pd.read_excel(excel_file, sheet_name=0)
        
        return df
        
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return None

def analyze_categories(df):
    """Analyze the dataframe to find category patterns"""
    
    if df is None:
        return {}
    
    categories_data = {}
    
    # Get string columns only
    str_columns = [col for col in df.columns if isinstance(col, str)]
    print(f"\nString columns found: {str_columns}")
    
    # Try different column names that might contain category information
    potential_category_columns = []
    
    for col in str_columns:
        if any(keyword in col.lower() for keyword in ['category', 'type', 'class', 'group']):
            potential_category_columns.append(col)
    
    print(f"\nAnalyzing potential category columns: {potential_category_columns}")
    
    for col in potential_category_columns:
        if col in df.columns:
            unique_values = df[col].dropna().unique()
            categories_data[col] = sorted([str(v) for v in unique_values if str(v) != 'nan'])
            print(f"\n{col} unique values ({len(unique_values)}):")
            for value in sorted(unique_values):
                if str(value) != 'nan':
                    print(f"  - {value}")
    
    # Also check description column for patterns
    desc_columns = [col for col in str_columns if 'description' in col.lower() or 'desc' in col.lower()]
    for desc_col in desc_columns:
        if desc_col in df.columns:
            descriptions = df[desc_col].dropna().unique()
            print(f"\nSample {desc_col} ({len(descriptions)} unique):")
            for desc in sorted([str(d) for d in descriptions if str(d) != 'nan'])[:20]:  # Show first 20
                print(f"  - {desc}")
    
    # Look at all string columns to understand the data structure
    print(f"\nAll string columns analysis:")
    for col in str_columns:
        if col in df.columns:
            unique_count = df[col].dropna().nunique()
            print(f"  {col}: {unique_count} unique values")
            if unique_count < 20 and unique_count > 0:  # Show small sets of unique values
                unique_vals = df[col].dropna().unique()
                print(f"    Values: {sorted([str(v) for v in unique_vals if str(v) != 'nan'])}")
    
    return categories_data

def create_category_import_script(categories_data):
    """Create a Python script to import categories into the database"""
    
    # Based on common expense categories, create a mapping
    expense_categories = {
        "Food & Dining": [
            "Restaurants", "Fast Food", "Coffee Shops", "Groceries", 
            "Food Delivery", "Bars & Pubs", "Cafes"
        ],
        "Transportation": [
            "Gas", "Public Transport", "Taxi & Rideshare", "Parking", 
            "Car Maintenance", "Car Insurance", "Tolls"
        ],
        "Shopping": [
            "Clothing", "Electronics", "Books", "Home & Garden", 
            "Online Shopping", "Department Stores", "Pharmacy"
        ],
        "Entertainment": [
            "Movies", "Streaming Services", "Games", "Concerts", 
            "Sports Events", "Hobbies", "Subscriptions"
        ],
        "Bills & Utilities": [
            "Electricity", "Water", "Internet", "Phone", "Insurance", 
            "Rent", "Mortgage", "Property Tax"
        ],
        "Healthcare": [
            "Doctor Visits", "Pharmacy", "Medical Tests", "Dental", 
            "Vision", "Medical Insurance", "Therapy"
        ],
        "Travel": [
            "Flights", "Hotels", "Car Rental", "Travel Insurance", 
            "Vacation", "Business Travel", "Visas"
        ],
        "Education": [
            "Tuition", "Books", "Online Courses", "Training", 
            "Conferences", "Certifications"
        ],
        "Personal Care": [
            "Haircuts", "Beauty", "Gym", "Spa", "Personal Products"
        ],
        "Financial": [
            "Bank Fees", "Investment", "Savings", "Loans", "Credit Card Fees"
        ],
        "Home": [
            "Furniture", "Appliances", "Repairs", "Cleaning", 
            "Security", "Decorations"
        ],
        "Gifts & Donations": [
            "Gifts", "Charity", "Religious Donations", "Tips"
        ]
    }
    
    # Create the import script
    script_content = '''"""
Database category import script
Run this script to populate the database with comprehensive categories and subcategories
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to the path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.crud.crud_category import category_crud
from app.schemas.category import CategoryCreate

# Comprehensive category data
CATEGORIES_DATA = ''' + json.dumps(expense_categories, indent=2) + '''

async def import_categories():
    """Import categories and subcategories into the database"""
    
    db: Session = SessionLocal()
    
    try:
        print("Starting category import...")
        
        # Define colors for categories (using a nice color palette)
        colors = [
            "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
            "#DDA0DD", "#F7DC6F", "#BB8FCE", "#85C1E9", "#82E0AA",
            "#F8C471", "#F1948A"
        ]
        
        sort_order = 1
        
        for category_name, subcategories in CATEGORIES_DATA.items():
            print(f"\\nCreating category: {category_name}")
            
            # Create main category
            category_data = CategoryCreate(
                name=category_name,
                color=colors[(sort_order - 1) % len(colors)],
                icon="folder",  # Default icon
                sort_order=sort_order
            )
            
            # Check if category already exists
            existing_category = category_crud.get_by_name(
                db, user_id="00000000-0000-0000-0000-000000000000", name=category_name
            )
            
            if existing_category:
                print(f"  Category '{category_name}' already exists, skipping...")
                parent_category = existing_category
            else:
                # Create for a system user (you'll need to replace this with actual user ID)
                # For now, we'll create a system import
                parent_category = category_crud.create_for_user(
                    db, obj_in=category_data, user_id="00000000-0000-0000-0000-000000000000"
                )
                print(f"  ✅ Created category: {category_name}")
            
            # Create subcategories
            subcategory_order = 1
            for subcategory_name in subcategories:
                subcategory_data = CategoryCreate(
                    name=subcategory_name,
                    parent_id=str(parent_category.id),
                    color=colors[(sort_order - 1) % len(colors)],
                    icon="tag",
                    sort_order=subcategory_order
                )
                
                # Check if subcategory already exists
                existing_subcategory = category_crud.get_by_name(
                    db, 
                    user_id="00000000-0000-0000-0000-000000000000", 
                    name=subcategory_name, 
                    parent_id=str(parent_category.id)
                )
                
                if not existing_subcategory:
                    category_crud.create_for_user(
                        db, obj_in=subcategory_data, user_id="00000000-0000-0000-0000-000000000000"
                    )
                    print(f"    ✅ Created subcategory: {subcategory_name}")
                else:
                    print(f"    Subcategory '{subcategory_name}' already exists, skipping...")
                
                subcategory_order += 1
            
            sort_order += 1
        
        print(f"\\n🎉 Category import completed successfully!")
        print(f"Created {len(CATEGORIES_DATA)} main categories with their subcategories")
        
    except Exception as e:
        print(f"Error during import: {e}")
        db.rollback()
    finally:
        db.close()

def import_categories_for_user(user_id: str):
    """Import categories for a specific user"""
    
    db: Session = SessionLocal()
    
    try:
        print(f"Importing categories for user: {user_id}")
        
        colors = [
            "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
            "#DDA0DD", "#F7DC6F", "#BB8FCE", "#85C1E9", "#82E0AA",
            "#F8C471", "#F1948A"
        ]
        
        sort_order = 1
        
        for category_name, subcategories in CATEGORIES_DATA.items():
            # Check if category already exists for this user
            existing_category = category_crud.get_by_name(
                db, user_id=user_id, name=category_name
            )
            
            if existing_category:
                print(f"  Category '{category_name}' already exists for user")
                parent_category = existing_category
            else:
                category_data = CategoryCreate(
                    name=category_name,
                    color=colors[(sort_order - 1) % len(colors)],
                    icon="folder",
                    sort_order=sort_order
                )
                
                parent_category = category_crud.create_for_user(
                    db, obj_in=category_data, user_id=user_id
                )
                print(f"  ✅ Created category: {category_name}")
            
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
                
                subcategory_order += 1
            
            sort_order += 1
        
        print(f"\\n🎉 Categories imported successfully for user {user_id}!")
        
    except Exception as e:
        print(f"Error during import: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Import for specific user
        user_id = sys.argv[1]
        import_categories_for_user(user_id)
    else:
        # Import system categories
        asyncio.run(import_categories())
'''
    
    return script_content

if __name__ == "__main__":
    print("🔍 Extracting categories from Excel file...")
    
    # Extract data from Excel
    df = extract_categories_from_excel()
    
    if df is not None:
        # Analyze categories
        categories_data = analyze_categories(df)
        
        # Create import script
        script_content = create_category_import_script(categories_data)
        
        # Save the import script
        output_file = Path("import_categories.py")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        print(f"\n✅ Created category import script: {output_file}")
        print(f"\nTo use the script:")
        print(f"1. Run: python {output_file}")
        print(f"2. Or for specific user: python {output_file} <user_id>")
    else:
        print("❌ Could not extract data from Excel file")