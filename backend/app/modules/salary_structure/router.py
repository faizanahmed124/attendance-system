from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.salary_structure import service
from app.modules.salary_structure.schema import (
    SalaryComponentCreate, SalaryComponentUpdate, SalaryComponentOut,
    SalaryStructureCreate, SalaryStructureUpdate, SalaryStructureOut,
    SalaryStructureAssignmentCreate, SalaryStructureAssignmentOut,
    SalaryCalculationOut,
)

router = APIRouter(prefix="/api/salary-structure", tags=["Salary Structure"])


# ---- Salary Components ----

@router.get("/components", response_model=List[SalaryComponentOut])
def list_salary_components(db: Session = Depends(get_db), current_user=Depends(require_permission("payroll", "read"))):
    return service.list_salary_components(db)


@router.post("/components", response_model=SalaryComponentOut)
def create_salary_component(
    payload: SalaryComponentCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "create")),
):
    return service.create_salary_component(db, payload)


@router.put("/components/{component_id}", response_model=SalaryComponentOut)
def update_salary_component(
    component_id: int, payload: SalaryComponentUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "write")),
):
    return service.update_salary_component(db, component_id, payload)


@router.delete("/components/{component_id}")
def delete_salary_component(
    component_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "delete")),
):
    service.delete_salary_component(db, component_id)
    return {"message": "Salary component deleted successfully"}


# ---- Salary Structures ----

@router.get("/structures", response_model=List[SalaryStructureOut])
def list_salary_structures(db: Session = Depends(get_db), current_user=Depends(require_permission("payroll", "read"))):
    return service.list_salary_structures(db)


@router.get("/structures/{structure_id}", response_model=SalaryStructureOut)
def get_salary_structure(
    structure_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "read")),
):
    return service.get_salary_structure(db, structure_id)


@router.post("/structures", response_model=SalaryStructureOut)
def create_salary_structure(
    payload: SalaryStructureCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "create")),
):
    return service.create_salary_structure(db, payload)


@router.put("/structures/{structure_id}", response_model=SalaryStructureOut)
def update_salary_structure(
    structure_id: int, payload: SalaryStructureUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "write")),
):
    return service.update_salary_structure(db, structure_id, payload)


@router.delete("/structures/{structure_id}")
def delete_salary_structure(
    structure_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "delete")),
):
    service.delete_salary_structure(db, structure_id)
    return {"message": "Salary structure deleted successfully"}


# ---- Salary Structure Assignments ----

@router.get("/assignments", response_model=List[SalaryStructureAssignmentOut])
def list_assignments(
    employee_id: Optional[int] = None, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "read")),
):
    return service.list_assignments(db, employee_id)


@router.post("/assignments", response_model=SalaryStructureAssignmentOut)
def create_assignment(
    payload: SalaryStructureAssignmentCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "create")),
):
    return service.create_assignment(db, payload)


@router.delete("/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("payroll", "delete")),
):
    service.delete_assignment(db, assignment_id)
    return {"message": "Assignment deleted successfully"}


# ---- Salary calculation preview ----

@router.get("/calculate", response_model=SalaryCalculationOut)
def calculate_salary(
    employee_id: int, period_start: date = Query(...), period_end: date = Query(...),
    payment_days: Optional[float] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("payroll", "read")),
):
    """Preview what an employee's salary would be for a period, without creating anything - useful for testing a structure."""
    return service.calculate_salary(db, employee_id, period_start, period_end, payment_days)
