"""
Enable Banking Integration
"""
import httpx
import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException
from app.core.config import settings


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
                logger.info(f"Enable Banking Service: Making POST request to: {full_url}")
                logger.info(f"Enable Banking Service: Sending as query parameters: {request_data}")

                response = await client.post(full_url, params=request_data)

                logger.info(f"Enable Banking Service: Response status: {response.status_code}")
                logger.info(f"Enable Banking Service: Response headers: {response.headers}")

                if response.status_code >= 400:
                    response_text = response.text
                    logger.error(f"Enable Banking Service: Error response body: {response_text}")

                response.raise_for_status()

                response_json = response.json()
                logger.info(f"Enable Banking Service: Success response: {response_json}")
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

    async def handle_callback(self, code: str) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                full_url = f"{self.base_url}/callback"
                logger.info(f"Enable Banking Service: making post request to {full_url}")
                logger.info(f"Enable Banking Service: Sending as query parameter code={code}")

                response = await client.post(full_url, params={"code": code})

                if response.status_code >= 400:
                    response_text = response.text
                    logger.error(f"Enable Banking Service: Error response body: {response_text}")
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





# Create global instance
enable_banking_service = EnableBankingService()
