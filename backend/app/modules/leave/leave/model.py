from datetime import datetime, date, timezone

from sqlalchemy import String, DateTime, Date, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LeaveType(Base):
    """Master data - e.g. 'Casual Leave', 'Sick Leave', 'Leave Without Pay'."""
    __tablename__ = "leave_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    max_leaves_allowed: Mapped[float] = mapped_column(Float, default=0)  # per allocation period (usually a year)
    is_carry_forward: Mapped[bool] = mapped_column(Boolean, default=False)  # unused leaves roll into next allocation
    is_lwp: Mapped[bool] = mapped_column(Boolean, default=False)  # Leave Without Pay - doesn't need balance, deducts from payroll
    is_encashable: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class LeaveAllocation(Base):
    """How many days of a given Leave Type an employee has for a date range (usually a year)."""
    __tablename__ = "leave_allocations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    leave_type_id: Mapped[int] = mapped_column(ForeignKey("leave_types.id"))

    from_date: Mapped[date] = mapped_column(Date)
    to_date: Mapped[date] = mapped_column(Date)

    total_leaves_allocated: Mapped[float] = mapped_column(Float)
    carry_forwarded_leaves: Mapped[float] = mapped_column(Float, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class LeaveApplication(Base):
    """An employee's request for time off against a specific Leave Type."""
    __tablename__ = "leave_applications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    leave_type_id: Mapped[int] = mapped_column(ForeignKey("leave_types.id"))

    from_date: Mapped[date] = mapped_column(Date)
    to_date: Mapped[date] = mapped_column(Date)
    half_day: Mapped[bool] = mapped_column(Boolean, default=False)
    total_leave_days: Mapped[float] = mapped_column(Float)  # calculated at creation time

    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    posting_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())

    # Open -> Approved / Rejected
    status: Mapped[str] = mapped_column(String(20), default="Open")
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
