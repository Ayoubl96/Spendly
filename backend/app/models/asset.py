from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Enum, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
import enum


class AssetType(str, enum.Enum):
    CASH = "cash"
    INVESTMENT = "investment"
    PROPERTY = "property"
    VEHICLE = "vehicle"
    CRYPTO = "crypto"
    OTHER = "other"


class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(Enum(AssetType), nullable=False)
    value = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="EUR")
    description = Column(Text, nullable=True)
    institution = Column(String, nullable=True)  # Bank, broker, etc.
    is_liability = Column(Boolean, default=False)  # For debts/loans
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="assets")
    
    def __repr__(self):
        return f"<Asset(name='{self.name}', type='{self.type.value}', value={self.value})>"