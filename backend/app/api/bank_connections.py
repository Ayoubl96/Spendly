from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.core.dependencies import get_db, get_current_user
from app.schemas.bank_connection import (
    BankConnectionAuthInit,
    BankConnectionAuthResponse,
    BankConnectionCallback,
    BankConnectionList,
    BankSessionResponse
)
from app.schemas.user import User
from app.services.enable_banking_service import enable_banking_service
from app.crud.bank_connections import get_existing_bank_connection, create_bank_connection, update_bank_connection, get_user_bank_connections


logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/auth/init", response_model=BankConnectionAuthResponse)
async def init_bank_auth(
    *,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    bank_auth: BankConnectionAuthInit
) -> Any:
    logger.info(f"API: Starting bank auth init for user {user.id}")

    try:
        logger.info(f"API: Calling {enable_banking_service.init_auth}")
        auth_response = await enable_banking_service.init_auth(
            bank_name=bank_auth.bank_name,
            bank_country=bank_auth.bank_country,
            access_type=bank_auth.access_type,
            validity_hours=bank_auth.validity_hours,
            redirect_url=bank_auth.redirect_url
        )

        response = BankConnectionAuthResponse(
            url=auth_response["url"],
            authorization_id=auth_response["authorization_id"],
            psu_id_hash=auth_response["psu_id_hash"]
        )

        return response

    except HTTPException as http_ex:
        logger.error(f"API: HTTPException caught: {http_ex.detail}")
        raise http_ex
    except KeyError as ke:
        logger.error(f"API: Missing key in response from enable_banking_service: {ke}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid response from Enable Banking service: missing {ke}")
    except Exception as e:
        logger.error(f"API: Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {e}")

@router.post("/callback", response_model=BankConnectionList)
async def handle_auth_callback(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    callback_data: BankConnectionCallback
) -> BankConnectionList:
    logger.info(f"API: Calling {enable_banking_service.handle_callback}")
    try:
        callback_response = await enable_banking_service.handle_callback(
            code=callback_data.code
        )
        get_session = await enable_banking_service.get_session(
            session_id=callback_response.session_id
        )
        processed_connections = []
        print(callback_response)
        connection_status = get_session.status
        user_id = current_user.id
        for account in callback_response.accounts:
            bank_code = account.account_id.iban
            print(bank_code)
            print(account)
            existing_conncetion = get_existing_bank_connection(
                db,
                user_id,
                bank_code
            )
            if existing_conncetion is not None:
                update = update_bank_connection(
                    db,
                    existing_conncetion.id,
                    callback_response,
                    connection_status,
                    account.uid
                )
                processed_connections.append(update)
            else:
                new_connection = create_bank_connection(
                    db,
                    user_id,
                    callback_response,
                    connection_status,
                    bank_code,
                    account.uid
                )
                processed_connections.append(new_connection)
        return BankConnectionList(
            connections=processed_connections,
            total=len(processed_connections)
        )
    except Exception as e:
        logger.error(f"API: Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {e}")

@router.get("/session/{session_id}", response_model=BankSessionResponse)
async def get_bank_session(
    *,
    session_id: str
) -> Any:
    logger.info(f"API: Calling {enable_banking_service.get_session}")
    try:
        session_response = await enable_banking_service.get_session(
            session_id=session_id
        )
        return session_response
    except Exception as e:
        logger.error(f"API: Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {e}")

@router.get("/", response_model=BankConnectionList)
async def get_bank_connection_list_by_user(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
)->BankConnectionList:
    logger.info(f"API: Calling {get_user_bank_connections}")
    try:
        connections = get_user_bank_connections(
            db=db,
            user_id=current_user.id
        )
        return connections
    except Exception as e:
        logger.error(f"API: Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {e}")
