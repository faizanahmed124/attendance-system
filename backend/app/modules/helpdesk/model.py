from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Ticket(Base):
    """A support/IT/HR help desk ticket."""
    __tablename__ = "helpdesk_tickets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    subject: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)  # IT, HR, Payroll, Facilities, Other

    raised_by: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)

    priority: Mapped[str] = mapped_column(String(20), default="Medium")  # Low, Medium, High, Urgent
    # Open -> Replied -> Resolved -> Closed
    status: Mapped[str] = mapped_column(String(20), default="Open")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class TicketComment(Base):
    """One reply/comment within a Ticket's thread."""
    __tablename__ = "helpdesk_ticket_comments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("helpdesk_tickets.id"))
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    message: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
