'''
Bank Connection Schemas
'''

from datetime import date, datetime
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

class AccountId(BaseModel):
    iban: str
    other: Optional[str] = None

class AllAccountId(BaseModel):
    identification: str
    scheme_name: str
    issuer: Optional[str] = None

class AccountAuth(BaseModel):
    account_id: AccountId
    all_account_ids: List[AllAccountId]
    account_servicer: Optional[str] = None
    name: str
    details: Optional[str] = None
    usage: str
    product: Optional[str] = None
    currency: str
    psu_status: Optional[str] = None
    credit_limit: Optional[str] = None
    debit_limit: Optional[str] = None
    legal_age: Optional[str] = None
    postal_address: Optional[str] = None
    uid: str
    identification_hash: str
    identification_hashes: List[str]

class AccountAccess(BaseModel):
    accounts: Optional[str] = None
    balances: bool
    transactions: bool
    valid_until: datetime

class ASPSPData(BaseModel):
    name: str
    country: str



class BankConnectionCallbackResponse(BaseModel):
    session_id: str
    accounts: List[AccountAuth]
    aspsp: ASPSPData
    access: AccountAccess
    psu_type: str


class BankConnection(BaseModel):
    id: UUID
    user_id: UUID
    bank_name: str
    bank_code: str
    country_code: str
    session_id: str
    token_expires_at: datetime
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

class BankConnectionList(BaseModel):
    connections: List[BankConnection]
    total: int

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

class BankSessionParameters(BaseModel):
    session_id: str

class AccountData(BaseModel):
    uid: str
    identification_hash: str
    identification_hashes: List[str]

class BankSessionResponse(BaseModel):
    status: str
    accounts: List[str]
    accounts_data: List[AccountData]
    aspsp: ASPSPData
    psu_type: str
    psu_id_hash: str
    access: AccountAccess
    created: datetime
    authorized: datetime
    closed: Optional[datetime] = None
