from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.core.dependencies import get_db, get_current_user
from app.schemas.bank_connection import (
    BankConnectionAuthInit,
    BankConnectionAuthResponse,
    BankConnectionCallbackResponse,
    BankConnectionCallback
)
from app.schemas.user import User
from app.services.enable_banking_service import enable_banking_service

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
    logger.info(f"API: Received bank auth request: {bank_auth.dict()}")

    try:
        logger.info(f"API: Calling enable_banking_service.init_auth")
        auth_response = await enable_banking_service.init_auth(
            bank_name=bank_auth.bank_name,
            bank_country=bank_auth.bank_country,
            access_type=bank_auth.access_type,
            validity_hours=bank_auth.validity_hours,
            redirect_url=bank_auth.redirect_url
        )

        logger.info(f"API: Received response from enable_banking_service: {auth_response}")

        response = BankConnectionAuthResponse(
            url=auth_response["url"],
            authorization_id=auth_response["authorization_id"],
            psu_id_hash=auth_response["psu_id_hash"]
        )

        logger.info(f"API: Successfully created response: {response.dict()}")
        return response

    except HTTPException as http_ex:
        logger.error(f"API: HTTPException caught: {http_ex.detail}")
        raise http_ex
    except KeyError as ke:
        logger.error(f"API: Missing key in response from enable_banking_service: {ke}")
        logger.error(f"API: Full response was: {auth_response if 'auth_response' in locals() else 'No response received'}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid response from Enable Banking service: missing {ke}")
    except Exception as e:
        logger.error(f"API: Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {e}")

@router.post("/callback", response_model=BankConnectionCallbackResponse)
async def handle_auth_callback(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    callback_data: BankConnectionCallback
) -> Any:
    logger.info(f"API: Calling enable_banking_service.handle_auth_callback")
    try:
        callback_response = await enable_banking_service.handle_callback(
            code=callback_data.code
        )
        return callback_response
    except Exception as e:
        logger.error(f"API: Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {e}")
