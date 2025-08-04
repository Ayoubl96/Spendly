#!/usr/bin/env python3
"""
Import categories via API calls
"""

import requests
import json

# Get access token first
def get_access_token():
    """Login and get access token"""
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(
        "http://localhost:8000/api/v1/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def create_category(token, name, color="#FF6B6B", icon="folder", sort_order=1, parent_id=None):
    """Create a category via API"""
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "name": name,
        "color": color,
        "icon": icon,
        "sort_order": sort_order
    }
    
    if parent_id:
        data["parent_id"] = parent_id
    
    response = requests.post(
        "http://localhost:8000/api/v1/categories/",
        json=data,
        headers=headers
    )
    
    if response.status_code == 201:
        category = response.json()
        print(f"✅ Created category: {name}")
        return category
    else:
        print(f"❌ Failed to create category '{name}': {response.text}")
        return None

def get_existing_categories(token):
    """Get existing categories to find parent IDs"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(
        "http://localhost:8000/api/v1/categories/",
        headers=headers
    )
    
    if response.status_code == 200:
        return {cat["name"]: cat for cat in response.json()}
    else:
        print(f"❌ Failed to get existing categories: {response.text}")
        return {}

def import_categories():
    """Import all categories from the Excel analysis"""
    
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
    
    print("🔑 Getting access token...")
    token = get_access_token()
    if not token:
        return
    
    print("📋 Getting existing categories...")
    existing_categories = get_existing_categories(token)
    
    print(f"\n📦 Starting complete category import...")
    print(f"Found {len(existing_categories)} existing categories")
    
    total_categories = 0
    total_subcategories = 0
    
    sort_order = 1
    for category_name, subcategories in categories_data.items():
        print(f"\n🔸 Processing category: {category_name}")
        
        # Check if main category exists, if not create it
        if category_name in existing_categories:
            parent_category = existing_categories[category_name]
            print(f"   ✅ Main category exists: {category_name}")
        else:
            # Create main category
            parent_category = create_category(
                token=token,
                name=category_name,
                color=colors[(sort_order - 1) % len(colors)],
                icon=icons.get(category_name, "folder"),
                sort_order=sort_order
            )
            
            if parent_category:
                total_categories += 1
                print(f"   ✅ Created main category: {category_name}")
            else:
                print(f"   ❌ Failed to create main category: {category_name}")
                continue
        
        # Create subcategories
        print(f"   🏷️  Creating {len(subcategories)} subcategories...")
        sub_order = 1
        for subcategory_name in subcategories:
            subcategory = create_category(
                token=token,
                name=subcategory_name,
                color=colors[(sort_order - 1) % len(colors)],
                icon="tag",
                sort_order=sub_order,
                parent_id=parent_category["id"]
            )
            
            if subcategory:
                total_subcategories += 1
            
            sub_order += 1
        
        sort_order += 1
    
    print(f"\n🎉 Import completed!")
    print(f"📊 Summary:")
    print(f"   • {total_categories} main categories created")
    print(f"   • {total_subcategories} subcategories created")
    print(f"   • Total: {total_categories + total_subcategories} categories")

if __name__ == "__main__":
    import_categories()