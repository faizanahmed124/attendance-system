from datetime import datetime, date, timezone

from sqlalchemy import String, DateTime, Date, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmployeeOnboarding(Base):
    """Tracks a new hire's checklist from offer through first day - Frappe's 'Employee Onboarding'."""
    __tablename__ = "employee_onboardings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))

    boarding_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    # Pending -> In Process -> Completed
    boarding_status: Mapped[str] = mapped_column(String(20), default="Pending")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class OnboardingActivity(Base):
    """One checklist item within an Employee Onboarding - e.g. 'Setup laptop', 'HR orientation'."""
    __tablename__ = "onboarding_activities"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    onboarding_id: Mapped[int] = mapped_column(ForeignKey("employee_onboardings.id"))

    activity_name: Mapped[str] = mapped_column(String(200))
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0)


class EmployeeSeparation(Base):
    """Tracks an employee's exit checklist - Frappe's 'Employee Separation'."""
    __tablename__ = "employee_separations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))

    resignation_letter_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    relieving_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    exit_interview_held: Mapped[bool] = mapped_column(Boolean, default=False)
    # Pending -> In Process -> Completed
    boarding_status: Mapped[str] = mapped_column(String(20), default="Pending")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class SeparationActivity(Base):
    """One checklist item within an Employee Separation - e.g. 'Return laptop', 'Revoke access'."""
    __tablename__ = "separation_activities"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    separation_id: Mapped[int] = mapped_column(ForeignKey("employee_separations.id"))

    activity_name: Mapped[str] = mapped_column(String(200))
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0)
