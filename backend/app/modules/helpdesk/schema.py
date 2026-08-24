from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class TicketCreate(BaseModel):
    subject: str
    description: str
    category: Optional[str] = None
    raised_by: int
    priority: Optional[str] = "Medium"


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None
    category: Optional[str] = None


class TicketCommentCreate(BaseModel):
    employee_id: int
    message: str


class TicketCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    employee_id: int
    message: str
    created_at: datetime


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject: str
    description: str
    category: Optional[str] = None
    raised_by: int
    assigned_to: Optional[int] = None
    priority: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None


class TicketWithCommentsOut(TicketOut):
    comments: List[TicketCommentOut] = []
