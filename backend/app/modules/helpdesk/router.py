from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.helpdesk import service
from app.modules.helpdesk.schema import (
    TicketCreate, TicketUpdate, TicketOut, TicketWithCommentsOut,
    TicketCommentCreate, TicketCommentOut,
)

router = APIRouter(prefix="/api/helpdesk", tags=["Help Desk"])


@router.get("/tickets", response_model=List[TicketOut])
def list_tickets(
    status: Optional[str] = None, assigned_to: Optional[int] = None, raised_by: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("helpdesk", "read")),
):
    return service.list_tickets(db, status, assigned_to, raised_by)


@router.get("/tickets/{ticket_id}", response_model=TicketWithCommentsOut)
def get_ticket(
    ticket_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("helpdesk", "read")),
):
    ticket = service.get_ticket(db, ticket_id)
    return TicketWithCommentsOut(
        **TicketOut.model_validate(ticket).model_dump(),
        comments=[TicketCommentOut.model_validate(c) for c in service.get_comments(db, ticket_id)],
    )


@router.post("/tickets", response_model=TicketOut)
def create_ticket(
    payload: TicketCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("helpdesk", "create")),
):
    return service.create_ticket(db, payload)


@router.put("/tickets/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: int, payload: TicketUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("helpdesk", "write")),
):
    return service.update_ticket(db, ticket_id, payload)


@router.delete("/tickets/{ticket_id}")
def delete_ticket(
    ticket_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("helpdesk", "delete")),
):
    service.delete_ticket(db, ticket_id)
    return {"message": "Ticket deleted successfully"}


@router.post("/tickets/{ticket_id}/comments", response_model=TicketCommentOut)
def add_comment(
    ticket_id: int, payload: TicketCommentCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("helpdesk", "write")),
):
    return service.add_comment(db, ticket_id, payload)
