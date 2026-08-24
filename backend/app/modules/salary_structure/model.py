from datetime import datetime, date, timezone

from sqlalchemy import String, DateTime, Date, Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SalaryComponent(Base):
    """
    Master data for one earning or deduction - e.g. 'Basic Pay', 'House
    Rent Allowance', 'Provident Fund', 'Income Tax'. Either a fixed
    `amount`, or a `formula` (e.g. "base*0.1") evaluated per employee
    using their Salary Structure Assignment's `base` - see service.py.
    """
    __tablename__ = "salary_components"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    component_type: Mapped[str] = mapped_column(String(20))  # Earning, Deduction
    abbreviation: Mapped[str | None] = mapped_column(String(20), nullable=True)

    is_formula_based: Mapped[bool] = mapped_column(Boolean, default=False)
    formula: Mapped[str | None] = mapped_column(String(300), nullable=True)  # e.g. "base*0.1", only used if is_formula_based
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)  # fixed amount, used if NOT formula based

    depends_on_payment_days: Mapped[bool] = mapped_column(Boolean, default=True)  # pro-rate for absent days
    is_tax_applicable: Mapped[bool] = mapped_column(Boolean, default=False)  # only meaningful for Earning components
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class SalaryStructure(Base):
    """A named template - e.g. 'Standard Grade A'. Made up of SalaryStructureComponent line items."""
    __tablename__ = "salary_structures"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class SalaryStructureComponent(Base):
    """
    One line item within a Salary Structure - links a SalaryComponent to a
    SalaryStructure, with optional per-structure overrides of the
    component's default amount/formula (leave both blank to just use the
    component's own defaults as-is).
    """
    __tablename__ = "salary_structure_components"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    salary_structure_id: Mapped[int] = mapped_column(ForeignKey("salary_structures.id"))
    salary_component_id: Mapped[int] = mapped_column(ForeignKey("salary_components.id"))

    amount_override: Mapped[float | None] = mapped_column(Float, nullable=True)
    formula_override: Mapped[str | None] = mapped_column(String(300), nullable=True)

    sort_order: Mapped[int] = mapped_column(default=0)


class SalaryStructureAssignment(Base):
    """
    Assigns a Salary Structure to a specific employee, effective from a
    date. `base` is the variable most formulas reference (e.g.
    "base*0.1"). When generating a Salary Slip for a period, the
    assignment with the latest `from_date` on/before the period is used.
    """
    __tablename__ = "salary_structure_assignments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    salary_structure_id: Mapped[int] = mapped_column(ForeignKey("salary_structures.id"))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))

    from_date: Mapped[date] = mapped_column(Date)
    base: Mapped[float] = mapped_column(Float)
    variable: Mapped[float] = mapped_column(Float, default=0)  # e.g. a monthly bonus pool, referenced as `variable` in formulas

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
