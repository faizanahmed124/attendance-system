from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.loan import service
from app.modules.loan.schema import (
    LoanTypeCreate, LoanTypeUpdate, LoanTypeOut,
    LoanApplicationCreate, LoanApplicationUpdate, LoanApplicationOut, ConvertApplicationRequest,
    LoanCreate, LoanOut, LoanWithScheduleOut,
    LoanDisbursementCreate, LoanDisbursementOut,
    LoanRepaymentCreate, LoanRepaymentOut,
)

router = APIRouter(prefix="/api/loans", tags=["Loan Management"])


# ---- Loan Types ----

@router.get("/types", response_model=List[LoanTypeOut])
def list_loan_types(db: Session = Depends(get_db), current_user=Depends(require_permission("loan", "read"))):
    return service.list_loan_types(db)


@router.post("/types", response_model=LoanTypeOut)
def create_loan_type(
    payload: LoanTypeCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "create")),
):
    return service.create_loan_type(db, payload)


@router.put("/types/{loan_type_id}", response_model=LoanTypeOut)
def update_loan_type(
    loan_type_id: int, payload: LoanTypeUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "write")),
):
    return service.update_loan_type(db, loan_type_id, payload)


@router.delete("/types/{loan_type_id}")
def delete_loan_type(
    loan_type_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "delete")),
):
    service.delete_loan_type(db, loan_type_id)
    return {"message": "Loan type deleted successfully"}


# ---- Loan Applications ----

@router.get("/applications", response_model=List[LoanApplicationOut])
def list_loan_applications(
    employee_id: Optional[int] = None, status: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("loan", "read")),
):
    return service.list_loan_applications(db, employee_id, status)


@router.get("/applications/{application_id}", response_model=LoanApplicationOut)
def get_loan_application(
    application_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "read")),
):
    return service.get_loan_application(db, application_id)


@router.post("/applications", response_model=LoanApplicationOut)
def create_loan_application(
    payload: LoanApplicationCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "create")),
):
    return service.create_loan_application(db, payload)


@router.put("/applications/{application_id}", response_model=LoanApplicationOut)
def update_loan_application(
    application_id: int, payload: LoanApplicationUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "write")),
):
    return service.update_loan_application(db, application_id, payload)


@router.delete("/applications/{application_id}")
def delete_loan_application(
    application_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "delete")),
):
    service.delete_loan_application(db, application_id)
    return {"message": "Loan application deleted successfully"}


@router.post("/applications/{application_id}/convert-to-loan", response_model=LoanOut)
def convert_application_to_loan(
    application_id: int, payload: ConvertApplicationRequest, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "create")),
):
    return service.convert_application_to_loan(db, application_id, payload)


# ---- Loans ----

@router.get("/", response_model=List[LoanOut])
def list_loans(
    employee_id: Optional[int] = None, status: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("loan", "read")),
):
    return service.list_loans(db, employee_id, status)


@router.post("/", response_model=LoanOut)
def create_loan(
    payload: LoanCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "create")),
):
    return service.create_loan(db, payload)


@router.get("/{loan_id}", response_model=LoanWithScheduleOut)
def get_loan(loan_id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("loan", "read"))):
    loan, repayments, disbursements = service.get_loan_with_schedule(db, loan_id)
    return LoanWithScheduleOut(
        **LoanOut.model_validate(loan).model_dump(),
        repayments=[LoanRepaymentOut.model_validate(r) for r in repayments],
        disbursements=[LoanDisbursementOut.model_validate(d) for d in disbursements],
    )


@router.delete("/{loan_id}")
def delete_loan(
    loan_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "delete")),
):
    service.delete_loan(db, loan_id)
    return {"message": "Loan deleted successfully"}


# ---- Disbursements ----

@router.post("/{loan_id}/disbursements", response_model=LoanDisbursementOut)
def create_disbursement(
    loan_id: int, payload: LoanDisbursementCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "write")),
):
    return service.create_disbursement(db, loan_id, payload)


@router.get("/{loan_id}/disbursements", response_model=List[LoanDisbursementOut])
def list_disbursements(
    loan_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "read")),
):
    return service.list_disbursements(db, loan_id)


# ---- Repayments ----

@router.post("/{loan_id}/repayments", response_model=LoanRepaymentOut)
def record_repayment(
    loan_id: int, payload: LoanRepaymentCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "write")),
):
    return service.record_repayment(db, loan_id, payload)


@router.get("/{loan_id}/repayments", response_model=List[LoanRepaymentOut])
def list_repayments(
    loan_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("loan", "read")),
):
    return service.list_repayments(db, loan_id)
