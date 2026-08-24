from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


# ---------- Salary Slip Component ----------

class SalarySlipComponentCreate(BaseModel):
    component_type: str  # "Earning" or "Deduction"
    component_name: str
    amount: float


class SalarySlipComponentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    component_type: str
    component_name: str
    amount: float


# ---------- Salary Slip ----------

class SalarySlipCreate(BaseModel):
    """Create a standalone slip for one employee (outside of a Payroll Entry run)."""
    employee_id: int
    pay_period_start: date
    pay_period_end: date


class SalarySlipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    payroll_entry_id: Optional[int] = None
    company_id: int
    department_id: Optional[int] = None
    pay_period_start: date
    pay_period_end: date
    basic_salary: float
    payable_days: float
    absent_days: float
    gross_pay: float
    total_deductions: float
    net_pay: float
    status: str
    payment_date: Optional[date] = None
    created_at: datetime
    components: List[SalarySlipComponentOut] = []


# ---------- Payroll Entry ----------

class PayrollEntryCreate(BaseModel):
    company_id: int
    department_id: Optional[int] = None
    pay_period_start: date
    pay_period_end: date


class PayrollEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    department_id: Optional[int] = None
    pay_period_start: date
    pay_period_end: date
    posting_date: date
    employee_count: int
    total_net_pay: float
    status: str
    journal_entry_id: Optional[int] = None
    created_at: datetime


class PayrollEntryWithSlipsOut(PayrollEntryOut):
    salary_slips: List[SalarySlipOut] = []


class PostPayrollToJournalRequest(BaseModel):
    salary_expense_account_id: int
    salary_payable_account_id: int
