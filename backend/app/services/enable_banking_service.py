"""
Enable Banking Integration
"""
import httpx
import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException
from datetime import datetime
from app.schemas import BankConnectionCallbackResponse, BankSessionResponse, TransactionsResponse

logger = logging.getLogger(__name__)

class EnableBankingService:
    def __init__(self):
        self.base_url = "http://enable-banking-service.enable-banking-service.orb.local:8001"
        self.timeout = 30

    async def init_auth(
        self,
        bank_name: str,
        bank_country: str,
        access_type: str,
        validity_hours: int,
        redirect_url: str,
    ) -> Dict[str, Any]:
        logger.info(f"Enable Banking Service: Starting auth init for bank: {bank_name}, country: {bank_country}")
        logger.info(f"Enable Banking Service: Using base URL: {self.base_url}")

        request_data = {
            "bank_name": bank_name,
            "bank_country": bank_country,
            "access_type": access_type,
            "validity_hours": validity_hours,
            "redirect_url": redirect_url,
        }
        logger.info(f"Enable Banking Service: Request data: {request_data}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                full_url = f"{self.base_url}/auth/init"

                response = await client.post(full_url, params=request_data)

                if response.status_code >= 400:
                    response_text = response.text
                    logger.error(f"Enable Banking Service: Error response body: {response_text}")

                response.raise_for_status()

                response_json = response.json()
                return response_json

        except httpx.ConnectError as e:
            logger.error(f"Enable Banking Service: Connection error to {self.base_url}: {e}")
            raise HTTPException(status_code=503, detail=f"Cannot connect to Enable Banking service at {self.base_url}")
        except httpx.TimeoutException as e:
            logger.error(f"Enable Banking Service: Timeout error: {e}")
            raise HTTPException(status_code=504, detail="Enable Banking service timeout")
        except httpx.HTTPStatusError as e:
            logger.error(f"Enable Banking Service: HTTP status error {e.response.status_code}: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Enable Banking service error: {e.response.text}")
        except Exception as e:
            logger.error(f"Enable Banking Service: Unexpected error: {type(e).__name__}: {e}")
            raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

    async def handle_callback(self, code: str) -> BankConnectionCallbackResponse:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                full_url = f"{self.base_url}/callback"

                response = await client.post(full_url, params={"code": code})

                if response.status_code >= 400:
                    response_text = response.text
                    logger.error(f"Enable Banking Service: Error response body: {response_text}")
                response_json = response.json()

                return BankConnectionCallbackResponse(**response_json)

        except httpx.ConnectError as e:
            logger.error(f"Enable Banking Service: Connection error to {self.base_url}: {e}")
            raise HTTPException(status_code=503, detail=f"Cannot connect to Enable Banking service at {self.base_url}")
        except httpx.TimeoutException as e:
            logger.error(f"Enable Banking Service: Timeout error: {e}")
            raise HTTPException(status_code=504, detail="Enable Banking service timeout")
        except httpx.HTTPStatusError as e:
            logger.error(f"Enable Banking Service: HTTP status error {e.response.status_code}: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Enable Banking service error: {e.response.text}")
        except Exception as e:
            logger.error(f"Enable Banking Service: Unexpected error: {type(e).__name__}: {e}")
            raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")


    async def get_session(self, session_id: str) -> BankSessionResponse:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                full_url = f"{self.base_url}/session"

                response = await client.get(full_url, params={"session_id": session_id})

                if response.status_code >= 400:
                    response_text = response.text
                    logger.error(f"Enable Banking Service: Error response body: {response_text}")
                    raise HTTPException(status_code=response.status_code, detail=f"Enable Banking service error: {response_text}")

                response_json = response.json()

                return BankSessionResponse(**response_json)

        except httpx.ConnectError as e:
            logger.error(f"Enable Banking Service: Connection error to {self.base_url}: {e}")
            raise HTTPException(status_code=503, detail=f"Cannot connect to Enable Banking service at {self.base_url}")
        except httpx.TimeoutException as e:
            logger.error(f"Enable Banking Service: Timeout error: {e}")
            raise HTTPException(status_code=504, detail="Enable Banking service timeout")
        except httpx.HTTPStatusError as e:
            logger.error(f"Enable Banking Service: HTTP status error {e.response.status_code}: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Enable Banking service error: {e.response.text}")
        except Exception as e:
            logger.error(f"Enable Banking Service: Unexpected error: {type(e).__name__}: {e}")
            raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

    async def get_transaction(self, account_id: str, date_from: datetime, date_to: datetime) -> TransactionsResponse:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                full_url = f"{self.base_url}/account/{account_id}/transactions"

                response = await client.get(full_url, params={"date_from": date_from, "date_to": date_to })

                return TransactionsResponse(**response.json())
        except httpx.ConnectError as e:
            logger.error(f"Enable Banking Service: Connection error to {self.base_url}: {e}")
            raise HTTPException(status_code=503, detail=f"Cannot connect to Enable Banking service at {self.base_url}")

# Create global instance
enable_banking_service = EnableBankingService()
