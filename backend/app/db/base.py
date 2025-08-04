"""
Base model class with common fields and utilities
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.ext.declarative import as_declarative, declared_attr
from sqlalchemy.dialects.postgresql import UUID


@as_declarative()
class Base:
    """Base class for all database models"""
    
    # Generate table name automatically
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower() + "s"
    
    # Common fields for all models
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class TimestampMixin:
    """Mixin for models that need timestamps"""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ActiveMixin:
    """Mixin for models that can be soft deleted"""
    is_active = Column(Boolean, default=True, nullable=False, index=True)