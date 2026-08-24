from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.core.exceptions import BadRequestError
from app.core.bulk_ops import bulk_update_fields, bulk_delete, BulkUpdateRequest
from app.modules.department import service
from app.modules.department.model import Department
from app.modules.department.schema import DepartmentCreate, DepartmentUpdate, DepartmentOut

router = APIRouter(prefix="/api/departments", tags=["Department"])

BULK_EDITABLE_FIELDS = {"company_id", "parent_department_id", "is_active"}


@router.get("/", response_model=List[DepartmentOut])
def list_departments(
    skip: int = 0, limit: int = 100, company_id: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("department", "read")),
):
    return service.list_departments(db, skip, limit, company_id)


# ---- Bulk edit / delete (must stay above "/{department_id}") ----

@router.post("/bulk-update")
def bulk_update_departments(
    payload: BulkUpdateRequest, db: Session = Depends(get_db),
    current_user=Depends(require_permission("department", "write")),
):
    updates = {k: v for k, v in payload.updates.items() if k in BULK_EDITABLE_FIELDS}
    if not updates:
        raise BadRequestError(f"No editable fields provided. Allowed: {sorted(BULK_EDITABLE_FIELDS)}")
    count = bulk_update_fields(db, Department, payload.ids, updates)
    return {"updated": count}


@router.post("/bulk-delete")
def bulk_delete_departments(
    payload: BulkUpdateRequest, db: Session = Depends(get_db),
    current_user=Depends(require_permission("department", "delete")),
):
    count = bulk_delete(db, Department, payload.ids)
    return {"deleted": count}


@router.get("/{department_id}", response_model=DepartmentOut)
def get_department(department_id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("department", "read"))):
    return service.get_department(db, department_id)


@router.post("/", response_model=DepartmentOut)
def create_department(
    payload: DepartmentCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("department", "create")),
):
    return service.create_department(db, payload)


@router.put("/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("department", "write")),
):
    return service.update_department(db, department_id, payload)


@router.delete("/{department_id}")
def delete_department(
    department_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("department", "delete")),
):
    service.delete_department(db, department_id)
    return {"message": "Department deleted successfully"}
