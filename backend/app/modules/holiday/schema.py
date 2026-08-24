from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class HolidayItem(BaseModel):
    holiday_date: date
    description: str


class HolidayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    holiday_date: date
    description: str


class HolidayListCreate(BaseModel):
    name: str
    company_id: int
    from_date: date
    to_date: date
    holidays: List[HolidayItem] = []


class HolidayListUpdate(BaseModel):
    name: Optional[str] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None


class HolidayListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company_id: int
    from_date: date
    to_date: date
    created_at: datetime
    holidays: List[HolidayOut] = []
