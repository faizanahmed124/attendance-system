from datetime import datetime, timezone

from sqlalchemy import Integer, Float, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AttendanceSettings(Base):
    """
    Singleton (always id=1) - global switches controlling which parts of
    attendance calculation/display are active. Turning any of these off
    means that field is genuinely OMITTED (not just zeroed out) from both
    the calculation and the Attendance detail page - see
    attendance/service.py's _calculate_attendance_fields(), which reads
    this on every calculation.
    """
    __tablename__ = "attendance_settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)

    enable_overtime_tracking: Mapped[bool] = mapped_column(Boolean, default=True)
    standard_duty_hours: Mapped[float] = mapped_column(Float, default=8.0)

    enable_late_entry_tracking: Mapped[bool] = mapped_column(Boolean, default=True)
    enable_early_exit_tracking: Mapped[bool] = mapped_column(Boolean, default=True)
    enable_half_day_marking: Mapped[bool] = mapped_column(Boolean, default=True)
    enable_auto_absent_marking: Mapped[bool] = mapped_column(Boolean, default=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
