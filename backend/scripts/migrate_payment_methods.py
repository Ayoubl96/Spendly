#!/usr/bin/env python3
"""
Migration script to convert legacy payment method strings to user payment methods.

This script:
1. Creates default payment methods for all existing users
2. Migrates existing expense payment_method strings to payment_method_id references
3. Preserves all existing data safely

Usage:
    python scripts/migrate_payment_methods.py [--dry-run] [--user-id USER_ID]
"""

import asyncio
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Any

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.db.models.user import User
from app.db.models.expense import Expense
from app.db.models.payment_method import UserPaymentMethod
from app.crud.crud_payment_method import payment_method as payment_method_crud
from app.schemas.payment_method import DEFAULT_PAYMENT_METHODS


def get_migration_stats(db: Session) -> Dict[str, Any]:
    """Get statistics about the migration"""
    stats = {}
    
    # Count users
    stats["total_users"] = db.query(User).count()
    
    # Count users with payment methods
    stats["users_with_payment_methods"] = db.query(User.id).join(
        UserPaymentMethod, User.id == UserPaymentMethod.user_id
    ).distinct().count()
    
    # Count expenses with legacy payment methods
    stats["expenses_with_legacy_payment_methods"] = db.query(Expense).filter(
        Expense.payment_method.isnot(None)
    ).count()
    
    # Count expenses with new payment method references
    stats["expenses_with_new_payment_methods"] = db.query(Expense).filter(
        Expense.payment_method_id.isnot(None)
    ).count()
    
    # Count total expenses
    stats["total_expenses"] = db.query(Expense).count()
    
    # Legacy payment method distribution
    legacy_distribution = db.execute(
        text("""
        SELECT payment_method, COUNT(*) as count
        FROM expenses 
        WHERE payment_method IS NOT NULL
        GROUP BY payment_method
        ORDER BY count DESC
        """)
    ).fetchall()
    
    stats["legacy_payment_method_distribution"] = [
        {"method": row[0], "count": row[1]} for row in legacy_distribution
    ]
    
    return stats


def create_default_payment_methods_for_all_users(db: Session, dry_run: bool = False) -> List[Dict]:
    """Create default payment methods for all users"""
    print("🔧 Creating default payment methods for all users...")
    
    users = db.query(User).all()
    results = []
    
    for user in users:
        # Check if user already has payment methods
        existing_methods = payment_method_crud.get_by_user(db, user_id=user.id)
        
        if not existing_methods:
            print(f"  Creating default payment methods for user: {user.email}")
            
            if not dry_run:
                created_methods = payment_method_crud.create_default_payment_methods(
                    db, user_id=user.id
                )
                results.append({
                    "user_id": str(user.id),
                    "user_email": user.email,
                    "created_methods": len(created_methods),
                    "method_names": [m.name for m in created_methods]
                })
            else:
                results.append({
                    "user_id": str(user.id),
                    "user_email": user.email,
                    "created_methods": len(DEFAULT_PAYMENT_METHODS),
                    "method_names": [m["name"] for m in DEFAULT_PAYMENT_METHODS]
                })
        else:
            print(f"  User {user.email} already has {len(existing_methods)} payment methods")
    
    return results


def migrate_expense_payment_methods(db: Session, user_id: str = None, dry_run: bool = False) -> Dict[str, Any]:
    """Migrate legacy payment method strings to payment method IDs"""
    print("🔧 Migrating expense payment methods...")
    
    # Build query for expenses with legacy payment methods
    query = db.query(Expense).filter(
        Expense.payment_method.isnot(None),
        Expense.payment_method_id.is_(None)  # Not already migrated
    )
    
    if user_id:
        query = query.filter(Expense.user_id == user_id)
    
    expenses_to_migrate = query.all()
    
    print(f"  Found {len(expenses_to_migrate)} expenses to migrate")
    
    migration_results = {
        "migrated_count": 0,
        "failed_count": 0,
        "failed_expenses": [],
        "migration_mapping": {}
    }
    
    for expense in expenses_to_migrate:
        try:
            # Find the corresponding user payment method
            payment_method_obj = payment_method_crud.migrate_legacy_payment_method(
                db, user_id=expense.user_id, legacy_value=expense.payment_method
            )
            
            if payment_method_obj:
                print(f"    Migrating expense {expense.id}: '{expense.payment_method}' -> '{payment_method_obj.name}'")
                
                if not dry_run:
                    expense.payment_method_id = payment_method_obj.id
                    # Keep the legacy payment_method field for now (backward compatibility)
                
                migration_results["migrated_count"] += 1
                
                # Track mapping
                legacy_method = expense.payment_method
                if legacy_method not in migration_results["migration_mapping"]:
                    migration_results["migration_mapping"][legacy_method] = {
                        "target_name": payment_method_obj.name,
                        "target_id": str(payment_method_obj.id),
                        "count": 0
                    }
                migration_results["migration_mapping"][legacy_method]["count"] += 1
                
            else:
                print(f"    ❌ Failed to migrate expense {expense.id}: Unknown payment method '{expense.payment_method}'")
                migration_results["failed_count"] += 1
                migration_results["failed_expenses"].append({
                    "expense_id": str(expense.id),
                    "legacy_payment_method": expense.payment_method,
                    "user_id": str(expense.user_id)
                })
                
        except Exception as e:
            print(f"    ❌ Error migrating expense {expense.id}: {str(e)}")
            migration_results["failed_count"] += 1
            migration_results["failed_expenses"].append({
                "expense_id": str(expense.id),
                "legacy_payment_method": expense.payment_method,
                "user_id": str(expense.user_id),
                "error": str(e)
            })
    
    if not dry_run and migration_results["migrated_count"] > 0:
        print(f"  💾 Committing {migration_results['migrated_count']} expense updates...")
        db.commit()
    
    return migration_results


