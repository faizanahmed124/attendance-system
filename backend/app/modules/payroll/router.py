from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.payroll import service
from app.modules.payroll.schema import (
    PayrollEntryCreate, PayrollEntryOut, PayrollEntryWithSlipsOut, PostPayrollToJournalRequest,
    SalarySlipCreate, SalarySlipOut, SalarySlipComponentCreate,
)

router = APIRouter(prefix="/api/payroll", tags=["Payroll"])


# ---- Payroll Entry ----

@router.get("/entries", response_model=List[PayrollEntryOut])
def list_payroll_entries(
    company_id: Optional[int] = None, department_id: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("payroll", "read")),
):
    return service.list_payroll_entries(db, company_id, department_id)


@router.get("/entries/{entry_id}", response_model=PayrollEntryWithSlipsOut)
def get_payroll_entry(
    entry_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "read")),
):
    return service.get_payroll_entry(db, entry_id)


@router.post("/entries", response_model=PayrollEntryWithSlipsOut)
def create_payroll_entry(
    payload: PayrollEntryCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "create")),
):
    return service.create_payroll_entry(db, payload)


@router.delete("/entries/{entry_id}")
def delete_payroll_entry(
    entry_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "delete")),
):
    service.delete_payroll_entry(db, entry_id)
    return {"message": "Payroll entry deleted successfully"}


@router.post("/entries/{entry_id}/post-to-journal", response_model=PayrollEntryOut)
def post_payroll_to_journal(
    entry_id: int, payload: PostPayrollToJournalRequest, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "write")),
):
    return service.post_payroll_to_journal(db, entry_id, payload)


# ---- Salary Slip ----

@router.get("/salary-slips", response_model=List[SalarySlipOut])
def list_salary_slips(
    employee_id: Optional[int] = None, payroll_entry_id: Optional[int] = None, status: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("payroll", "read")),
):
    return service.list_salary_slips(db, employee_id, payroll_entry_id, status)


@router.get("/salary-slips/{slip_id}", response_model=SalarySlipOut)
def get_salary_slip(
    slip_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "read")),
):
    return service.get_salary_slip(db, slip_id)


@router.post("/salary-slips", response_model=SalarySlipOut)
def create_standalone_salary_slip(
    payload: SalarySlipCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "create")),
):
    return service.create_standalone_salary_slip(db, payload)


@router.delete("/salary-slips/{slip_id}")
def delete_salary_slip(
    slip_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "delete")),
):
    service.delete_salary_slip(db, slip_id)
    return {"message": "Salary slip deleted successfully"}


@router.post("/salary-slips/{slip_id}/components", response_model=SalarySlipOut)
def add_component(
    slip_id: int, payload: SalarySlipComponentCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "write")),
):
    return service.add_component(db, slip_id, payload)


@router.delete("/salary-slips/{slip_id}/components/{component_id}", response_model=SalarySlipOut)
def remove_component(
    slip_id: int, component_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "write")),
):
    return service.remove_component(db, slip_id, component_id)


@router.post("/salary-slips/{slip_id}/submit", response_model=SalarySlipOut)
def submit_salary_slip(
    slip_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "write")),
):
    return service.update_slip_status(db, slip_id, "Submitted")


@router.post("/salary-slips/{slip_id}/mark-paid", response_model=SalarySlipOut)
def mark_salary_slip_paid(
    slip_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "write")),
):
    return service.update_slip_status(db, slip_id, "Paid")
