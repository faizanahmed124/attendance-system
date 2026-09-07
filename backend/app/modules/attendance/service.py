from datetime import datetime, timedelta, time as time_cls, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, BadRequestError, DuplicateError
from app.modules.attendance.model import ShiftType, CheckIn, Attendance, ShiftAssignment
from app.modules.attendance.schema import (
    ShiftTypeCreate, ShiftTypeUpdate, CheckInCreate, AttendanceManualCreate, AttendanceUpdate,
    ShiftAssignmentCreate, ShiftAssignmentBulkCreate, ShiftAssignmentUpdate,
)

REGULAR_DUTY_HOURS = 8.0


# ---------- Shift Type ----------

def list_shift_types(db: Session):
    return db.query(ShiftType).order_by(ShiftType.name).all()


def get_shift_type(db: Session, shift_type_id: int) -> ShiftType:
    shift_type = db.query(ShiftType).filter(ShiftType.id == shift_type_id).first()
    if not shift_type:
        raise NotFoundError("Shift type not found")
    return shift_type


def create_shift_type(db: Session, payload: ShiftTypeCreate) -> ShiftType:
    if db.query(ShiftType).filter(ShiftType.name == payload.name).first():
        raise DuplicateError("A shift type with this name already exists")
    shift = ShiftType(**payload.model_dump())
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


