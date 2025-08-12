#!/usr/bin/env python3
"""
Database migration: Allow zero budget amounts
Updates the positive_budget_amount constraint from > 0 to >= 0
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

try:
    from sqlalchemy import text, create_engine
    from sqlalchemy.orm import sessionmaker
    from app.core.config import settings
except ImportError as e:
    print(f"❌ Error importing dependencies: {e}")
    print("Make sure you're running this from the backend directory with the virtual environment activated")
    sys.exit(1)

def run_migration():
    """Run the budget constraint migration"""
    
    print("🔧 Budget Constraint Migration")
    print("=" * 50)
    print("Purpose: Allow budget amounts to be zero (>= 0) instead of only positive (> 0)")
    print()
    
    try:
        # Create database connection
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        with SessionLocal() as db:
            print("🔍 Step 1: Checking current constraint...")
            
            # Check if constraint exists
            result = db.execute(text("""
                SELECT constraint_name, check_clause 
                FROM information_schema.check_constraints 
                WHERE constraint_name = 'positive_budget_amount'
            """)).fetchone()
            
            if result:
                print(f"   Found existing constraint: {result[1]}")
            else:
                print("   No existing constraint found")
            
            print("\n🗑️  Step 2: Dropping existing constraint...")
            db.execute(text("ALTER TABLE budgets DROP CONSTRAINT IF EXISTS positive_budget_amount;"))
            print("   ✓ Constraint dropped (if it existed)")
            
            print("\n➕ Step 3: Adding new constraint (amount >= 0)...")
            db.execute(text("""
                ALTER TABLE budgets ADD CONSTRAINT positive_budget_amount 
                CHECK (CAST(amount AS NUMERIC) >= 0);
            """))
            print("   ✓ New constraint added")
            
            print("\n🔍 Step 4: Verifying new constraint...")
            result = db.execute(text("""
                SELECT constraint_name, check_clause 
                FROM information_schema.check_constraints 
                WHERE constraint_name = 'positive_budget_amount'
            """)).fetchone()
            
            if result and (">= 0" in result[1] or ">=0" in result[1].replace(" ", "")):
                print(f"   ✅ Constraint verified: {result[1]}")
                print("   ✅ Zero amounts are now allowed!")
            else:
                print("   ❌ Constraint verification failed!")
                return False
            
            # Commit the transaction
            db.commit()
            print("\n✅ Migration completed successfully!")
            
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        return False
    
    return True

def show_post_migration_info():
    """Show information about what changed"""
    print("\n" + "=" * 50)
    print("📋 Migration Summary")
    print("=" * 50)
    print()
    print("✅ BEFORE: Budget amounts had to be > 0 (positive only)")
    print("✅ AFTER:  Budget amounts can be >= 0 (zero or positive)")
    print()
    print("This means you can now:")
    print("  ✓ Set budget amounts to 0 (zero)")
    print("  ✓ Set budget amounts to any positive value")
    print("  ✗ Set budget amounts to negative values (still blocked)")
    print()
    print("🔧 Technical Details:")
    print("  - Database constraint updated: amount >= 0")
    print("  - Backend validation updated to allow zero")
    print("  - Frontend validation updated to allow zero")
    print("  - Zero amounts will no longer cause constraint violations")
    print()

if __name__ == "__main__":
    success = run_migration()
    
    if success:
        show_post_migration_info()
        print("🎉 You can now save budgets with zero amounts!")
    else:
        print("\n💡 Troubleshooting:")
        print("  1. Make sure the database is running and accessible")
        print("  2. Check your DATABASE_URL configuration")
        print("  3. Ensure you have proper database permissions")
        print("  4. Try running the SQL script manually instead")
        sys.exit(1)
