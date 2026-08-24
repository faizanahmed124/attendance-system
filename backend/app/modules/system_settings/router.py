from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.system_settings import service
from app.modules.system_settings.schema import SystemSettingsUpdate, SystemSettingsOut

router = APIRouter(prefix="/api/system-settings", tags=["System Settings"])


@router.get("/", response_model=SystemSettingsOut)
def get_settings(db: Session = Depends(get_db), current_user=Depends(require_permission("system_settings", "read"))):
    return service.get_settings(db)


@router.put("/", response_model=SystemSettingsOut)
def update_settings(
    payload: SystemSettingsUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("system_settings", "write")),
):
    return service.update_settings(db, payload)
