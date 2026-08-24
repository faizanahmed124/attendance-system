from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.core.exceptions import BadRequestError
from app.core.bulk_ops import bulk_update_fields, bulk_delete, BulkUpdateRequest
from app.modules.employee import service
from app.modules.employee.model import Employee
from app.modules.employee.schema import EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeeDocumentOut
from app.utils.file_storage import save_employee_photo, save_employee_document

router = APIRouter(prefix="/api/employees", tags=["Employee"])

# Fields safe to mass-edit in one shot - deliberately excludes things with
# side effects elsewhere (e.g. shift_type_id is derived from ShiftAssignment).
BULK_EDITABLE_FIELDS = {"status", "department_id", "designation_id", "branch", "employment_type"}


@router.get("/", response_model=List[EmployeeOut])
def list_employees(
    skip: int = 0, limit: int = 100,
    department_id: Optional[int] = None, company_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("employee", "read")),
):
    return service.list_employees(db, skip, limit, department_id, company_id, status)


# ---- Bulk edit / delete ----
# IMPORTANT: these literal-path routes must stay ABOVE "/{employee_id}" -
# Starlette matches routes in registration order, so if the catch-all were
# registered first, a request to e.g. "/bulk-update" would incorrectly try
# to match it as an employee_id and fail with a 422 instead of routing here.

@router.post("/bulk-update")
def bulk_update_employees(
    payload: BulkUpdateRequest, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "write")),
):
    updates = {k: v for k, v in payload.updates.items() if k in BULK_EDITABLE_FIELDS}
    if not updates:
        raise BadRequestError(f"No editable fields provided. Allowed: {sorted(BULK_EDITABLE_FIELDS)}")
    count = bulk_update_fields(db, Employee, payload.ids, updates)
    return {"updated": count}


@router.post("/bulk-delete")
def bulk_delete_employees(
    payload: BulkUpdateRequest, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "delete")),
):
    count = bulk_delete(db, Employee, payload.ids)
    return {"deleted": count}


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("employee", "read"))):
    return service.get_employee(db, employee_id)


@router.post("/", response_model=EmployeeOut)
def create_employee(
    payload: EmployeeCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "create")),
):
    return service.create_employee(db, payload)


@router.put("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int, payload: EmployeeUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "write")),
):
    return service.update_employee(db, employee_id, payload)


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "delete")),
):
    service.delete_employee(db, employee_id)
    return {"message": "Employee deleted successfully"}


# ---- Profile photo ----

@router.post("/{employee_id}/photo", response_model=EmployeeOut)
def upload_photo(
    employee_id: int, file: UploadFile = File(...), db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "write")),
):
    photo_url = save_employee_photo(file, employee_id)
    return service.set_photo(db, employee_id, photo_url)


# ---- Documents ----

@router.get("/{employee_id}/documents", response_model=List[EmployeeDocumentOut])
def list_documents(
    employee_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "read")),
):
    return service.list_documents(db, employee_id)


@router.post("/{employee_id}/documents", response_model=EmployeeDocumentOut)
def upload_document(
    employee_id: int,
    document_name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "write")),
):
    file_url = save_employee_document(file, employee_id)
    return service.add_document(db, employee_id, document_name, file_url)


@router.delete("/{employee_id}/documents/{document_id}")
def delete_document(
    employee_id: int, document_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "write")),
):
    service.delete_document(db, employee_id, document_id)
    return {"message": "Document deleted successfully"}
