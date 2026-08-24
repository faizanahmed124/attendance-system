from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.modules.helpdesk.model import Ticket, TicketComment
from app.modules.helpdesk.schema import TicketCreate, TicketUpdate, TicketCommentCreate


def _notify_employee(db: Session, employee_id: int | None, title: str, message: str, link: str):
    """
    Best-effort notification - looks up the Employee's linked User account
    and notifies them. Silently does nothing if there's no employee_id or
    no linked User, since not every employee necessarily has a login (and
    a missing notification should never block the actual ticket action).
    """
    if not employee_id:
        return
    from app.modules.employee.model import Employee
    from app.modules.notification.service import create_notification

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee and employee.user_id:
        create_notification(db, employee.user_id, title, message, link=link, notification_type="helpdesk")


def list_tickets(db: Session, status: str | None = None, assigned_to: int | None = None, raised_by: int | None = None):
    query = db.query(Ticket)
    if status:
        query = query.filter(Ticket.status == status)
    if assigned_to:
        query = query.filter(Ticket.assigned_to == assigned_to)
    if raised_by:
        query = query.filter(Ticket.raised_by == raised_by)
    return query.order_by(Ticket.created_at.desc()).all()


def get_ticket(db: Session, ticket_id: int) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise NotFoundError("Ticket not found")
    return ticket


def get_comments(db: Session, ticket_id: int):
    return db.query(TicketComment).filter(TicketComment.ticket_id == ticket_id).order_by(TicketComment.created_at).all()


def create_ticket(db: Session, payload: TicketCreate) -> Ticket:
    ticket = Ticket(**payload.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def update_ticket(db: Session, ticket_id: int, payload: TicketUpdate) -> Ticket:
    ticket = get_ticket(db, ticket_id)
    data = payload.model_dump(exclude_unset=True)

    newly_assigned = "assigned_to" in data and data["assigned_to"] and data["assigned_to"] != ticket.assigned_to

    for field, value in data.items():
        setattr(ticket, field, value)

    if ticket.status in ("Resolved", "Closed") and not ticket.resolved_at:
        ticket.resolved_at = datetime.now(timezone.utc)
    elif ticket.status not in ("Resolved", "Closed"):
        ticket.resolved_at = None

    db.commit()
    db.refresh(ticket)

    if newly_assigned:
        _notify_employee(
            db, ticket.assigned_to, "New ticket assigned to you",
            f"'{ticket.subject}' was assigned to you.", f"/helpdesk/tickets/{ticket.id}",
        )

    return ticket


def delete_ticket(db: Session, ticket_id: int) -> None:
    ticket = get_ticket(db, ticket_id)
    db.query(TicketComment).filter(TicketComment.ticket_id == ticket_id).delete()
    db.delete(ticket)
    db.commit()


def add_comment(db: Session, ticket_id: int, payload: TicketCommentCreate) -> TicketComment:
    ticket = get_ticket(db, ticket_id)  # 404s if invalid
    comment = TicketComment(ticket_id=ticket_id, employee_id=payload.employee_id, message=payload.message)
    db.add(comment)

    # bump status to "Replied" if the commenter isn't the person who raised it
    # (i.e. support staff replying), so it's visually distinct from a fresh unread ticket
    if payload.employee_id != ticket.raised_by and ticket.status == "Open":
        ticket.status = "Replied"

    db.commit()
    db.refresh(comment)

    # notify whichever side of the conversation DIDN'T just post the comment
    other_party = ticket.assigned_to if payload.employee_id == ticket.raised_by else ticket.raised_by
    if other_party and other_party != payload.employee_id:
        _notify_employee(
            db, other_party, "New reply on ticket",
            f"New reply on '{ticket.subject}'.", f"/helpdesk/tickets/{ticket.id}",
        )

    return comment
