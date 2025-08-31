from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional
from uuid import UUID
from app.schemas.bank_connection import BankConnectionCallbackResponse
from app.db.models.enable_banking import BankConnection

def get_existing_bank_connection(
    db: Session,
    user_id: UUID,
    bank_code: str,
) -> Optional[BankConnection]:

    existing = db.query(BankConnection).filter(
        and_(
            BankConnection.user_id == user_id,
            BankConnection.bank_code == bank_code,
            BankConnection.deleted_at == "NULL"
        )
    ).first()

    return existing

def create_bank_connection(
    db: Session,
    user_id: UUID,
    callback_response: BankConnectionCallbackResponse,
    connection_status: str,
    bank_code: str,
    account_uid: str,
) -> BankConnection:

    bank_name: str = callback_response.aspsp.name
    country_code: str = callback_response.aspsp.country
    session_id: str = callback_response.session_id
    token_expires_at = callback_response.access.valid_until

    new_connection = BankConnection(  # type: ignore
        user_id=user_id,
        bank_name=bank_name,
        bank_code=bank_code,
        country_code=country_code,
        session_id=session_id,
        account_uid=account_uid,
        token_expires_at=token_expires_at,
        status=connection_status,
    )
    db.add(new_connection)
    db.commit()
    db.refresh(new_connection)
    return new_connection

def update_bank_connection(
    db: Session,
    bank_connection_id: UUID,
    callback_response: BankConnectionCallbackResponse,
    connection_status: str,
    account_uid: str,
) -> BankConnection:

    session_id: str = callback_response.session_id
    token_expires_at = callback_response.access.valid_until

    bank_connection = db.query(BankConnection).filter(
        BankConnection.id == bank_connection_id
    ).first()

    bank_connection.session_id = session_id
    bank_connection.token_expires_at = token_expires_at
    bank_connection.status = connection_status
    bank_connection.account_uid = account_uid

    db.commit()
    db.refresh(bank_connection)
    return bank_connection
