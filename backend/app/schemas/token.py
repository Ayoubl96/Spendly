"""
Token Pydantic schemas for authentication
"""

from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    """Access token schema"""
    access_token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = None


class TokenData(BaseModel):
    """Token data schema"""
    user_id: Optional[str] = None
    email: Optional[str] = None


class RefreshToken(BaseModel):
    """Refresh token schema"""
    refresh_token: str


class TokenPair(BaseModel):
    """Token pair schema with access and refresh tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = None