from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    message: str
    link: Optional[str] = None
    notification_type: str
    is_read: bool
    created_at: datetime


class UnreadCountOut(BaseModel):
    count: int
