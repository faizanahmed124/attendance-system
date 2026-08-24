from datetime import datetime, date, timezone

from sqlalchemy import String, DateTime, Date, Boolean, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Account(Base):
    """
    Chart of Accounts entry. Tree structure via parent_account_id,
    similar to Frappe's Account doctype.
    """
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    account_name: Mapped[str] = mapped_column(String(150))
    account_number: Mapped[str | None] = mapped_column(String(30), nullable=True)

    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    parent_account_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"), nullable=True)

    # Asset, Liability, Equity, Income, Expense
    root_type: Mapped[str] = mapped_column(String(20))

    # e.g. Bank, Cash, Receivable, Payable, Fixed Asset, Expense Account ...
    account_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    is_group: Mapped[bool] = mapped_column(Boolean, default=False)  # group node vs ledger (postable)
    currency: Mapped[str] = mapped_column(String(10), default="PKR")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class CostCenter(Base):
    __tablename__ = "cost_centers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    parent_cost_center_id: Mapped[int | None] = mapped_column(
        ForeignKey("cost_centers.id"), nullable=True
    )
    is_group: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class JournalEntry(Base):
    """
    A balanced double-entry accounting transaction (total debits == total
    credits across its lines). This is the mechanism Expense Claims and
    Salary Postings post through, and can also be created directly.
    """
    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    entry_date: Mapped[date] = mapped_column(Date)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    user_remark: Mapped[str | None] = mapped_column(Text, nullable=True)

    total_debit: Mapped[float] = mapped_column(Float, default=0)
    total_credit: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="Draft")  # Draft, Submitted

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    lines: Mapped[list["JournalEntryLine"]] = relationship(
        back_populates="journal_entry", cascade="all, delete-orphan"
    )


class JournalEntryLine(Base):
    __tablename__ = "journal_entry_lines"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    journal_entry_id: Mapped[int] = mapped_column(ForeignKey("journal_entries.id"))
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))

    # the two "integration" hooks - every line can be tagged to a department
    # and/or a cost center so P&L can be sliced either way
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    cost_center_id: Mapped[int | None] = mapped_column(ForeignKey("cost_centers.id"), nullable=True)

    debit: Mapped[float] = mapped_column(Float, default=0)
    credit: Mapped[float] = mapped_column(Float, default=0)
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)

    journal_entry: Mapped["JournalEntry"] = relationship(back_populates="lines")


class ExpenseClaim(Base):
    """An expense incurred by an employee, postable to the ledger against an expense account."""
    __tablename__ = "expense_claims"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    expense_account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    cost_center_id: Mapped[int | None] = mapped_column(ForeignKey("cost_centers.id"), nullable=True)

    amount: Mapped[float] = mapped_column(Float)
    expense_date: Mapped[date] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Draft -> Submitted -> Paid (Paid means it has been posted to a Journal Entry)
    status: Mapped[str] = mapped_column(String(20), default="Draft")
    journal_entry_id: Mapped[int | None] = mapped_column(ForeignKey("journal_entries.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class SalaryPosting(Base):
    """
    An audit record of one "post salaries to the ledger" run - debits a
    Salary Expense account (per employee, tagged to their department) and
    credits a single Salary Payable account for the total.
    """
    __tablename__ = "salary_postings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    month: Mapped[date] = mapped_column(Date)  # stored as the 1st of the month
    employee_count: Mapped[int] = mapped_column(default=0)
    total_amount: Mapped[float] = mapped_column(Float, default=0)
    journal_entry_id: Mapped[int] = mapped_column(ForeignKey("journal_entries.id"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
