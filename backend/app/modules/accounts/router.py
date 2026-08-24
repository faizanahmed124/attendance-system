from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.accounts import service
from app.modules.accounts.schema import (
    AccountCreate, AccountUpdate, AccountOut,
    CostCenterCreate, CostCenterOut,
    JournalEntryCreate, JournalEntryOut,
    ExpenseClaimCreate, ExpenseClaimUpdate, ExpenseClaimOut, PostExpenseRequest,
    SalaryPostingCreate, SalaryPostingOut,
    AccountLedgerOut,
)

router = APIRouter(prefix="/api/accounts", tags=["Chart of Accounts"])


# ---- Accounts ----

@router.get("/", response_model=List[AccountOut])
def list_accounts(
    company_id: Optional[int] = None, root_type: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("accounts", "read")),
):
    return service.list_accounts(db, company_id, root_type)


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("accounts", "read"))):
    return service.get_account(db, account_id)


@router.post("/", response_model=AccountOut)
def create_account(
    payload: AccountCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "create")),
):
    return service.create_account(db, payload)


@router.put("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: int, payload: AccountUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "write")),
):
    return service.update_account(db, account_id, payload)


@router.delete("/{account_id}")
def delete_account(
    account_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "delete")),
):
    service.delete_account(db, account_id)
    return {"message": "Account deleted successfully"}


@router.get("/{account_id}/ledger", response_model=AccountLedgerOut)
def get_account_ledger(
    account_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "read")),
):
    return service.get_account_ledger(db, account_id)


# ---- Cost Centers ----

@router.get("/cost-centers/list", response_model=List[CostCenterOut])
def list_cost_centers(
    company_id: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("accounts", "read")),
):
    return service.list_cost_centers(db, company_id)


@router.post("/cost-centers", response_model=CostCenterOut)
def create_cost_center(
    payload: CostCenterCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "create")),
):
    return service.create_cost_center(db, payload)


# ---- Journal Entries ----

@router.get("/journal-entries/list", response_model=List[JournalEntryOut])
def list_journal_entries(
    company_id: Optional[int] = None, status: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("accounts", "read")),
):
    return service.list_journal_entries(db, company_id, status)


@router.get("/journal-entries/{journal_entry_id}", response_model=JournalEntryOut)
def get_journal_entry(
    journal_entry_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "read")),
):
    return service.get_journal_entry(db, journal_entry_id)


@router.post("/journal-entries", response_model=JournalEntryOut)
def create_journal_entry(
    payload: JournalEntryCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "create")),
):
    return service.create_journal_entry(db, payload)


@router.delete("/journal-entries/{journal_entry_id}")
def delete_journal_entry(
    journal_entry_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "delete")),
):
    service.delete_journal_entry(db, journal_entry_id)
    return {"message": "Journal entry deleted successfully"}


# ---- Expense Claims ----

@router.get("/expense-claims/list", response_model=List[ExpenseClaimOut])
def list_expense_claims(
    employee_id: Optional[int] = None, department_id: Optional[int] = None, status: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("accounts", "read")),
):
    return service.list_expense_claims(db, employee_id, department_id, status)


@router.get("/expense-claims/{claim_id}", response_model=ExpenseClaimOut)
def get_expense_claim(
    claim_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "read")),
):
    return service.get_expense_claim(db, claim_id)


@router.post("/expense-claims", response_model=ExpenseClaimOut)
def create_expense_claim(
    payload: ExpenseClaimCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "create")),
):
    return service.create_expense_claim(db, payload)


@router.put("/expense-claims/{claim_id}", response_model=ExpenseClaimOut)
def update_expense_claim(
    claim_id: int, payload: ExpenseClaimUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "write")),
):
    return service.update_expense_claim(db, claim_id, payload)


@router.delete("/expense-claims/{claim_id}")
def delete_expense_claim(
    claim_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "delete")),
):
    service.delete_expense_claim(db, claim_id)
    return {"message": "Expense claim deleted successfully"}


@router.post("/expense-claims/{claim_id}/post", response_model=ExpenseClaimOut)
def post_expense_to_journal(
    claim_id: int, payload: PostExpenseRequest, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "write")),
):
    return service.post_expense_to_journal(db, claim_id, payload)


# ---- Salary Postings ----

@router.get("/salary-postings/list", response_model=List[SalaryPostingOut])
def list_salary_postings(
    company_id: Optional[int] = None, department_id: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("accounts", "read")),
):
    return service.list_salary_postings(db, company_id, department_id)


@router.post("/salary-postings", response_model=SalaryPostingOut)
def create_salary_posting(
    payload: SalaryPostingCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("accounts", "create")),
):
    return service.create_salary_posting(db, payload)
