from datetime import datetime, date, timezone

from sqlalchemy import String, DateTime, Date, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TravelRequest(Base):
    """Employee request for approval to travel for business - Frappe's 'Travel Request'."""
    __tablename__ = "travel_requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))

    purpose: Mapped[str] = mapped_column(Text)
    travel_type: Mapped[str] = mapped_column(String(20), default="Domestic")  # Domestic, International
    destination: Mapped[str] = mapped_column(String(150))

    from_date: Mapped[date] = mapped_column(Date)
    to_date: Mapped[date] = mapped_column(Date)

    estimated_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    advance_amount: Mapped[float | None] = mapped_column(Float, nullable=True)

    posting_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    # Open -> Approved / Rejected
    status: Mapped[str] = mapped_column(String(20), default="Open")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
