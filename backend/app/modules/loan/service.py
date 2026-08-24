from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, BadRequestError
from app.modules.loan.model import LoanType, LoanApplication, Loan, LoanDisbursement, LoanRepayment
from app.modules.loan.schema import (
    LoanTypeCreate, LoanTypeUpdate,
    LoanApplicationCreate, LoanApplicationUpdate, ConvertApplicationRequest,
    LoanCreate, LoanDisbursementCreate, LoanRepaymentCreate,
)


def calculate_emi(principal: float, annual_rate: float, months: int) -> float:
    """
    Standard reducing-balance EMI formula. annual_rate is a percentage
    (e.g. 12 for 12%). If annual_rate is 0 (interest-free loan, common for
    salary advances), it's a plain equal split.
    """
    if months <= 0:
        raise BadRequestError("repayment_periods must be at least 1")
    if annual_rate == 0:
        return round(principal / months, 2)

    monthly_rate = annual_rate / 12 / 100
    emi = principal * monthly_rate * (1 + monthly_rate) ** months / ((1 + monthly_rate) ** months - 1)
    return round(emi, 2)


# ---------- Loan Type ----------

def list_loan_types(db: Session):
    return db.query(LoanType).all()


def get_loan_type(db: Session, loan_type_id: int) -> LoanType:
    loan_type = db.query(LoanType).filter(LoanType.id == loan_type_id).first()
    if not loan_type:
        raise NotFoundError("Loan type not found")
    return loan_type


def create_loan_type(db: Session, payload: LoanTypeCreate) -> LoanType:
    loan_type = LoanType(**payload.model_dump())
    db.add(loan_type)
    db.commit()
    db.refresh(loan_type)
    return loan_type


