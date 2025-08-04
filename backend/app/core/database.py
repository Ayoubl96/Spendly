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
    from app.db.models import user, category, currency, expense, budget  # noqa
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
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