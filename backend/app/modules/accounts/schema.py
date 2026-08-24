from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class AccountCreate(BaseModel):
    account_name: str
    account_number: Optional[str] = None
    company_id: int
    parent_account_id: Optional[int] = None
    root_type: str  # Asset, Liability, Equity, Income, Expense
    account_type: Optional[str] = None
    is_group: Optional[bool] = False
    currency: Optional[str] = "PKR"


class AccountUpdate(BaseModel):
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    account_type: Optional[str] = None
    is_active: Optional[bool] = None


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_name: str
    account_number: Optional[str] = None
    company_id: int
    parent_account_id: Optional[int] = None
    root_type: str
    account_type: Optional[str] = None
    is_group: bool
    currency: str
    is_active: bool
    created_at: datetime


class CostCenterCreate(BaseModel):
    name: str
    company_id: int
    parent_cost_center_id: Optional[int] = None
    is_group: Optional[bool] = False


class CostCenterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company_id: int
    parent_cost_center_id: Optional[int] = None
    is_group: bool
    is_active: bool


# ---------- Journal Entry ----------

class JournalEntryLineCreate(BaseModel):
    account_id: int
    department_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    debit: Optional[float] = 0
    credit: Optional[float] = 0
    remarks: Optional[str] = None


class JournalEntryLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    department_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    debit: float
    credit: float
    remarks: Optional[str] = None


class JournalEntryCreate(BaseModel):
    company_id: int
    entry_date: date
    reference_number: Optional[str] = None
    user_remark: Optional[str] = None
    lines: List[JournalEntryLineCreate]


class JournalEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    entry_date: date
    reference_number: Optional[str] = None
    user_remark: Optional[str] = None
    total_debit: float
    total_credit: float
    status: str
    created_at: datetime
    lines: List[JournalEntryLineOut] = []


# ---------- Expense Claim ----------

class ExpenseClaimCreate(BaseModel):
    employee_id: int
    department_id: Optional[int] = None
    expense_account_id: int
    cost_center_id: Optional[int] = None
    amount: float
    expense_date: date
    description: Optional[str] = None
    status: Optional[str] = "Draft"


class ExpenseClaimUpdate(BaseModel):
    amount: Optional[float] = None
    expense_date: Optional[date] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ExpenseClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    department_id: Optional[int] = None
    expense_account_id: int
    cost_center_id: Optional[int] = None
    amount: float
    expense_date: date
    description: Optional[str] = None
    status: str
    journal_entry_id: Optional[int] = None
    created_at: datetime


class PostExpenseRequest(BaseModel):
    payment_account_id: int  # e.g. Cash or Bank account being credited


# ---------- Salary Posting ----------

class SalaryPostingCreate(BaseModel):
    company_id: int
    department_id: Optional[int] = None
    month: date  # any date within the target month
    salary_expense_account_id: int
    salary_payable_account_id: int


class SalaryPostingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    department_id: Optional[int] = None
    month: date
    employee_count: int
    total_amount: float
    journal_entry_id: int
    created_at: datetime


# ---------- Account Ledger ----------

class LedgerLineOut(BaseModel):
    journal_entry_id: int
    entry_date: date
    reference_number: Optional[str] = None
    debit: float
    credit: float
    remarks: Optional[str] = None
    department_id: Optional[int] = None
    cost_center_id: Optional[int] = None


class AccountLedgerOut(BaseModel):
    account_id: int
    account_name: str
    total_debit: float
    total_credit: float
    balance: float
    lines: List[LedgerLineOut]