def update_shift_type(db: Session, shift_type_id: int, payload: ShiftTypeUpdate) -> ShiftType:
    shift = get_shift_type(db, shift_type_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(shift, field, value)
    db.commit()
    db.refresh(shift)
    return shift


def delete_shift_type(db: Session, shift_type_id: int) -> None:
    shift = get_shift_type(db, shift_type_id)
    db.delete(shift)
    db.commit()


# ---------- Check-in / Check-out ----------

def create_check_in(db: Session, payload: CheckInCreate) -> CheckIn:
    if payload.log_type not in ("IN", "OUT"):
        raise BadRequestError("log_type must be 'IN' or 'OUT'")

    ts = payload.timestamp or datetime.now(timezone.utc)

    check_in = CheckIn(
        employee_id=payload.employee_id,
        log_type=payload.log_type,
        timestamp=ts,
        source=payload.source or "web",
        device_id=payload.device_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(check_in)
    db.commit()
    db.refresh(check_in)

    _sync_attendance_for_day(db, payload.employee_id, ts.date())
    return check_in


def list_check_ins(db: Session, employee_id: int, skip: int = 0, limit: int = 100):
    return (
        db.query(CheckIn)
        .filter(CheckIn.employee_id == employee_id)
        .order_by(CheckIn.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def delete_check_in(db: Session, check_in_id: int) -> None:
    """
    Deletes one punch and recalculates that employee's attendance summary
    for the day without it. Deleting a bad/duplicate punch this way (as
    opposed to editing the Attendance record directly) means the next
    biometric sync will see there's no longer a matching CheckIn for that
    employee+log_type+timestamp, and will re-create it from the device's
    own history if it was actually a real punch that got deleted by
    mistake - the device is always the source of truth to fall back on.
    """
    check_in = db.query(CheckIn).filter(CheckIn.id == check_in_id).first()
    if not check_in:
        raise NotFoundError("Check-in record not found")

    employee_id = check_in.employee_id
    day = check_in.timestamp.date()

    db.delete(check_in)
    db.commit()

    _sync_attendance_for_day(db, employee_id, day)


def list_all_check_ins(
    db: Session, skip: int = 0, limit: int = 100,
    employee_id: int | None = None, log_type: str | None = None,
    from_date=None, to_date=None,
):
    """
    Every check-in across every employee, with the employee's name/code and
    current shift name joined in - powers the Check-in Logs list page
    (Frappe HRMS 'Employee Checkin' list-style view).
    """
    from app.modules.employee.model import Employee
    from app.modules.attendance.model import ShiftType

    query = (
        db.query(CheckIn, Employee, ShiftType)
        .join(Employee, CheckIn.employee_id == Employee.id)
        .outerjoin(ShiftType, Employee.shift_type_id == ShiftType.id)
    )

    if employee_id:
        query = query.filter(CheckIn.employee_id == employee_id)
    if log_type:
        query = query.filter(CheckIn.log_type == log_type)
    if from_date:
        query = query.filter(CheckIn.timestamp >= from_date)
    if to_date:
        query = query.filter(CheckIn.timestamp <= to_date)

    total = query.count()
    rows = query.order_by(CheckIn.timestamp.desc()).offset(skip).limit(limit).all()

    results = []
    for check_in, employee, shift in rows:
        checkin_id = f"EMP-CKIN-{check_in.timestamp.strftime('%m-%Y')}-{str(check_in.id).zfill(4)}"
        results.append({
            "id": check_in.id,
            "checkin_id": checkin_id,
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "employee_name": employee.full_name,
            "shift_name": shift.name if shift else None,
            "log_type": check_in.log_type,
            "timestamp": check_in.timestamp,
            "source": check_in.source,
        })
    return results, total


def _parse_shift_time(val) -> time_cls:
    """ShiftType.start_time/end_time might come back as a 'HH:MM:SS', 'HH:MM:SS.ffffff' string, or a real time object."""
    if isinstance(val, time_cls):
        return val
    if isinstance(val, str):
        main_part = val.split(".")[0]  # strip microseconds if present
        parts = main_part.split(":")
        return time_cls(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)
    raise ValueError(f"Unrecognized shift time value: {val!r}")


def _get_local_timezone(db: Session):
    """
    Shift start/end times (e.g. "09:00:00") are entered by an admin as
    LOCAL wall-clock time, but check_in_time/check_out_time are stored as
    UTC (see zkteco_sync.py's own docstring on this exact point). Without
    converting shift times to UTC first, comparing them directly against
    UTC check-in/check-out times silently shifts everything by the
    timezone offset (5 hours for Pakistan) - which is exactly what caused
    "Early exit: Yes" on someone who left at 10 PM, and 0 overtime on
    someone who clearly worked well past 8 hours. Same timezone-resolution
    pattern as zkteco_sync.py's _get_device_timezone(), reused here so
    both stay consistent with whatever Settings > System Settings has
    configured.
    """
    from zoneinfo import ZoneInfo
    try:
        from app.modules.system_settings.service import get_settings as get_system_settings
        settings = get_system_settings(db)
        return ZoneInfo(settings.time_zone)
    except Exception:  # noqa: BLE001 - bad/missing settings should never crash attendance syncing
        return ZoneInfo("Asia/Karachi")


def _localized_shift_datetime(day, local_time: time_cls, tz) -> datetime:
    """Combines a shift's local wall-clock time with a date, then converts it to the naive-UTC datetime everything else in this app uses."""
    aware_local = datetime.combine(day, local_time).replace(tzinfo=tz)
    return aware_local.astimezone(timezone.utc).replace(tzinfo=None)


def _sync_attendance_for_day(db: Session, employee_id: int, day) -> Attendance:
    """
    Rebuild the Attendance summary row for one employee/day from all
    CheckIn events on that day - earliest IN -> check_in_time, latest OUT
    -> check_out_time. Runs automatically after every check-in (so it
    fires continuously from biometric sync, roughly every couple minutes),
    so this is the ONE place attendance gets computed - there's no
    separate process that can silently overwrite it with different
    numbers.

    Shift-aware, same rules as the standalone auto-attendance batch
    processor:
      - Early arrival never counts - hours are computed from
        max(actual check-in, shift's scheduled start).
      - If the employee has "Allow Overtime" enabled, duty is capped at
        a flat 8 regular hours and anything beyond that is tracked
        separately as overtime_hours.
      - If not, hours are capped at the shift's own scheduled duration -
        staying late earns nothing extra without permission.
      - If the employee has no shift assigned at all, falls back to the
        old plain "checkout minus checkin" calculation rather than
        leaving the record blank.
    """
    from app.modules.employee.model import Employee

    events = (
        db.query(CheckIn)
        .filter(
            CheckIn.employee_id == employee_id,
            CheckIn.timestamp >= datetime.combine(day, datetime.min.time()),
            CheckIn.timestamp <= datetime.combine(day, datetime.max.time()),
        )
        .order_by(CheckIn.timestamp.asc())
        .all()
    )

    in_events = [e for e in events if e.log_type == "IN"]
    out_events = [e for e in events if e.log_type == "OUT"]

    check_in_time = in_events[0].timestamp if in_events else None
    check_out_time = out_events[-1].timestamp if out_events else None

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    shift_type_id = employee.shift_type_id if employee else None
    allow_overtime = bool(employee.allow_overtime) if employee else False
    shift = db.query(ShiftType).filter(ShiftType.id == shift_type_id).first() if shift_type_id else None

    working_hours = None
    overtime_hours = 0.0
    late_entry = False
    early_exit = False

    if check_in_time and shift and shift.start_time and shift.end_time:
        tz = _get_local_timezone(db)
        shift_start = _localized_shift_datetime(day, _parse_shift_time(shift.start_time), tz)
        shift_end = _localized_shift_datetime(day, _parse_shift_time(shift.end_time), tz)

        grace_in = timedelta(minutes=shift.late_entry_grace_minutes or 0)
        late_entry = check_in_time > (shift_start + grace_in)

        effective_start = max(check_in_time, shift_start)  # early arrival never counts
        actual_worked = 0.0
        if check_out_time:
            grace_out = timedelta(minutes=shift.early_exit_grace_minutes or 0)
            early_exit = check_out_time < (shift_end - grace_out)
            actual_worked = max(0.0, (check_out_time - effective_start).total_seconds() / 3600)

        if allow_overtime:
            working_hours = round(min(actual_worked, REGULAR_DUTY_HOURS), 2)
            overtime_hours = round(max(0.0, actual_worked - REGULAR_DUTY_HOURS), 2)
        else:
            shift_duration = (shift_end - shift_start).total_seconds() / 3600
            working_hours = round(min(actual_worked, shift_duration), 2)

    elif check_in_time and check_out_time and check_out_time > check_in_time:
        # no shift assigned - fall back to the simple calculation rather than leaving it blank
        working_hours = round((check_out_time - check_in_time).total_seconds() / 3600, 2)

    threshold_absent = (shift.working_hours_threshold_absent if shift else None) or 0
    threshold_half = (shift.working_hours_threshold_half_day if shift else None) or 0

    if not check_in_time:
        status = "Absent"
    elif threshold_absent and (working_hours or 0) < threshold_absent:
        status = "Absent"
    elif threshold_half and (working_hours or 0) < threshold_half:
        status = "Half Day"
    else:
        status = "Present"

    attendance = (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee_id, Attendance.attendance_date == day)
        .first()
    )
    if not attendance:
        attendance = Attendance(employee_id=employee_id, attendance_date=day)
        db.add(attendance)

    attendance.shift_type_id = shift_type_id
    attendance.check_in_time = check_in_time
    attendance.check_out_time = check_out_time
    attendance.working_hours = working_hours
    attendance.overtime_hours = overtime_hours
    attendance.status = status
    attendance.late_entry = late_entry
    attendance.early_exit = early_exit

    db.commit()
    db.refresh(attendance)
    return attendance


# ---------- Attendance (daily summary) ----------

def list_attendance(
    db: Session, skip: int = 0, limit: int = 100,
    employee_id: int | None = None, status: str | None = None,
    from_date=None, to_date=None,
):
    query = db.query(Attendance)
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    if status:
        query = query.filter(Attendance.status == status)
    if from_date:
        query = query.filter(Attendance.attendance_date >= from_date)
    if to_date:
        query = query.filter(Attendance.attendance_date <= to_date)
    return query.order_by(Attendance.attendance_date.desc()).offset(skip).limit(limit).all()


def get_attendance(db: Session, attendance_id: int) -> Attendance:
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise NotFoundError("Attendance record not found")
    return attendance


def update_attendance(db: Session, attendance_id: int, payload) -> Attendance:
    """Edit a single attendance record directly (the 'open one record' detail view)."""
    attendance = get_attendance(db, attendance_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(attendance, field, value)

    # recompute working hours if both times are present
    if attendance.check_in_time and attendance.check_out_time and attendance.check_out_time > attendance.check_in_time:
        attendance.working_hours = round(
            (attendance.check_out_time - attendance.check_in_time).total_seconds() / 3600, 2
        )

    db.commit()
    db.refresh(attendance)
    return attendance


def delete_attendance(db: Session, attendance_id: int) -> None:
    attendance = get_attendance(db, attendance_id)
    db.delete(attendance)
    db.commit()


def mark_attendance_manually(db: Session, payload: AttendanceManualCreate) -> Attendance:
    """HR marking On Leave / WFH / Absent directly, without check-in events."""
    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == payload.employee_id,
            Attendance.attendance_date == payload.attendance_date,
        )
        .first()
    )
    if not attendance:
        attendance = Attendance(
            employee_id=payload.employee_id,
            attendance_date=payload.attendance_date,
        )
        db.add(attendance)

    attendance.status = payload.status
    attendance.shift_type_id = payload.shift_type_id
    db.commit()
    db.refresh(attendance)
    return attendance


def mark_attendance_bulk(db: Session, payload) -> list[Attendance]:
    """
    Mark the same status for one employee across every day in [from_date, to_date] -
    e.g. mark a whole month as Present in one go instead of day by day.
    """
    from datetime import timedelta

    if payload.to_date < payload.from_date:
        raise BadRequestError("to_date must be on or after from_date")

    results = []
    current = payload.from_date
    while current <= payload.to_date:
        if not (payload.skip_weekends and current.weekday() in (5, 6)):
            single = AttendanceManualCreate(
                employee_id=payload.employee_id,
                attendance_date=current,
                status=payload.status,
                shift_type_id=payload.shift_type_id,
            )
            results.append(mark_attendance_manually(db, single))
        current += timedelta(days=1)
    return results


# ---------- Shift Assignment ----------

def list_shift_assignments(
    db: Session, employee_id: int | None = None, shift_type_id: int | None = None,
    status: str | None = None,
):
    query = db.query(ShiftAssignment)
    if employee_id:
        query = query.filter(ShiftAssignment.employee_id == employee_id)
    if shift_type_id:
        query = query.filter(ShiftAssignment.shift_type_id == shift_type_id)
    if status:
        query = query.filter(ShiftAssignment.status == status)
    return query.order_by(ShiftAssignment.start_date.desc()).all()


def get_shift_assignment(db: Session, assignment_id: int) -> ShiftAssignment:
    assignment = db.query(ShiftAssignment).filter(ShiftAssignment.id == assignment_id).first()
    if not assignment:
        raise NotFoundError("Shift assignment not found")
    return assignment


def create_shift_assignment(db: Session, payload: ShiftAssignmentCreate) -> ShiftAssignment:
    get_shift_type(db, payload.shift_type_id)  # 404s if invalid
    assignment = ShiftAssignment(**payload.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    # keep Employee.shift_type_id (the "current shift" convenience field) in sync
    _sync_employee_current_shift(db, payload.employee_id)
    return assignment


def bulk_create_shift_assignments(db: Session, payload: ShiftAssignmentBulkCreate) -> list[ShiftAssignment]:
    get_shift_type(db, payload.shift_type_id)  # 404s if invalid
    created = []
    for employee_id in payload.employee_ids:
        assignment = ShiftAssignment(
            employee_id=employee_id,
            shift_type_id=payload.shift_type_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            status="Active",
        )
        db.add(assignment)
        created.append(assignment)
    db.commit()
    for assignment in created:
        db.refresh(assignment)
        _sync_employee_current_shift(db, assignment.employee_id)
    return created


def update_shift_assignment(db: Session, assignment_id: int, payload: ShiftAssignmentUpdate) -> ShiftAssignment:
    assignment = get_shift_assignment(db, assignment_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)
    db.commit()
    db.refresh(assignment)
    _sync_employee_current_shift(db, assignment.employee_id)
    return assignment


def delete_shift_assignment(db: Session, assignment_id: int) -> None:
    assignment = get_shift_assignment(db, assignment_id)
    employee_id = assignment.employee_id
    db.delete(assignment)
    db.commit()
    _sync_employee_current_shift(db, employee_id)


def _sync_employee_current_shift(db: Session, employee_id: int) -> None:
    """
    Sets Employee.shift_type_id to whichever shift assignment is currently
    Active for that employee (most recently started one wins), so the rest
    of the app (Employee profile, etc.) always shows the current shift
    without needing to look at ShiftAssignment directly.
    """
    from app.modules.employee.model import Employee

    latest = (
        db.query(ShiftAssignment)
        .filter(ShiftAssignment.employee_id == employee_id, ShiftAssignment.status == "Active")
        .order_by(ShiftAssignment.start_date.desc())
        .first()
    )
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee:
        employee.shift_type_id = latest.shift_type_id if latest else None
        db.commit()