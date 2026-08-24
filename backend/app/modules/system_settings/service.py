from sqlalchemy.orm import Session

from app.modules.system_settings.model import SystemSettings
from app.modules.system_settings.schema import SystemSettingsUpdate


def get_settings(db: Session) -> SystemSettings:
    """Singleton get-or-create - there is always exactly one row, id=1."""
    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if not settings:
        settings = SystemSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_settings(db: Session, payload: SystemSettingsUpdate) -> SystemSettings:
    settings = get_settings(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
