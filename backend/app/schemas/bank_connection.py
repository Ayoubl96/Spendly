'''
Bank Connection Schemas
'''

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID

from app.schemas.user import User


class BankConnectionAuthInit(BaseModel):
    bank_name: str = Field(..., description="Name of the bank")
    bank_country: str = Field(..., description="Country of the bank")
    access_type: str = Field(..., description="Type of access")
    validity_hours: int = Field(..., description="Validity hours")
    redirect_url: str = Field(..., description="Redirect URL")

class BankConnectionAuthResponse(BaseModel):
    url: str = Field(..., description="URL for the bank connection")
    authorization_id: str = Field(..., description="ID for the authorization")
    psu_id_hash: str = Field(..., description="Hashed ID for the PSU")

class BankConnectionCallback(BaseModel):
    code: str = Field(..., description="Code for the bank connection")

class BankAccountData(BaseModel):
    uid: str
    identification_hash: str
    identification_hashes: List[str]

class ASPSPData(BaseModel):
    name: str
    country: str

class AccessData(BaseModel):
    accounts: Optional[List[str]] = None
    balances: bool
    transactions: bool
    valid_until: datetime


class BankConnectionCallbackResponse(BaseModel):
    session_id: str
    accounts: List[str]
    accounts_data: List[BankAccountData]
    aspsp: ASPSPData
    psu_type: str
    psu_id_hash: str
    access: AccessData
    created: datetime
    authorized: datetime
    closed: Optional[datetime] = None

class BankConnection(BaseModel):
    id: UUID
    user_id: UUID
    bank_name: str
    bank_code: str
    country_code: str
    session_id: str
    status: str
    last_sync_at: Optional[datetime] = None
    next_sync_at: Optional[datetime] = None
    sync_enabled: bool = False
    last_error: Optional[str] = None
    error_count: int = 0
    auto_categorize: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BankConnectionCreate(BaseModel):
    user_id: UUID
    bank_name: str
    bank_code: str
    country_code: str
    session_id: str
    status: str
    auto_categorize: bool = True
    created_at: datetime
    updated_at: datetime


class BankConnectionList(BaseModel):
    connections: List[BankConnection]
    total: int
