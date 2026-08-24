from datetime import date

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundError, BadRequestError
from app.modules.accounts.model import (
    Account, CostCenter, JournalEntry, JournalEntryLine, ExpenseClaim, SalaryPosting,
)
from app.modules.accounts.schema import (
    AccountCreate, AccountUpdate, CostCenterCreate,
    JournalEntryCreate, ExpenseClaimCreate, ExpenseClaimUpdate,
    PostExpenseRequest, SalaryPostingCreate,
)


# ---------- Account (Chart of Accounts) ----------

def list_accounts(db: Session, company_id: int | None = None, root_type: str | None = None):
    query = db.query(Account)
    if company_id:
        query = query.filter(Account.company_id == company_id)
    if root_type:
        query = query.filter(Account.root_type == root_type)
    return query.all()


def get_account(db: Session, account_id: int) -> Account:
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise NotFoundError("Account not found")
    return account


def create_account(db: Session, payload: AccountCreate) -> Account:
    account = Account(**payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_account(db: Session, account_id: int, payload: AccountUpdate) -> Account:
    account = get_account(db, account_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


def delete_account(db: Session, account_id: int) -> None:
    account = get_account(db, account_id)
    db.delete(account)
    db.commit()


# ---------- Cost Center ----------

def list_cost_centers(db: Session, company_id: int | None = None):
    query = db.query(CostCenter)
    if company_id:
        query = query.filter(CostCenter.company_id == company_id)
    return query.all()


def create_cost_center(db: Session, payload: CostCenterCreate) -> CostCenter:
    cost_center = CostCenter(**payload.model_dump())
    db.add(cost_center)
    db.commit()
    db.refresh(cost_center)
    return cost_center


# ---------- Journal Entry ----------

def list_journal_entries(db: Session, company_id: int | None = None, status: str | None = None):
    query = db.query(JournalEntry).options(joinedload(JournalEntry.lines))
    if company_id:
        query = query.filter(JournalEntry.company_id == company_id)
    if status:
        query = query.filter(JournalEntry.status == status)
    return query.order_by(JournalEntry.entry_date.desc()).all()


def get_journal_entry(db: Session, journal_entry_id: int) -> JournalEntry:
    entry = (
        db.query(JournalEntry)
        .options(joinedload(JournalEntry.lines))
        .filter(JournalEntry.id == journal_entry_id)
        .first()
    )
    if not entry:
        raise NotFoundError("Journal entry not found")
    return entry


def create_journal_entry(db: Session, payload: JournalEntryCreate) -> JournalEntry:
    total_debit = sum(line.debit or 0 for line in payload.lines)
    total_credit = sum(line.credit or 0 for line in payload.lines)

    if round(total_debit, 2) != round(total_credit, 2):
        raise BadRequestError(
            f"Journal entry is not balanced: total debit ({total_debit}) != total credit ({total_credit})"
        )
    if not payload.lines:
        raise BadRequestError("Journal entry must have at least one line")

    entry = JournalEntry(
        company_id=payload.company_id,
        entry_date=payload.entry_date,
        reference_number=payload.reference_number,
        user_remark=payload.user_remark,
        total_debit=total_debit,
        total_credit=total_credit,
        status="Submitted",
    )
    for line in payload.lines:
        entry.lines.append(JournalEntryLine(**line.model_dump()))

    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def delete_journal_entry(db: Session, journal_entry_id: int) -> None:
    entry = get_journal_entry(db, journal_entry_id)
    db.delete(entry)
    db.commit()


# ---------- Expense Claim ----------

def list_expense_claims(
    db: Session, employee_id: int | None = None, department_id: int | None = None,
    status: str | None = None,
):
    query = db.query(ExpenseClaim)
    if employee_id:
        query = query.filter(ExpenseClaim.employee_id == employee_id)
    if department_id:
        query = query.filter(ExpenseClaim.department_id == department_id)
    if status:
        query = query.filter(ExpenseClaim.status == status)
    return query.order_by(ExpenseClaim.created_at.desc()).all()


def get_expense_claim(db: Session, claim_id: int) -> ExpenseClaim:
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise NotFoundError("Expense claim not found")
    return claim


def create_expense_claim(db: Session, payload: ExpenseClaimCreate) -> ExpenseClaim:
    claim = ExpenseClaim(**payload.model_dump())
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


def update_expense_claim(db: Session, claim_id: int, payload: ExpenseClaimUpdate) -> ExpenseClaim:
    claim = get_expense_claim(db, claim_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(claim, field, value)
    db.commit()
    db.refresh(claim)
    return claim


def delete_expense_claim(db: Session, claim_id: int) -> None:
    claim = get_expense_claim(db, claim_id)
    db.delete(claim)
    db.commit()


def post_expense_to_journal(db: Session, claim_id: int, payload: PostExpenseRequest) -> ExpenseClaim:
    """Debit the expense account (tagged to the employee's department), credit the payment account."""
    claim = get_expense_claim(db, claim_id)
    if claim.journal_entry_id:
        raise BadRequestError("This expense claim has already been posted")

    entry = JournalEntry(
        company_id=_company_id_for_account(db, claim.expense_account_id),
        entry_date=claim.expense_date,
        reference_number=f"Expense Claim #{claim.id}",
        user_remark=claim.description,
        total_debit=claim.amount,
        total_credit=claim.amount,
        status="Submitted",
    )
    entry.lines.append(JournalEntryLine(
        account_id=claim.expense_account_id,
        department_id=claim.department_id,
        cost_center_id=claim.cost_center_id,
        debit=claim.amount,
        credit=0,
        remarks=f"Expense claim by employee #{claim.employee_id}",
    ))
    entry.lines.append(JournalEntryLine(
        account_id=payload.payment_account_id,
        debit=0,
        credit=claim.amount,
        remarks=f"Payment for expense claim #{claim.id}",
    ))
    db.add(entry)
    db.flush()

    claim.journal_entry_id = entry.id
    claim.status = "Paid"
    db.commit()
    db.refresh(claim)
    return claim


def _company_id_for_account(db: Session, account_id: int) -> int:
    account = get_account(db, account_id)
    return account.company_id


# ---------- Salary Posting ----------

def list_salary_postings(db: Session, company_id: int | None = None, department_id: int | None = None):
    query = db.query(SalaryPosting)
    if company_id:
        query = query.filter(SalaryPosting.company_id == company_id)
    if department_id:
        query = query.filter(SalaryPosting.department_id == department_id)
    return query.order_by(SalaryPosting.created_at.desc()).all()


def create_salary_posting(db: Session, payload: SalaryPostingCreate) -> SalaryPosting:
    from app.modules.employee.model import Employee

    query = db.query(Employee).filter(
        Employee.company_id == payload.company_id,
        Employee.status == "active",
        Employee.salary.isnot(None),
    )
    if payload.department_id:
        query = query.filter(Employee.department_id == payload.department_id)
    employees = query.all()

    if not employees:
        raise BadRequestError("No active employees with a salary set match this company/department")

    total = sum(e.salary for e in employees)
    month_start = date(payload.month.year, payload.month.month, 1)

    entry = JournalEntry(
        company_id=payload.company_id,
        entry_date=payload.month,
        reference_number=f"Salary - {month_start.strftime('%B %Y')}",
        user_remark=f"Salary posting for {len(employees)} employee(s)",
        total_debit=total,
        total_credit=total,
        status="Submitted",
    )
    for emp in employees:
        entry.lines.append(JournalEntryLine(
            account_id=payload.salary_expense_account_id,
            department_id=emp.department_id,
            debit=emp.salary,
            credit=0,
            remarks=f"Salary - {emp.full_name} ({emp.employee_code})",
        ))
    entry.lines.append(JournalEntryLine(
        account_id=payload.salary_payable_account_id,
        debit=0,
        credit=total,
        remarks=f"Salary payable - {month_start.strftime('%B %Y')}",
    ))
    db.add(entry)
    db.flush()

    posting = SalaryPosting(
        company_id=payload.company_id,
        department_id=payload.department_id,
        month=month_start,
        employee_count=len(employees),
        total_amount=total,
        journal_entry_id=entry.id,
    )
    db.add(posting)
    db.commit()
    db.refresh(posting)
    return posting


# ---------- Account Ledger ----------

def get_account_ledger(db: Session, account_id: int):
    account = get_account(db, account_id)
    lines = (
        db.query(JournalEntryLine)
        .join(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)
        .filter(JournalEntryLine.account_id == account_id)
        .order_by(JournalEntry.entry_date.asc())
        .all()
    )

    total_debit = sum(l.debit for l in lines)
    total_credit = sum(l.credit for l in lines)

    ledger_lines = []
    for line in lines:
        entry = db.query(JournalEntry).filter(JournalEntry.id == line.journal_entry_id).first()
        ledger_lines.append({
            "journal_entry_id": line.journal_entry_id,
            "entry_date": entry.entry_date,
            "reference_number": entry.reference_number,
            "debit": line.debit,
            "credit": line.credit,
            "remarks": line.remarks,
            "department_id": line.department_id,
            "cost_center_id": line.cost_center_id,
        })

    # Assets/Expenses increase with debit; Liabilities/Equity/Income increase with credit
    balance = (
        total_debit - total_credit
        if account.root_type in ("Asset", "Expense")
        else total_credit - total_debit
    )

    return {
        "account_id": account.id,
        "account_name": account.account_name,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "balance": balance,
        "lines": ledger_lines,
    }
