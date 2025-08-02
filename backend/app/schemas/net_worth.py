from pydantic import BaseModel, Field, field_serializer
from typing import Optional, List, Dict
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID


class NetWorthSnapshotBase(BaseModel):
    date: date
    total_assets: Decimal = Field(0)
    total_liabilities: Decimal = Field(0)
    net_worth: Decimal = Field(0)
    currency: str = Field("USD", min_length=3, max_length=3)
    asset_breakdown: Optional[Dict[str, Decimal]] = None
    liability_breakdown: Optional[Dict[str, Decimal]] = None
    notes: Optional[str] = None


class NetWorthSnapshotCreate(NetWorthSnapshotBase):
    pass


class NetWorthSnapshotUpdate(BaseModel):
    total_assets: Optional[Decimal] = Field(None)
    total_liabilities: Optional[Decimal] = Field(None)
    net_worth: Optional[Decimal] = Field(None)
    asset_breakdown: Optional[Dict[str, Decimal]] = None
    liability_breakdown: Optional[Dict[str, Decimal]] = None
    notes: Optional[str] = None


class NetWorthSnapshotInDBBase(NetWorthSnapshotBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    @field_serializer('id', 'user_id', when_used='unless-none')
    def serialize_uuid_fields(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


class NetWorthSnapshot(NetWorthSnapshotInDBBase):
    pass


class NetWorthTrend(BaseModel):
    date: date
    net_worth: Decimal
    total_assets: Decimal
    total_liabilities: Decimal
    change_amount: Decimal = Field(0)
    change_percentage: Decimal = Field(0)


class NetWorthSummary(BaseModel):
    current_net_worth: Decimal
    current_assets: Decimal
    current_liabilities: Decimal
    currency: str
    last_update: Optional[date] = None
    change_1m: Decimal = Field(0)
    change_3m: Decimal = Field(0)
    change_6m: Decimal = Field(0)
    change_1y: Decimal = Field(0)
    change_percentage_1m: Decimal = Field(0)
    change_percentage_3m: Decimal = Field(0)
    change_percentage_6m: Decimal = Field(0)
    change_percentage_1y: Decimal = Field(0)
    trends: List[NetWorthTrend] = []