#!/usr/bin/env python3
"""
Database fix script to handle UUID type conversion
Run this script to fix the database schema issues
"""
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from sqlalchemy import text
from app.core.database import engine, Base


def fix_database():
    """
    Fix the database by enabling UUID extension and recreating tables
    """
    print("Starting database fix...")
    
    try:
        with engine.connect() as connection:
            # Enable UUID extension
            print("Enabling UUID extension...")
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
            connection.commit()
        
        # Drop and recreate all tables to ensure proper types
        print("Dropping existing tables...")
        Base.metadata.drop_all(bind=engine)
        
        print("Creating tables with correct UUID types...")
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database fixed successfully!")
        print("All tables now have proper UUID support.")
        
    except Exception as e:
        print(f"❌ Error fixing database: {e}")
        sys.exit(1)


if __name__ == "__main__":
    fix_database()