from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SystemSettingsUpdate(BaseModel):
    country: Optional[str] = None
    time_zone: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    first_day_of_week: Optional[str] = None


class SystemSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    country: str
    time_zone: str
    language: str
    currency: str
    date_format: str
    time_format: str
    first_day_of_week: str
    updated_at: datetime
