"""
User model for authentication and user management
"""

from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base


class User(Base):
    """User model"""
    
    __tablename__ = "users"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # User information
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    
    # User preferences
    default_currency = Column(String(3), nullable=False, default="EUR")
    timezone = Column(String(50), default="Europe/Zurich")
    date_format = Column(String(20), default="DD/MM/YYYY")
    language = Column(String(5), default="en")
    
    # Account status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    expenses = relationship("Expense", back_populates="user", lazy="dynamic")
    categories = relationship("Category", back_populates="user", lazy="dynamic")
    budgets = relationship("Budget", back_populates="user", lazy="dynamic")
    budget_groups = relationship("BudgetGroup", back_populates="user", lazy="dynamic")
    
    @property
    def full_name(self) -> str:
        """Get user's full name"""
        return f"{self.first_name} {self.last_name}"
    
    def update_last_login(self):
        """Update last login timestamp"""
        self.last_login_at = datetime.utcnow()
    
    def __repr__(self) -> str:
        return f"<User(email='{self.email}', name='{self.full_name}')>"