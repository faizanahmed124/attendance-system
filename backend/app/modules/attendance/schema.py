from datetime import datetime, date, time
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------- Shift Type ----------

class ShiftTypeCreate(BaseModel):
    name: str
    start_time: time
    end_time: time
    holiday_list_id: Optional[int] = None
    roster_color: Optional[str] = "Blue"
    enable_auto_attendance: Optional[bool] = True

    determine_check_in_out: Optional[str] = "Alternating entries as IN and OUT during the same shift"
    working_hours_calc_based_on: Optional[str] = "Every Valid Check-in and Check-out"
    begin_check_in_before_shift_minutes: Optional[int] = 60
    allow_check_out_after_shift_minutes: Optional[int] = 0
    mark_auto_attendance_on_holidays: Optional[bool] = False

    working_hours_threshold_half_day: Optional[float] = None
    working_hours_threshold_absent: Optional[float] = None
    process_attendance_after: Optional[date] = None
    auto_update_last_sync: Optional[bool] = True

    enable_late_entry_marking: Optional[bool] = True
    late_entry_grace_minutes: Optional[int] = 10
    enable_early_exit_marking: Optional[bool] = True
    early_exit_grace_minutes: Optional[int] = 10


class ShiftTypeUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    holiday_list_id: Optional[int] = None
    roster_color: Optional[str] = None
    enable_auto_attendance: Optional[bool] = None

    determine_check_in_out: Optional[str] = None
    working_hours_calc_based_on: Optional[str] = None
    begin_check_in_before_shift_minutes: Optional[int] = None
    allow_check_out_after_shift_minutes: Optional[int] = None
    mark_auto_attendance_on_holidays: Optional[bool] = None

    working_hours_threshold_half_day: Optional[float] = None
    working_hours_threshold_absent: Optional[float] = None
    process_attendance_after: Optional[date] = None
    auto_update_last_sync: Optional[bool] = None

    enable_late_entry_marking: Optional[bool] = None
    late_entry_grace_minutes: Optional[int] = None
    enable_early_exit_marking: Optional[bool] = None
    early_exit_grace_minutes: Optional[int] = None


class ShiftTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_time: time
    end_time: time
    holiday_list_id: Optional[int] = None
    roster_color: str
    enable_auto_attendance: bool

    determine_check_in_out: str
    working_hours_calc_based_on: str
    begin_check_in_before_shift_minutes: int
    allow_check_out_after_shift_minutes: int
    mark_auto_attendance_on_holidays: bool

    working_hours_threshold_half_day: Optional[float] = None
    working_hours_threshold_absent: Optional[float] = None
    process_attendance_after: Optional[date] = None
    last_sync_of_checkin: Optional[datetime] = None
    auto_update_last_sync: bool

    enable_late_entry_marking: bool
    late_entry_grace_minutes: int
    enable_early_exit_marking: bool
    early_exit_grace_minutes: int
    created_at: datetime


# ---------- Shift Assignment ----------

class ShiftAssignmentCreate(BaseModel):
    employee_id: int
    shift_type_id: int
    start_date: date
    end_date: Optional[date] = None
    status: Optional[str] = "Active"


class ShiftAssignmentBulkCreate(BaseModel):
    """Assign the same shift to several employees at once."""
    employee_ids: list[int]
    shift_type_id: int
    start_date: date
    end_date: Optional[date] = None


class ShiftAssignmentUpdate(BaseModel):
    end_date: Optional[date] = None
    status: Optional[str] = None


class ShiftAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    shift_type_id: int
    start_date: date
    end_date: Optional[date] = None
    status: str
    created_at: datetime


# ---------- Check-in ----------

class CheckInCreate(BaseModel):
    employee_id: int
    log_type: str  # "IN" or "OUT"
    timestamp: Optional[datetime] = None  # defaults to now if not provided
    source: Optional[str] = "web"
    device_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CheckInOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    log_type: str
    timestamp: datetime
    source: str
    device_id: Optional[str] = None


class CheckInLogOut(BaseModel):
    """Row shape for the all-employees Check-in log list view."""
    id: int
    checkin_id: str          # cosmetic doc-style id, e.g. "EMP-CKIN-07-2026-0991"
    employee_id: int
    employee_code: str
    employee_name: str
    shift_name: Optional[str] = None
    log_type: str
    timestamp: datetime
    source: str


# ---------- Attendance ----------

class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    attendance_date: date
    shift_type_id: Optional[int] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    working_hours: Optional[float] = None
    status: str
    late_entry: bool
    early_exit: bool


class AttendanceManualCreate(BaseModel):
    """For HR to manually mark attendance (e.g. On Leave, WFH, Absent)."""
    employee_id: int
    attendance_date: date
    status: str
    shift_type_id: Optional[int] = None


class AttendanceUpdate(BaseModel):
    """Used by the single-record detail view to edit an existing attendance row."""
    status: Optional[str] = None
    shift_type_id: Optional[int] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None


class AttendanceBulkMarkCreate(BaseModel):
    """Mark the same status for one employee across a date range, e.g. a whole month."""
    employee_id: int
    from_date: date
    to_date: date
    status: str
    shift_type_id: Optional[int] = None
    skip_weekends: Optional[bool] = False
