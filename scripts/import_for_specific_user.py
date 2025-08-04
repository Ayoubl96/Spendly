#!/usr/bin/env python3
"""
Import categories for a specific user UUID via direct database connection
"""

import psycopg2
import uuid
from datetime import datetime

# Database connection
def get_db_connection():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(
            host="localhost",
            port="5432",
            database="spendly_dev",
            user="postgres",
            password="postgres"
        )
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def clear_existing_categories(conn, user_id):
    """Clear existing categories for the user"""
    try:
        cursor = conn.cursor()
        
        # Delete in correct order (subcategories first, then main categories)
        cursor.execute("""
            DELETE FROM categories 
            WHERE user_id = %s AND parent_id IS NOT NULL
        """, (user_id,))
        
        cursor.execute("""
            DELETE FROM categories 
            WHERE user_id = %s AND parent_id IS NULL
        """, (user_id,))
        
        conn.commit()
        cursor.close()
        print(f"✅ Cleared existing categories for user {user_id}")
        return True
    except Exception as e:
        print(f"❌ Failed to clear categories: {e}")
        conn.rollback()
        return False

def create_category(conn, user_id, name, color="#FF6B6B", icon="folder", sort_order=1, parent_id=None):
    """Create a category in the database"""
    try:
        cursor = conn.cursor()
        
        category_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        cursor.execute("""
            INSERT INTO categories 
            (id, name, parent_id, color, icon, sort_order, is_active, user_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            category_id, name, parent_id, color, icon, sort_order, True, user_id, now, now
        ))
        
        conn.commit()
        cursor.close()
        
        print(f"✅ Created category: {name}")
        return category_id
    except Exception as e:
        print(f"❌ Failed to create category '{name}': {e}")
        conn.rollback()
        return None

def import_categories_for_user(user_id):
    """Import all categories for a specific user"""
    
    # Categories based on Excel file
    categories_data = {
        "Housing": ["Rent", "CondoFee", "Electricity", "Water", "Gas", "Internet", "Phone", "Insurance", "Repairs", "Maintenance"],
        "Groceries": ["Supermarket", "Organic Foods", "Farmers Market", "Convenience Store", "Bulk Shopping"],
        "Transport": ["Gas", "Public Transit", "Taxi", "Uber", "Parking", "Car Insurance", "Car Maintenance"],
        "Health": ["Doctor", "Dentist", "Pharmacy", "Medical Tests", "Gym", "Personal Care"],
        "Out": ["Restaurant", "Fast Food", "Coffee", "Bar", "Delivery", "Movies"],
        "Travel": ["Hotels", "Flights", "Car Rental", "Vacation", "Business Travel"],
        "Clothing": ["Casual Wear", "Work Clothes", "Shoes", "Accessories"],
        "Leisure": ["Hobbies", "Books", "Music", "Games", "Sports"],
        "Gifts": ["Birthday Gifts", "Holiday Gifts", "Donations", "Charity"],
        "Fees": ["Bank Fees", "ATM Fees", "Service Charges", "Subscription Fees"],
        "YouTube": ["YouTube Premium", "Netflix", "Spotify", "Digital Services"],
        "OtherExpenses": ["Miscellaneous", "Emergency", "Education", "Office Supplies"]
    }
    
    colors = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
        "#DDA0DD", "#F7DC6F", "#BB8FCE", "#85C1E9", "#82E0AA",
        "#F8C471", "#F1948A"
    ]
    
    icons = {
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
    }
    
    print(f"🔗 Connecting to database...")
    conn = get_db_connection()
    if not conn:
        return
    
    print(f"🗑️  Clearing existing categories for user {user_id}...")
    if not clear_existing_categories(conn, user_id):
        conn.close()
        return
    
    print(f"\n📦 Starting category import for user {user_id}...")
    
    total_categories = 0
    total_subcategories = 0
    
    sort_order = 1
    for category_name, subcategories in categories_data.items():
        print(f"\n🔸 Creating main category: {category_name}")
        
        # Create main category
        parent_id = create_category(
            conn=conn,
            user_id=user_id,
            name=category_name,
            color=colors[(sort_order - 1) % len(colors)],
            icon=icons.get(category_name, "folder"),
            sort_order=sort_order
        )
        
        if parent_id:
            total_categories += 1
            
            # Create subcategories
            print(f"   🏷️  Creating {len(subcategories)} subcategories...")
            sub_order = 1
            for subcategory_name in subcategories:
                subcategory_id = create_category(
                    conn=conn,
                    user_id=user_id,
                    name=subcategory_name,
                    color=colors[(sort_order - 1) % len(colors)],
                    icon="tag",
                    sort_order=sub_order,
                    parent_id=parent_id
                )
                
                if subcategory_id:
                    total_subcategories += 1
                
                sub_order += 1
        
        sort_order += 1
    
    conn.close()
    
    print(f"\n🎉 Import completed!")
    print(f"📊 Summary for user {user_id}:")
    print(f"   • {total_categories} main categories created")
    print(f"   • {total_subcategories} subcategories created")
    print(f"   • Total: {total_categories + total_subcategories} categories")

if __name__ == "__main__":
    target_user_id = "65c7eeee-55ac-453e-8e50-e54d318169c9"
    import_categories_for_user(target_user_id)