def update_loan_type(db: Session, loan_type_id: int, payload: LoanTypeUpdate) -> LoanType:
    loan_type = get_loan_type(db, loan_type_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(loan_type, field, value)
    db.commit()
    db.refresh(loan_type)
    return loan_type


def delete_loan_type(db: Session, loan_type_id: int) -> None:
    loan_type = get_loan_type(db, loan_type_id)
    db.delete(loan_type)
    db.commit()


# ---------- Loan Application ----------

def list_loan_applications(db: Session, employee_id: int | None = None, status: str | None = None):
    query = db.query(LoanApplication)
    if employee_id:
        query = query.filter(LoanApplication.employee_id == employee_id)
    if status:
        query = query.filter(LoanApplication.status == status)
    return query.order_by(LoanApplication.created_at.desc()).all()


def get_loan_application(db: Session, application_id: int) -> LoanApplication:
    application = db.query(LoanApplication).filter(LoanApplication.id == application_id).first()
    if not application:
        raise NotFoundError("Loan application not found")
    return application


def create_loan_application(db: Session, payload: LoanApplicationCreate) -> LoanApplication:
    get_loan_type(db, payload.loan_type_id)  # 404s if invalid
    application = LoanApplication(**payload.model_dump(exclude_unset=True))
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def update_loan_application(db: Session, application_id: int, payload: LoanApplicationUpdate) -> LoanApplication:
    application = get_loan_application(db, application_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(application, field, value)
    db.commit()
    db.refresh(application)
    return application


def delete_loan_application(db: Session, application_id: int) -> None:
    application = get_loan_application(db, application_id)
    db.delete(application)
    db.commit()


def convert_application_to_loan(db: Session, application_id: int, payload: ConvertApplicationRequest) -> Loan:
    application = get_loan_application(db, application_id)
    if application.loan_id:
        raise BadRequestError("This application has already been converted to a loan")
    if application.status != "Approved":
        raise BadRequestError("Only an Approved application can be converted to a loan")

    loan_type = get_loan_type(db, application.loan_type_id)

    # priority for the interest rate: explicit override on this conversion
    # request > whatever the employee's application itself specified >
    # the loan type's default rate
    if payload.rate_of_interest is not None:
        rate = payload.rate_of_interest
    elif application.rate_of_interest is not None:
        rate = application.rate_of_interest
    else:
        rate = loan_type.interest_rate

    loan = _create_loan_record(
        db,
        employee_id=application.employee_id,
        loan_type=loan_type,
        company_id=payload.company_id,
        loan_amount=payload.loan_amount or application.loan_amount,
        repayment_periods=payload.repayment_periods or application.repayment_periods,
        rate_of_interest=rate,
    )

    application.loan_id = loan.id
    db.commit()
    return loan


# ---------- Loan ----------

def list_loans(db: Session, employee_id: int | None = None, status: str | None = None):
    query = db.query(Loan)
    if employee_id:
        query = query.filter(Loan.employee_id == employee_id)
    if status:
        query = query.filter(Loan.status == status)
    return query.order_by(Loan.created_at.desc()).all()


def get_loan(db: Session, loan_id: int) -> Loan:
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise NotFoundError("Loan not found")
    return loan


def get_loan_with_schedule(db: Session, loan_id: int):
    loan = get_loan(db, loan_id)
    repayments = (
        db.query(LoanRepayment)
        .filter(LoanRepayment.loan_id == loan_id)
        .order_by(LoanRepayment.payment_date.asc())
        .all()
    )
    disbursements = (
        db.query(LoanDisbursement)
        .filter(LoanDisbursement.loan_id == loan_id)
        .order_by(LoanDisbursement.disbursement_date.asc())
        .all()
    )
    return loan, repayments, disbursements


def _create_loan_record(db: Session, employee_id, loan_type: LoanType, company_id, loan_amount, repayment_periods, rate_of_interest) -> Loan:
    if loan_type.max_loan_amount and loan_amount > loan_type.max_loan_amount:
        raise BadRequestError(
            f"Loan amount exceeds the maximum allowed for '{loan_type.name}' ({loan_type.max_loan_amount})"
        )

    emi = calculate_emi(loan_amount, rate_of_interest, repayment_periods)
    total_payable = round(emi * repayment_periods, 2)
    total_interest_payable = round(total_payable - loan_amount, 2)

    loan = Loan(
        employee_id=employee_id,
        loan_type_id=loan_type.id,
        company_id=company_id,
        loan_amount=loan_amount,
        rate_of_interest=rate_of_interest,
        repayment_periods=repayment_periods,
        monthly_repayment_amount=emi,
        total_payable=total_payable,
        total_interest_payable=total_interest_payable,
        balance_amount=loan_amount,
        status="Sanctioned",
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


def create_loan(db: Session, payload: LoanCreate) -> Loan:
    loan_type = get_loan_type(db, payload.loan_type_id)
    rate = payload.rate_of_interest if payload.rate_of_interest is not None else loan_type.interest_rate
    return _create_loan_record(
        db,
        employee_id=payload.employee_id,
        loan_type=loan_type,
        company_id=payload.company_id,
        loan_amount=payload.loan_amount,
        repayment_periods=payload.repayment_periods,
        rate_of_interest=rate,
    )


def delete_loan(db: Session, loan_id: int) -> None:
    loan = get_loan(db, loan_id)
    if loan.status != "Sanctioned":
        raise BadRequestError("Can only delete a loan that hasn't been disbursed yet")
    db.delete(loan)
    db.commit()


# ---------- Loan Disbursement ----------

def create_disbursement(db: Session, loan_id: int, payload: LoanDisbursementCreate) -> LoanDisbursement:
    loan = get_loan(db, loan_id)
    if loan.status != "Sanctioned":
        raise BadRequestError("This loan has already been disbursed")

    amount = payload.disbursed_amount if payload.disbursed_amount is not None else loan.loan_amount

    disbursement = LoanDisbursement(
        loan_id=loan.id,
        disbursement_date=payload.disbursement_date or date.today(),
        disbursed_amount=amount,
        disbursement_account_id=payload.disbursement_account_id,
    )
    db.add(disbursement)

    loan.status = "Disbursed"
    loan.disbursement_date = disbursement.disbursement_date

    if payload.disbursement_account_id and payload.payment_account_id:
        from app.modules.accounts.model import JournalEntry, JournalEntryLine

        journal = JournalEntry(
            company_id=loan.company_id,
            entry_date=disbursement.disbursement_date,
            reference_number=f"Loan Disbursement #{loan.id}",
            user_remark=f"Disbursement for loan #{loan.id}",
            total_debit=amount,
            total_credit=amount,
            status="Submitted",
        )
        journal.lines.append(JournalEntryLine(
            account_id=payload.disbursement_account_id,
            debit=amount, credit=0,
            remarks=f"Loan disbursed to employee #{loan.employee_id}",
        ))
        journal.lines.append(JournalEntryLine(
            account_id=payload.payment_account_id,
            debit=0, credit=amount,
            remarks=f"Payment for loan #{loan.id}",
        ))
        db.add(journal)
        db.flush()
        disbursement.journal_entry_id = journal.id

    db.commit()
    db.refresh(disbursement)
    return disbursement


def list_disbursements(db: Session, loan_id: int):
    return db.query(LoanDisbursement).filter(LoanDisbursement.loan_id == loan_id).all()


# ---------- Loan Repayment ----------

def record_repayment(db: Session, loan_id: int, payload: LoanRepaymentCreate) -> LoanRepayment:
    loan = get_loan(db, loan_id)
    if loan.status not in ("Disbursed",):
        raise BadRequestError("Can only record repayments against a Disbursed loan")
    if loan.balance_amount <= 0:
        raise BadRequestError("This loan is already fully repaid")

    monthly_rate = loan.rate_of_interest / 12 / 100
    interest_amount = round(loan.balance_amount * monthly_rate, 2)
    principal_amount = round(payload.amount_paid - interest_amount, 2)

    if principal_amount < 0:
        principal_amount = 0
        interest_amount = payload.amount_paid

    new_balance = round(loan.balance_amount - principal_amount, 2)
    if new_balance < 0:
        principal_amount = round(principal_amount + new_balance, 2)
        new_balance = 0

    repayment = LoanRepayment(
        loan_id=loan.id,
        payment_date=payload.payment_date or date.today(),
        amount_paid=payload.amount_paid,
        principal_amount=principal_amount,
        interest_amount=interest_amount,
        balance_after=new_balance,
    )
    db.add(repayment)

    loan.balance_amount = new_balance
    loan.total_amount_paid = round(loan.total_amount_paid + payload.amount_paid, 2)
    loan.total_principal_paid = round(loan.total_principal_paid + principal_amount, 2)
    loan.total_interest_paid = round(loan.total_interest_paid + interest_amount, 2)

    if new_balance <= 0:
        loan.status = "Repaid"

    db.commit()
    db.refresh(repayment)
    return repayment


def list_repayments(db: Session, loan_id: int):
    return (
        db.query(LoanRepayment)
        .filter(LoanRepayment.loan_id == loan_id)
        .order_by(LoanRepayment.payment_date.asc())
        .all()
    )
