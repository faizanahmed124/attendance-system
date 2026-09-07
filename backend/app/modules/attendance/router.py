from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.attendance import service
from app.modules.attendance.schema import (
    ShiftTypeCreate, ShiftTypeUpdate, ShiftTypeOut,
    CheckInCreate, CheckInOut, CheckInLogOut,
    AttendanceOut, AttendanceManualCreate, AttendanceUpdate, AttendanceBulkMarkCreate,
    ShiftAssignmentCreate, ShiftAssignmentBulkCreate, ShiftAssignmentUpdate, ShiftAssignmentOut,
)

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


# ---- Shift types ----

@router.get("/shift-types", response_model=List[ShiftTypeOut])
def list_shift_types(db: Session = Depends(get_db), current_user=Depends(require_permission("attendance", "read"))):
    return service.list_shift_types(db)


@router.get("/shift-types/{shift_type_id}", response_model=ShiftTypeOut)
def get_shift_type(shift_type_id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("attendance", "read"))):
    return service.get_shift_type(db, shift_type_id)


@router.post("/shift-types", response_model=ShiftTypeOut)
def create_shift_type(
    payload: ShiftTypeCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "create")),
):
    return service.create_shift_type(db, payload)


@router.put("/shift-types/{shift_type_id}", response_model=ShiftTypeOut)
def update_shift_type(
    shift_type_id: int, payload: ShiftTypeUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "write")),
):
    return service.update_shift_type(db, shift_type_id, payload)


@router.delete("/shift-types/{shift_type_id}")
def delete_shift_type(
    shift_type_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "delete")),
):
    service.delete_shift_type(db, shift_type_id)
    return {"message": "Shift type deleted successfully"}


# ---- Shift assignments (which employee is on which shift) ----

@router.get("/shift-assignments", response_model=List[ShiftAssignmentOut])
def list_shift_assignments(
    employee_id: Optional[int] = None, shift_type_id: Optional[int] = None, status: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("attendance", "read")),
):
    return service.list_shift_assignments(db, employee_id, shift_type_id, status)


@router.post("/shift-assignments", response_model=ShiftAssignmentOut)
def create_shift_assignment(
    payload: ShiftAssignmentCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "create")),
):
    return service.create_shift_assignment(db, payload)


@router.post("/shift-assignments/bulk", response_model=List[ShiftAssignmentOut])
def bulk_create_shift_assignments(
    payload: ShiftAssignmentBulkCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "create")),
):
    return service.bulk_create_shift_assignments(db, payload)


@router.put("/shift-assignments/{assignment_id}", response_model=ShiftAssignmentOut)
def update_shift_assignment(
    assignment_id: int, payload: ShiftAssignmentUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "write")),
):
    return service.update_shift_assignment(db, assignment_id, payload)


@router.delete("/shift-assignments/{assignment_id}")
def delete_shift_assignment(
    assignment_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "delete")),
):
    service.delete_shift_assignment(db, assignment_id)
    return {"message": "Shift assignment deleted successfully"}


# ---- Check-in / Check-out ----
# NOTE: this is the endpoint a biometric device sync job will call later too
# (just set source="biometric", device_id="<machine-id>" instead of "web").

@router.post("/check-in", response_model=CheckInOut)
def check_in(payload: CheckInCreate, db: Session = Depends(get_db), current_user=Depends(require_permission("attendance", "create"))):
    return service.create_check_in(db, payload)


@router.get("/check-in/{employee_id}", response_model=List[CheckInOut])
def list_check_ins(
    employee_id: int, skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db), current_user=Depends(require_permission("attendance", "read")),
):
    return service.list_check_ins(db, employee_id, skip, limit)


@router.delete("/check-in-record/{check_in_id}")
def delete_check_in(
    check_in_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "delete")),
):
    """
    Deletes one punch and recalculates that day's attendance summary
    without it. If it was a genuine biometric punch (not a duplicate/bad
    record), the next device sync will re-create it automatically, since
    the device always returns its full history and sync only skips
    punches that already exist in the database.
    """
    service.delete_check_in(db, check_in_id)
    return {"message": "Check-in deleted - it will be re-fetched automatically on the next biometric sync if it's a genuine device punch"}


@router.get("/check-in-logs", response_model=dict)
def list_check_in_logs(
    skip: int = 0, limit: int = 20,
    employee_id: Optional[int] = None, log_type: Optional[str] = None,
    from_date: Optional[str] = None, to_date: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("attendance", "read")),
):
    """All check-ins across every employee - powers the Check-in Logs list page."""
    results, total = service.list_all_check_ins(db, skip, limit, employee_id, log_type, from_date, to_date)
    return {"results": results, "total": total}


# ---- Daily attendance summary ----

@router.get("/", response_model=List[AttendanceOut])
def list_attendance(
    skip: int = 0, limit: int = 100,
    employee_id: Optional[int] = None, status: Optional[str] = None,
    from_date: Optional[date] = None, to_date: Optional[date] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("attendance", "read")),
):
    return service.list_attendance(db, skip, limit, employee_id, status, from_date, to_date)


@router.post("/mark", response_model=AttendanceOut)
def mark_attendance(
    payload: AttendanceManualCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "create")),
):
    return service.mark_attendance_manually(db, payload)


@router.post("/mark-bulk", response_model=List[AttendanceOut])
def mark_attendance_bulk(
    payload: AttendanceBulkMarkCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "create")),
):
    return service.mark_attendance_bulk(db, payload)


# ---- Single attendance record (the "open one record" detail view) ----
# IMPORTANT: keep this block AFTER /mark, /shift-types, /shift-assignments, /check-in,
# otherwise "/{attendance_id}" would swallow those paths.

@router.get("/{attendance_id}", response_model=AttendanceOut)
def get_attendance(attendance_id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("attendance", "read"))):
    return service.get_attendance(db, attendance_id)


@router.put("/{attendance_id}", response_model=AttendanceOut)
def update_attendance(
    attendance_id: int, payload: AttendanceUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "write")),
):
    return service.update_attendance(db, attendance_id, payload)


@router.delete("/{attendance_id}")
def delete_attendance(
    attendance_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "delete")),
):
    service.delete_attendance(db, attendance_id)
    return {"message": "Attendance record deleted successfully"}