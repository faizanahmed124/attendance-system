from datetime import datetime, date, timezone

from sqlalchemy import String, DateTime, Date, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PayrollEntry(Base):
    """
    A batch run: 'generate salary slips for everyone in this company/
    department for this pay period'. Creates one SalarySlip per eligible
    employee. Can optionally be posted to the ledger afterwards (debits
    Salary Expense per department, credits Salary Payable) - see
    app/modules/payroll/service.py::post_to_journal.
    """
    __tablename__ = "payroll_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)

    pay_period_start: Mapped[date] = mapped_column(Date)
    pay_period_end: Mapped[date] = mapped_column(Date)
    posting_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())

    employee_count: Mapped[int] = mapped_column(default=0)
    total_net_pay: Mapped[float] = mapped_column(Float, default=0)

    status: Mapped[str] = mapped_column(String(20), default="Draft")  # Draft, Submitted
    journal_entry_id: Mapped[int | None] = mapped_column(ForeignKey("journal_entries.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    salary_slips: Mapped[list["SalarySlip"]] = relationship(back_populates="payroll_entry")


class SalarySlip(Base):
    """One employee's payslip for one pay period."""
    __tablename__ = "salary_slips"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    payroll_entry_id: Mapped[int | None] = mapped_column(ForeignKey("payroll_entries.id"), nullable=True)

    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)

    pay_period_start: Mapped[date] = mapped_column(Date)
    pay_period_end: Mapped[date] = mapped_column(Date)

    basic_salary: Mapped[float] = mapped_column(Float, default=0)
    payable_days: Mapped[float] = mapped_column(Float, default=0)   # total days in period
    absent_days: Mapped[float] = mapped_column(Float, default=0)    # counted from Attendance

    gross_pay: Mapped[float] = mapped_column(Float, default=0)      # sum of earning components
    total_deductions: Mapped[float] = mapped_column(Float, default=0)  # sum of deduction components
    net_pay: Mapped[float] = mapped_column(Float, default=0)        # gross_pay - total_deductions

    # Draft -> Submitted -> Paid
    status: Mapped[str] = mapped_column(String(20), default="Draft")
    payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    payroll_entry: Mapped["PayrollEntry"] = relationship(back_populates="salary_slips")
    components: Mapped[list["SalarySlipComponent"]] = relationship(
        back_populates="salary_slip", cascade="all, delete-orphan"
    )


class SalarySlipComponent(Base):
    """One earning or deduction line on a salary slip, e.g. 'House Rent Allowance' or 'Income Tax'."""
    __tablename__ = "salary_slip_components"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    salary_slip_id: Mapped[int] = mapped_column(ForeignKey("salary_slips.id"))
    component_type: Mapped[str] = mapped_column(String(20))  # "Earning" or "Deduction"
    component_name: Mapped[str] = mapped_column(String(100))
    amount: Mapped[float] = mapped_column(Float, default=0)

    salary_slip: Mapped["SalarySlip"] = relationship(back_populates="components")
