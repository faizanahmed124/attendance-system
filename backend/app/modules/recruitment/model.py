from datetime import datetime, date, timezone

from sqlalchemy import String, DateTime, Date, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class JobOpening(Base):
    __tablename__ = "job_openings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(150))  # e.g. "Backend Developer"
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    designation_id: Mapped[int] = mapped_column(ForeignKey("designations.id"))
    positions: Mapped[int] = mapped_column(default=1)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Open")  # Open, Closed
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    applicants: Mapped[list["JobApplicant"]] = relationship(
        back_populates="job_opening", cascade="all, delete-orphan"
    )


class JobApplicant(Base):
    __tablename__ = "job_applicants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(150), index=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    resume_url: Mapped[str | None] = mapped_column(String(300), nullable=True)

    job_opening_id: Mapped[int] = mapped_column(ForeignKey("job_openings.id"))
    applied_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())

    # Open -> Interviewing -> Offered -> Hired  (or Rejected at any point)
    status: Mapped[str] = mapped_column(String(20), default="Open")

    expected_salary: Mapped[float | None] = mapped_column(Float, nullable=True)
    offered_salary: Mapped[float | None] = mapped_column(Float, nullable=True)
    offer_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # populated once "Convert to Employee" is run
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    job_opening: Mapped["JobOpening"] = relationship(back_populates="applicants")
    interviews: Mapped[list["Interview"]] = relationship(
        back_populates="applicant", cascade="all, delete-orphan"
    )


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    job_applicant_id: Mapped[int] = mapped_column(ForeignKey("job_applicants.id"))
    round_name: Mapped[str] = mapped_column(String(100))  # e.g. "HR Round", "Technical Round"
    scheduled_on: Mapped[datetime] = mapped_column(DateTime)
    interviewer_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # Scheduled -> Cleared / Rejected
    status: Mapped[str] = mapped_column(String(20), default="Scheduled")
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    applicant: Mapped["JobApplicant"] = relationship(back_populates="interviews")
