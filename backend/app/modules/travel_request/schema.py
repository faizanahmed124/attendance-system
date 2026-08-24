from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TravelRequestCreate(BaseModel):
    employee_id: int
    purpose: str
    travel_type: Optional[str] = "Domestic"
    destination: str
    from_date: date
    to_date: date
    estimated_cost: Optional[float] = None
    advance_amount: Optional[float] = None


class TravelRequestUpdate(BaseModel):
    status: Optional[str] = None  # Open, Approved, Rejected
    purpose: Optional[str] = None
    estimated_cost: Optional[float] = None
    advance_amount: Optional[float] = None


class TravelRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    purpose: str
    travel_type: str
    destination: str
    from_date: date
    to_date: date
    estimated_cost: Optional[float] = None
    advance_amount: Optional[float] = None
    posting_date: date
    status: str
    created_at: datetime
