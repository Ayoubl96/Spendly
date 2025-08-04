#!/usr/bin/env python3
"""
Helper script to get user IDs from the database
"""

import sys
from pathlib import Path

# Add the backend directory to the path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

try:
    from sqlalchemy.orm import Session
    from app.core.database import SessionLocal
    from app.db.models.user import User
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're running this from the project root and the backend dependencies are installed")
    sys.exit(1)

def get_users():
    """Get all users from the database"""
    
    db: Session = SessionLocal()
    
    try:
        users = db.query(User).filter(User.is_active == True).all()
        
        if not users:
            print("❌ No active users found in database")
            print("   Create a user account first through the registration endpoint")
            return []
        
        print(f"👥 Found {len(users)} active user(s):")
        for i, user in enumerate(users, 1):
            print(f"   {i}. {user.first_name} {user.last_name} ({user.email})")
            print(f"      ID: {user.id}")
            print(f"      Created: {user.created_at.strftime('%Y-%m-%d %H:%M')}")
            print()
        
        return users
        
    except Exception as e:
        print(f"❌ Error getting users: {e}")
        return []
    finally:
        db.close()

if __name__ == "__main__":
    print("🔍 Getting user IDs from database...")
    users = get_users()
    
    if users:
        print("💡 To import categories for a user, run:")
        print(f"   python3 import_categories.py {users[0].id}")