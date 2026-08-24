from datetime import datetime, date, timezone

from sqlalchemy import String, DateTime, Date, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LoanType(Base):
    """Master data - e.g. 'Personal Loan', 'Salary Advance', 'Vehicle Loan'."""
    __tablename__ = "loan_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    interest_rate: Mapped[float] = mapped_column(Float, default=0)  # annual %, 0 = interest-free
    max_loan_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)


class LoanApplication(Base):
    """An employee's request for a loan - reviewed, then either approved (-> becomes a Loan) or rejected."""
    __tablename__ = "loan_applications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    loan_type_id: Mapped[int] = mapped_column(ForeignKey("loan_types.id"))
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True)

    loan_amount: Mapped[float] = mapped_column(Float)  # amount requested
    repayment_periods: Mapped[int] = mapped_column()  # requested term, in months
    rate_of_interest: Mapped[float | None] = mapped_column(Float, nullable=True)  # override; defaults to LoanType's rate if blank
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    application_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    requested_disbursement_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    repayment_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # where the loan should be paid out to
    bank_account_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # optional guarantor / co-signer, common on real loan application forms
    guarantor_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    guarantor_contact: Mapped[str | None] = mapped_column(String(50), nullable=True)

    hr_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)  # internal notes from whoever reviews it

    # Open -> Approved / Rejected
    status: Mapped[str] = mapped_column(String(20), default="Open")

    # set once a Loan is created from this application (keeps the link both ways)
    loan_id: Mapped[int | None] = mapped_column(ForeignKey("loans.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class Loan(Base):
    """
    The sanctioned/active loan itself. Can be created directly, or via
    Loan Application -> "Convert to Loan". EMI (monthly_repayment_amount)
    is calculated automatically from the principal, interest rate, and
    repayment period at creation time - see service.py::calculate_emi.
    """
    __tablename__ = "loans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    loan_type_id: Mapped[int] = mapped_column(ForeignKey("loan_types.id"))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))

    loan_amount: Mapped[float] = mapped_column(Float)  # principal, sanctioned amount
    rate_of_interest: Mapped[float] = mapped_column(Float, default=0)  # annual %, snapshotted from LoanType at creation
    repayment_periods: Mapped[int] = mapped_column()  # months

    monthly_repayment_amount: Mapped[float] = mapped_column(Float)  # EMI, calculated
    total_payable: Mapped[float] = mapped_column(Float)  # principal + total interest over the full term
    total_interest_payable: Mapped[float] = mapped_column(Float)

    # running balances - updated as disbursement/repayments happen
    balance_amount: Mapped[float] = mapped_column(Float)  # remaining principal owed
    total_amount_paid: Mapped[float] = mapped_column(Float, default=0)
    total_principal_paid: Mapped[float] = mapped_column(Float, default=0)
    total_interest_paid: Mapped[float] = mapped_column(Float, default=0)

    disbursement_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    posting_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())

    # Sanctioned -> Disbursed -> (partially paid, still Disbursed) -> Closed/Repaid
    status: Mapped[str] = mapped_column(String(20), default="Sanctioned")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class LoanDisbursement(Base):
    """The actual payout of a sanctioned loan to the employee - usually happens once per loan."""
    __tablename__ = "loan_disbursements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    loan_id: Mapped[int] = mapped_column(ForeignKey("loans.id"))

    disbursement_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    disbursed_amount: Mapped[float] = mapped_column(Float)

    disbursement_account_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"), nullable=True)
    journal_entry_id: Mapped[int | None] = mapped_column(ForeignKey("journal_entries.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class LoanRepayment(Base):
    """
    One installment payment against a Loan. Each payment is automatically
    split into principal vs. interest using standard reducing-balance
    amortization - see service.py::record_repayment.
    """
    __tablename__ = "loan_repayments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    loan_id: Mapped[int] = mapped_column(ForeignKey("loans.id"))

    payment_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    amount_paid: Mapped[float] = mapped_column(Float)

    principal_amount: Mapped[float] = mapped_column(Float)
    interest_amount: Mapped[float] = mapped_column(Float)
    balance_after: Mapped[float] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
