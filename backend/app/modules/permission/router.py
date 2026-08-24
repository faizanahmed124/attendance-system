from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_roles
from app.modules.permission import service
from app.modules.permission.model import MODULES, ACTIONS
from app.modules.permission.schema import (
    RolePermissionOut, RolePermissionUpdate, RolePermissionBulkUpdate, ModuleInfo,
)

router = APIRouter(prefix="/api/permissions", tags=["Permissions"])


@router.get("/meta", response_model=ModuleInfo)
def get_meta(current_user=Depends(require_roles("admin"))):
    """List of modules/actions/roles the permission matrix UI can render."""
    return ModuleInfo(modules=MODULES, actions=ACTIONS, roles=service.ROLES)


@router.get("/", response_model=List[RolePermissionOut])
def list_permissions(db: Session = Depends(get_db), current_user=Depends(require_roles("admin"))):
    return service.list_permissions(db)


@router.put("/", response_model=RolePermissionOut)
def update_permission(
    payload: RolePermissionUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin")),
):
    return service.upsert_permission(db, payload)


@router.put("/bulk", response_model=List[RolePermissionOut])
def bulk_update_permissions(
    payload: RolePermissionBulkUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin")),
):
    return service.bulk_upsert(db, payload.permissions)
