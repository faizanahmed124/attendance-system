from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DesignationCreate(BaseModel):
    title: str
    description: Optional[str] = None


class DesignationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DesignationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
