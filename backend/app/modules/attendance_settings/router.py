from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.attendance_settings import service
from app.modules.attendance_settings.schema import AttendanceSettingsOut, AttendanceSettingsUpdate

router = APIRouter(prefix="/api/attendance-settings", tags=["Attendance Settings"])


@router.get("/", response_model=AttendanceSettingsOut)
def get_attendance_settings(db: Session = Depends(get_db), current_user=Depends(require_permission("attendance", "read"))):
    return service.get_settings(db)


@router.put("/", response_model=AttendanceSettingsOut)
def update_attendance_settings(
    payload: AttendanceSettingsUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("attendance", "write")),
):
    return service.update_settings(db, payload)
