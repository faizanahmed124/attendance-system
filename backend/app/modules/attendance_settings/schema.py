from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AttendanceSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enable_overtime_tracking: bool
    standard_duty_hours: float
    enable_late_entry_tracking: bool
    enable_early_exit_tracking: bool
    enable_half_day_marking: bool
    enable_auto_absent_marking: bool
    updated_at: datetime


class AttendanceSettingsUpdate(BaseModel):
    enable_overtime_tracking: Optional[bool] = None
    standard_duty_hours: Optional[float] = None
    enable_late_entry_tracking: Optional[bool] = None
    enable_early_exit_tracking: Optional[bool] = None
    enable_half_day_marking: Optional[bool] = None
    enable_auto_absent_marking: Optional[bool] = None
