from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


# ---------- Loan Type ----------

class LoanTypeCreate(BaseModel):
    name: str
    interest_rate: Optional[float] = 0
    max_loan_amount: Optional[float] = None
    is_active: Optional[bool] = True


class LoanTypeUpdate(BaseModel):
    name: Optional[str] = None
    interest_rate: Optional[float] = None
    max_loan_amount: Optional[float] = None
    is_active: Optional[bool] = None


class LoanTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    interest_rate: float
    max_loan_amount: Optional[float] = None
    is_active: bool


# ---------- Loan Application ----------

class LoanApplicationCreate(BaseModel):
    employee_id: int
    loan_type_id: int
    company_id: Optional[int] = None
    loan_amount: float
    repayment_periods: int
    rate_of_interest: Optional[float] = None
    reason: Optional[str] = None
    application_date: Optional[date] = None
    requested_disbursement_date: Optional[date] = None
    repayment_start_date: Optional[date] = None
    bank_account_no: Optional[str] = None
    bank_name: Optional[str] = None
    guarantor_name: Optional[str] = None
    guarantor_contact: Optional[str] = None
    hr_remarks: Optional[str] = None


class LoanApplicationUpdate(BaseModel):
    status: Optional[str] = None  # Open, Approved, Rejected
    loan_amount: Optional[float] = None
    repayment_periods: Optional[int] = None
    rate_of_interest: Optional[float] = None
    reason: Optional[str] = None
    requested_disbursement_date: Optional[date] = None
    repayment_start_date: Optional[date] = None
    bank_account_no: Optional[str] = None
    bank_name: Optional[str] = None
    guarantor_name: Optional[str] = None
    guarantor_contact: Optional[str] = None
    hr_remarks: Optional[str] = None


class LoanApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    loan_type_id: int
    company_id: Optional[int] = None
    loan_amount: float
    repayment_periods: int
    rate_of_interest: Optional[float] = None
    reason: Optional[str] = None
    application_date: date
    requested_disbursement_date: Optional[date] = None
    repayment_start_date: Optional[date] = None
    bank_account_no: Optional[str] = None
    bank_name: Optional[str] = None
    guarantor_name: Optional[str] = None
    guarantor_contact: Optional[str] = None
    hr_remarks: Optional[str] = None
    status: str
    loan_id: Optional[int] = None
    created_at: datetime


class ConvertApplicationRequest(BaseModel):
    """Optional overrides when turning an approved application into an actual Loan."""
    company_id: int
    loan_amount: Optional[float] = None       # defaults to the application's requested amount
    repayment_periods: Optional[int] = None   # defaults to the application's requested term
    rate_of_interest: Optional[float] = None  # defaults to the application's rate, or the LoanType's rate


# ---------- Loan ----------

class LoanCreate(BaseModel):
    employee_id: int
    loan_type_id: int
    company_id: int
    loan_amount: float
    repayment_periods: int
    rate_of_interest: Optional[float] = None  # defaults to the LoanType's rate if not given


class LoanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    loan_type_id: int
    company_id: int
    loan_amount: float
    rate_of_interest: float
    repayment_periods: int
    monthly_repayment_amount: float
    total_payable: float
    total_interest_payable: float
    balance_amount: float
    total_amount_paid: float
    total_principal_paid: float
    total_interest_paid: float
    disbursement_date: Optional[date] = None
    posting_date: date
    status: str
    created_at: datetime


# ---------- Loan Disbursement ----------

class LoanDisbursementCreate(BaseModel):
    disbursement_date: Optional[date] = None
    disbursed_amount: Optional[float] = None  # defaults to the loan's full sanctioned amount
    disbursement_account_id: Optional[int] = None
    payment_account_id: Optional[int] = None  # if given along with disbursement_account_id, posts a Journal Entry


class LoanDisbursementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    loan_id: int
    disbursement_date: date
    disbursed_amount: float
    disbursement_account_id: Optional[int] = None
    journal_entry_id: Optional[int] = None
    created_at: datetime


# ---------- Loan Repayment ----------

class LoanRepaymentCreate(BaseModel):
    payment_date: Optional[date] = None
    amount_paid: float


class LoanRepaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    loan_id: int
    payment_date: date
    amount_paid: float
    principal_amount: float
    interest_amount: float
    balance_after: float
    created_at: datetime


class LoanWithScheduleOut(LoanOut):
    repayments: List[LoanRepaymentOut] = []
    disbursements: List[LoanDisbursementOut] = []
