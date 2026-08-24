from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CompanyCreate(BaseModel):
    name: str
    abbreviation: str
    default_currency: Optional[str] = "PKR"
    country: Optional[str] = "Pakistan"


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    abbreviation: Optional[str] = None
    default_currency: Optional[str] = None
    country: Optional[str] = None
    is_active: Optional[bool] = None


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    abbreviation: str
    default_currency: str
    country: str
    is_active: bool
    created_at: datetime
