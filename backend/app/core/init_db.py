"""
Database initialization script to ensure proper UUID support
"""
from sqlalchemy import text
from app.core.database import engine, Base


def init_database():
    """
    Initialize the database with required extensions and tables
    """
    with engine.connect() as connection:
        # Enable UUID extension
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
        connection.commit()
    
    # Drop and recreate all tables to ensure proper types
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print("Database initialized successfully with UUID support")


if __name__ == "__main__":
    init_database()