def verify_migration(db: Session) -> Dict[str, Any]:
    """Verify the migration was successful"""
    print("🔍 Verifying migration...")
    
    verification = {}
    
    # Check that all users have payment methods
    users_without_payment_methods = db.execute(
        text("""
        SELECT u.id, u.email 
        FROM users u
        LEFT JOIN user_payment_methods upm ON u.id = upm.user_id AND upm.is_active = true
        WHERE upm.id IS NULL
        """)
    ).fetchall()
    
    verification["users_without_payment_methods"] = [
        {"id": str(row[0]), "email": row[1]} for row in users_without_payment_methods
    ]
    
    # Check expenses that still need migration
    unmigrated_expenses = db.execute(
        text("""
        SELECT payment_method, COUNT(*) as count
        FROM expenses 
        WHERE payment_method IS NOT NULL AND payment_method_id IS NULL
        GROUP BY payment_method
        """)
    ).fetchall()
    
    verification["unmigrated_expenses"] = [
        {"method": row[0], "count": row[1]} for row in unmigrated_expenses
    ]
    
    # Check successful migrations
    migrated_expenses = db.execute(
        text("""
        SELECT e.payment_method, upm.name, COUNT(*) as count
        FROM expenses e
        JOIN user_payment_methods upm ON e.payment_method_id = upm.id
        WHERE e.payment_method IS NOT NULL
        GROUP BY e.payment_method, upm.name
        """)
    ).fetchall()
    
    verification["successful_migrations"] = [
        {"legacy_method": row[0], "new_method": row[1], "count": row[2]} 
        for row in migrated_expenses
    ]
    
    return verification


def main():
    parser = argparse.ArgumentParser(description="Migrate payment methods to user-specific system")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    parser.add_argument("--user-id", help="Migrate data for specific user only")
    parser.add_argument("--verify-only", action="store_true", help="Only run verification")
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("🔍 DRY RUN MODE - No changes will be made")
    
    print("🚀 Starting payment method migration...")
    
    db = SessionLocal()
    try:
        # Show initial stats
        print("\n📊 Initial Migration Stats:")
        initial_stats = get_migration_stats(db)
        for key, value in initial_stats.items():
            print(f"  {key}: {value}")
        
        if not args.verify_only:
            # Step 1: Create default payment methods for all users
            print("\n" + "="*60)
            user_results = create_default_payment_methods_for_all_users(db, dry_run=args.dry_run)
            print(f"✅ Created payment methods for {len(user_results)} users")
            
            # Step 2: Migrate expense payment methods
            print("\n" + "="*60)
            migration_results = migrate_expense_payment_methods(db, user_id=args.user_id, dry_run=args.dry_run)
            print(f"✅ Migrated {migration_results['migrated_count']} expenses")
            if migration_results['failed_count'] > 0:
                print(f"❌ Failed to migrate {migration_results['failed_count']} expenses")
                for failed in migration_results['failed_expenses'][:5]:  # Show first 5
                    print(f"  - {failed}")
        
        # Step 3: Verify migration
        print("\n" + "="*60)
        verification = verify_migration(db)
        
        if verification["users_without_payment_methods"]:
            print(f"⚠️  {len(verification['users_without_payment_methods'])} users still without payment methods")
        else:
            print("✅ All users have payment methods")
        
        if verification["unmigrated_expenses"]:
            print(f"⚠️  {sum(e['count'] for e in verification['unmigrated_expenses'])} expenses still need migration")
            for item in verification["unmigrated_expenses"]:
                print(f"  - {item['method']}: {item['count']} expenses")
        else:
            print("✅ All expenses have been migrated")
        
        # Show final stats
        print("\n📊 Final Migration Stats:")
        final_stats = get_migration_stats(db)
        for key, value in final_stats.items():
            print(f"  {key}: {value}")
        
        print("\n🎉 Migration completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
