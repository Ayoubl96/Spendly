"""
Database connection and session management
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings


# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.ENVIRONMENT == "development",  # Log SQL queries in development
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


async def init_db():
    """Initialize database (create tables if they don't exist)"""
    # Import all models here to ensure they are registered with SQLAlchemy
    from app.db.models import user, category, currency, expense, budget, budget_group, payment_method  # noqa
    
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Lightweight migration: ensure new columns/indexes exist on existing tables
    with engine.connect() as conn:
        with conn.begin():
            # 1) budgets.budget_group_id column (nullable)
            conn.exec_driver_sql(
                """
                ALTER TABLE budgets
                ADD COLUMN IF NOT EXISTS budget_group_id UUID NULL
                """
            )
            
            # 2) index for quick lookups
            conn.exec_driver_sql(
                """
                CREATE INDEX IF NOT EXISTS ix_budgets_budget_group_id
                ON budgets (budget_group_id)
                """
            )
            
            # 3) optional FK constraint if not present
            conn.exec_driver_sql(
                """
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints tc
                    WHERE tc.table_name = 'budgets'
                      AND tc.constraint_type = 'FOREIGN KEY'
                      AND tc.constraint_name = 'fk_budgets_budget_group_id'
                  ) THEN
                    ALTER TABLE budgets
                    ADD CONSTRAINT fk_budgets_budget_group_id
                    FOREIGN KEY (budget_group_id) REFERENCES budget_groups(id)
                    ON DELETE SET NULL;
                  END IF;
                END$$;
                """
            )
            
            # 4) expenses.payment_method_id column (nullable) for user payment methods
            conn.exec_driver_sql(
                """
                ALTER TABLE expenses
                ADD COLUMN IF NOT EXISTS payment_method_id UUID NULL
                """
            )
            
            # 5) index for payment method lookups
            conn.exec_driver_sql(
                """
                CREATE INDEX IF NOT EXISTS ix_expenses_payment_method_id
                ON expenses (payment_method_id)
                """
            )
            
            # 6) FK constraint for payment methods (will be added after migration)
            conn.exec_driver_sql(
                """
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints tc
                    WHERE tc.table_name = 'expenses'
                      AND tc.constraint_type = 'FOREIGN KEY'
                      AND tc.constraint_name = 'fk_expenses_payment_method_id'
                  ) THEN
                    -- Check if user_payment_methods table exists first
                    IF EXISTS (
                      SELECT 1 
                      FROM information_schema.tables 
                      WHERE table_name = 'user_payment_methods'
                    ) THEN
                      ALTER TABLE expenses
                      ADD CONSTRAINT fk_expenses_payment_method_id
                      FOREIGN KEY (payment_method_id) REFERENCES user_payment_methods(id)
                      ON DELETE SET NULL;
                    END IF;
                  END IF;
                END$$;
                """
            )
    
    # Add initial seed data
    from app.core.seed_data import seed_initial_data
    db = SessionLocal()
    try:
        await seed_initial_data(db)
    finally:
        db.close()


def get_database_url() -> str:
    """Get the current database URL (for alembic)"""
    return settings.DATABASE_URL