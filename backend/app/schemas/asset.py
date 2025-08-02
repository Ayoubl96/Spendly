from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from enum import Enum


class AssetType(str, Enum):
    CASH = "cash"
    SAVINGS = "savings"
    INVESTMENT = "investment"
    PROPERTY = "property"
    VEHICLE = "vehicle"
    CRYPTO = "crypto"
    OTHER = "other"


class AssetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: AssetType
    value: Decimal = Field(..., ge=0, decimal_places=2)
    currency: str = Field("USD", min_length=3, max_length=3)
    institution: Optional[str] = Field(None, max_length=100)
    account_number: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    is_liquid: bool = True


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[AssetType] = None
    value: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    institution: Optional[str] = Field(None, max_length=100)
    account_number: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    is_liquid: Optional[bool] = None


class AssetInDBBase(AssetBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class Asset(AssetInDBBase):
    pass


class AssetSummary(BaseModel):
    total_assets: Decimal
    liquid_assets: Decimal
    illiquid_assets: Decimal
    asset_count: int
    assets_by_type: dict[str, Decimal] = {}
    assets: List[Asset] = []