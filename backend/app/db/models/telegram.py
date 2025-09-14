import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from app.db.base import Base
from sqlalchemy import Column, String, Date, Boolean, ForeignKey, Text, JSON, DateTime, UniqueConstraint, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


class TelegramConfig(Base):
    __tablename__ = "telegram_configuration"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    bot_token = Column(String, nullable=False)
    webhook_url = Column(String, nullable=False)

    # Timestaps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
