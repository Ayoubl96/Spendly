from sqlalchemy import Column, String, ForeignKey, Enum as SQLEnum, DateTime, Numeric, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime
import enum


class AssetType(str, enum.Enum):
    CASH = "cash"
    SAVINGS = "savings"
    INVESTMENT = "investment"
    PROPERTY = "property"
    VEHICLE = "vehicle"
    CRYPTO = "crypto"
    OTHER = "other"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(SQLEnum(AssetType), nullable=False)
    value = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    institution = Column(String(100), nullable=True)  # Bank, broker, etc.
    account_number = Column(String(50), nullable=True)  # Last 4 digits only
    notes = Column(Text, nullable=True)
    is_liquid = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="assets")

    def __repr__(self):
        return f"<Asset(name='{self.name}', type='{self.type.value}', value={self.value})>"