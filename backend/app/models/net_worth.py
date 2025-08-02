from sqlalchemy import Column, String, Numeric, Date, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid


class NetWorthSnapshot(Base):
    __tablename__ = "net_worth_snapshots"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    total_assets = Column(Numeric(12, 2), nullable=False)
    total_liabilities = Column(Numeric(12, 2), nullable=False)
    net_worth = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="EUR")
    asset_breakdown = Column(JSON, nullable=True)  # Detailed breakdown by asset type
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="net_worth_snapshots")
    
    def __repr__(self):
        return f"<NetWorthSnapshot(date='{self.date}', net_worth={self.net_worth})>"