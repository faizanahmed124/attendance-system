from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.leave import service
from app.modules.leave.schema import (
    LeaveTypeCreate, LeaveTypeUpdate, LeaveTypeOut,
    LeaveAllocationCreate, LeaveAllocationOut,
    LeaveApplicationCreate, LeaveApplicationUpdate, LeaveApplicationOut,
    LeaveBalanceOut,
)

router = APIRouter(prefix="/api/leaves", tags=["Leave Management"])


# ---- Leave Types ----

@router.get("/types", response_model=List[LeaveTypeOut])
def list_leave_types(db: Session = Depends(get_db), current_user=Depends(require_permission("leave", "read"))):
    return service.list_leave_types(db)


@router.post("/types", response_model=LeaveTypeOut)
def create_leave_type(
    payload: LeaveTypeCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("leave", "create")),
):
    return service.create_leave_type(db, payload)


@router.put("/types/{leave_type_id}", response_model=LeaveTypeOut)
def update_leave_type(
    leave_type_id: int, payload: LeaveTypeUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("leave", "write")),
):
    return service.update_leave_type(db, leave_type_id, payload)


@router.delete("/types/{leave_type_id}")
def delete_leave_type(
    leave_type_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("leave", "delete")),
):
    service.delete_leave_type(db, leave_type_id)
    return {"message": "Leave type deleted successfully"}


# ---- Leave Allocations ----

@router.get("/allocations", response_model=List[LeaveAllocationOut])
def list_leave_allocations(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("leave", "read")),
):
    return service.list_leave_allocations(db, employee_id)


@router.post("/allocations", response_model=LeaveAllocationOut)
def create_leave_allocation(
    payload: LeaveAllocationCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("leave", "create")),
):
    return service.create_leave_allocation(db, payload)


@router.delete("/allocations/{allocation_id}")
def delete_leave_allocation(
    allocation_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("leave", "delete")),
):
    service.delete_leave_allocation(db, allocation_id)
    return {"message": "Leave allocation deleted successfully"}


# ---- Leave Balance (report) ----

@router.get("/balance", response_model=List[LeaveBalanceOut])
def get_leave_balance(
    employee_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("leave", "read")),
):
    return service.get_leave_balance_report(db, employee_id)


# ---- Leave Applications ----

@router.get("/applications", response_model=List[LeaveApplicationOut])
def list_leave_applications(
    employee_id: Optional[int] = None, status: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("leave", "read")),
):
    return service.list_leave_applications(db, employee_id, status)


@router.get("/applications/{application_id}", response_model=LeaveApplicationOut)
def get_leave_application(
    application_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("leave", "read")),
):
    return service.get_leave_application(db, application_id)


@router.post("/applications", response_model=LeaveApplicationOut)
def create_leave_application(
    payload: LeaveApplicationCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("leave", "create")),
):
    return service.create_leave_application(db, payload)


@router.put("/applications/{application_id}", response_model=LeaveApplicationOut)
def update_leave_application(
    application_id: int, payload: LeaveApplicationUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("leave", "write")),
):
    return service.update_leave_application(db, application_id, payload)


@router.delete("/applications/{application_id}")
def delete_leave_application(
    application_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("leave", "delete")),
):
    service.delete_leave_application(db, application_id)
    return {"message": "Leave application deleted successfully"}
