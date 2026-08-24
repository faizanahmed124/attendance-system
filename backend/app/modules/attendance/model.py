from datetime import datetime, date, time, timezone

from sqlalchemy import String, DateTime, Date, Time, ForeignKey, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ShiftType(Base):
    __tablename__ = "shift_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)  # e.g. "Shift-B"
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)

    holiday_list_id: Mapped[int | None] = mapped_column(ForeignKey("holiday_lists.id"), nullable=True)
    roster_color: Mapped[str] = mapped_column(String(30), default="Blue")
    enable_auto_attendance: Mapped[bool] = mapped_column(Boolean, default=True)

    # ---- Auto Attendance Settings ----
    # "Alternating entries as IN and OUT during the same shift"
    # or "Strictly based on Log Type in Employee Checkin"
    determine_check_in_out: Mapped[str] = mapped_column(
        String(80), default="Alternating entries as IN and OUT during the same shift"
    )
    # "First Check-in and Last Check-out" or "Every Valid Check-in and Check-out"
    working_hours_calc_based_on: Mapped[str] = mapped_column(
        String(50), default="Every Valid Check-in and Check-out"
    )
    begin_check_in_before_shift_minutes: Mapped[int] = mapped_column(default=60)
    allow_check_out_after_shift_minutes: Mapped[int] = mapped_column(default=0)
    mark_auto_attendance_on_holidays: Mapped[bool] = mapped_column(Boolean, default=False)

    working_hours_threshold_half_day: Mapped[float | None] = mapped_column(Float, nullable=True)
    working_hours_threshold_absent: Mapped[float | None] = mapped_column(Float, nullable=True)

    process_attendance_after: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_sync_of_checkin: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    auto_update_last_sync: Mapped[bool] = mapped_column(Boolean, default=True)

    # ---- Late Entry & Early Exit Settings ----
    enable_late_entry_marking: Mapped[bool] = mapped_column(Boolean, default=True)
    late_entry_grace_minutes: Mapped[int] = mapped_column(default=10)
    enable_early_exit_marking: Mapped[bool] = mapped_column(Boolean, default=True)
    early_exit_grace_minutes: Mapped[int] = mapped_column(default=10)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class ShiftAssignment(Base):
    """Which employee is on which shift, and for what date range."""
    __tablename__ = "shift_assignments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    shift_type_id: Mapped[int] = mapped_column(ForeignKey("shift_types.id"))

    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # null = ongoing

    status: Mapped[str] = mapped_column(String(20), default="Active")  # Active, Inactive
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class CheckIn(Base):
    """
    Raw check-in/out event log. Every tap/scan (web button, or later a
    biometric device sync) creates one row here. `Attendance` is the
    daily summary built from these events.
    """
    __tablename__ = "check_ins"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))

    log_type: Mapped[str] = mapped_column(String(10))  # "IN" or "OUT"
    timestamp: Mapped[datetime] = mapped_column(DateTime)

    # where this event came from - keeps room for biometric integration later
    # values: "web", "manual", "biometric"
    source: Mapped[str] = mapped_column(String(20), default="web")

    # populated later when a physical biometric device is connected
    device_id: Mapped[str | None] = mapped_column(String(50), nullable=True)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class Attendance(Base):
    """Daily attendance summary per employee - derived from CheckIn events."""
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    attendance_date: Mapped[date] = mapped_column(Date)

    shift_type_id: Mapped[int | None] = mapped_column(ForeignKey("shift_types.id"), nullable=True)

    check_in_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    check_out_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    working_hours: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Present, Absent, Half Day, On Leave, Work From Home
    status: Mapped[str] = mapped_column(String(20), default="Absent")

    late_entry: Mapped[bool] = mapped_column(default=False)
    early_exit: Mapped[bool] = mapped_column(default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
