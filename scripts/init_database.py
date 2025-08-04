#!/usr/bin/env python3
"""
Script to initialize the database with all tables
"""

import sys
from pathlib import Path

# Add the backend directory to the path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

try:
    from sqlalchemy.orm import Session
    from app.core.database import SessionLocal, engine
    from app.db.base import Base
    from app.core.seed_data import seed_initial_data
    from app.schemas.user import UserCreate
    from app.crud.crud_user import user_crud
    
    # Import all models to ensure they're registered with Base
    from app.db.models import user, category, currency, expense, budget
    
    import asyncio
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're running this from the project root and the backend dependencies are installed")
    sys.exit(1)

async def init_database():
    """Initialize the database with tables and seed data"""
    
    print("🚀 Initializing database...")
    
    try:
        # Create all tables
        print("📦 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully")
        
        # Seed initial data (currencies)
        print("🌱 Seeding initial data...")
        db = SessionLocal()
        await seed_initial_data(db)
        db.close()
        print("✅ Initial data seeded")
        
        # Create a test user
        print("👤 Creating test user...")
        db = SessionLocal()
        
        # Check if test user already exists
        existing_user = user_crud.get_by_email(db, email="test@example.com")
        
        if not existing_user:
            test_user = UserCreate(
                email="test@example.com",
                password="testpassword123",
                first_name="Test",
                last_name="User",
                default_currency="EUR"
            )
            
            user = user_crud.create(db, obj_in=test_user)
            print(f"✅ Test user created: {user.first_name} {user.last_name} ({user.email})")
            print(f"   User ID: {user.id}")
            
            # Seed default categories for this user
            from app.core.seed_data import seed_default_categories
            seed_default_categories(db, str(user.id))
            print("✅ Default categories seeded for test user")
            
        else:
            print(f"👤 Test user already exists: {existing_user.email}")
            print(f"   User ID: {existing_user.id}")
        
        db.close()
        
        print("\n🎉 Database initialization completed successfully!")
        print("\n💡 You can now:")
        print("   1. Login with: test@example.com / testpassword123")
        print("   2. Import categories: python3 import_categories.py <user_id>")
        print("   3. Access the app at: http://localhost:3000")
        
    except Exception as e:
        print(f"❌ Error during initialization: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(init_database())