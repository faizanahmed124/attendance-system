from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class RecognitionCreate(BaseModel):
    given_to: int
    category: str
    message: str


class RecognitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    given_by: int
    given_to: int
    category: str
    message: str
    created_at: datetime


class LeaderboardEntry(BaseModel):
    employee_id: int
    kudos_received: int
