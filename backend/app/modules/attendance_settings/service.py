from sqlalchemy.orm import Session

from app.modules.attendance_settings.model import AttendanceSettings
from app.modules.attendance_settings.schema import AttendanceSettingsUpdate


def get_settings(db: Session) -> AttendanceSettings:
    """Auto-creates the singleton row with defaults on first access, same pattern as system_settings."""
    settings = db.query(AttendanceSettings).filter(AttendanceSettings.id == 1).first()
    if not settings:
        settings = AttendanceSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_settings(db: Session, payload: AttendanceSettingsUpdate) -> AttendanceSettings:
    settings = get_settings(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
