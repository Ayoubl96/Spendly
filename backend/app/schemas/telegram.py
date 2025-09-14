from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class TelegramConfigBae(BaseModel):
    bot_token: str
    webhook_url: Optional[str]

class TeelgramConfigCreate(TelegramConfigBae):
    pass

class TelegramConfigUpdate(BaseModel):
    bot_token: Optional[str]
    webhook_url: Optional[str]

class TelegramConfig(TelegramConfigBae):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
class TelegramLinkRequest(BaseModel):
    chat_id: str

class TelegramLinkResponse(BaseModel):
    success: bool
    message: str
    bot_username: Optional[str] = None

class TelegramNotificationTest(BaseModel):
    message: str
