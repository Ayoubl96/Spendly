from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric, Date, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime


class NetWorthSnapshot(Base):
    __tablename__ = "net_worth_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    total_assets = Column(Numeric(15, 2), nullable=False, default=0)
    total_liabilities = Column(Numeric(15, 2), nullable=False, default=0)
    net_worth = Column(Numeric(15, 2), nullable=False, default=0)
    currency = Column(String(3), default="USD", nullable=False)
    asset_breakdown = Column(JSON, nullable=True)  # Detailed breakdown by asset type
    liability_breakdown = Column(JSON, nullable=True)  # Detailed breakdown of liabilities
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="net_worth_snapshots")

    def __repr__(self):
        return f"<NetWorthSnapshot(date='{self.date}', net_worth={self.net_worth})>"