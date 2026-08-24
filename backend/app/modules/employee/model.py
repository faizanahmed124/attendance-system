from datetime import datetime, date, timezone

from sqlalchemy import String, DateTime, Date, Float, Integer, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # ---- Basic Information ----
    employee_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)  # Employee ID, e.g. EMP-0001
    salutation: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Mr, Mrs, Dr, ...
    first_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    middle_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    full_name: Mapped[str] = mapped_column(String(150))
    father_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    cnic: Mapped[str | None] = mapped_column(String(30), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # ---- Job info ----
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    designation_id: Mapped[int] = mapped_column(ForeignKey("designations.id"))
    branch: Mapped[str | None] = mapped_column(String(100), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(50), nullable=True)
    shift_type_id: Mapped[int | None] = mapped_column(ForeignKey("shift_types.id"), nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(30), nullable=True)  # Full-time, Part-time, Contract, Internship, Probation
    date_of_joining: Mapped[date] = mapped_column(Date)
    contract_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)

    # self-referential: this employee's manager/approvers are other employees
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    expense_approver_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    leave_approver_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    shift_request_approver_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)

    # ---- Joining ----
    offer_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    confirmation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notice_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    date_of_retirement: Mapped[date | None] = mapped_column(Date, nullable=True)

    # ---- Compensation ----
    salary: Mapped[float | None] = mapped_column(Float, nullable=True)  # Basic Pay
    ctc: Mapped[float | None] = mapped_column(Float, nullable=True)     # Cost to Company
    income_tax_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_currency: Mapped[str | None] = mapped_column(String(10), nullable=True, default="PKR")
    salary_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Bank, Cash, Cheque
    payroll_cost_center_id: Mapped[int | None] = mapped_column(ForeignKey("cost_centers.id"), nullable=True)
    benefits: Mapped[str | None] = mapped_column(String(500), nullable=True)  # free text notes

    # ---- Bank Details ----
    bank_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    bank_account_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    iban: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ---- Company Benefits ----
    medical_allow: Mapped[bool] = mapped_column(Boolean, default=False)
    medical_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    gratuity_allow: Mapped[bool] = mapped_column(Boolean, default=False)
    total_gratuity: Mapped[float | None] = mapped_column(Float, nullable=True)
    consumed_gratuity_amount: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ---- Contact ----
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)  # company email
    personal_email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    preferred_contact_email: Mapped[str | None] = mapped_column(String(30), nullable=True)  # Personal Email / Company Email

    # ---- Address ----
    current_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_accommodation_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Owned, Rented
    permanent_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    permanent_accommodation_type: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ---- Emergency Contact ----
    emergency_contact_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    emergency_contact_relation: Mapped[str | None] = mapped_column(String(80), nullable=True)

    # ---- Attendance & Leaves ----
    allow_overtime: Mapped[bool] = mapped_column(Boolean, default=False)
    holiday_list_id: Mapped[int | None] = mapped_column(ForeignKey("holiday_lists.id"), nullable=True)

    # ---- Personal Details ----
    marital_status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Single, Married, Divorced, Widowed
    family_background: Mapped[str | None] = mapped_column(Text, nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    health_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ---- Health Insurance ----
    health_insurance_provider: Mapped[str | None] = mapped_column(String(150), nullable=True)
    health_insurance_no: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ---- Passport Details ----
    passport_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    passport_valid_upto: Mapped[date | None] = mapped_column(Date, nullable=True)
    passport_date_of_issue: Mapped[date | None] = mapped_column(Date, nullable=True)
    passport_place_of_issue: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ---- Profile ----
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ---- Exit ----
    resignation_letter_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    relieving_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    exit_interview_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    new_workplace: Mapped[str | None] = mapped_column(String(150), nullable=True)
    leave_encashed: Mapped[str | None] = mapped_column(String(10), nullable=True)  # Yes, No
    encashment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reason_for_leaving: Mapped[str | None] = mapped_column(Text, nullable=True)
    exit_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ---- System ----
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    biometric_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)  # attendance_device_id
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, inactive, on_leave, resigned
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    documents: Mapped[list["EmployeeDocument"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )


class EmployeeDocument(Base):
    """Uploaded files attached to an employee profile (CNIC copy, contract, certificates...)."""
    __tablename__ = "employee_documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    document_name: Mapped[str] = mapped_column(String(150))
    file_url: Mapped[str] = mapped_column(String(300))
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    employee: Mapped["Employee"] = relationship(back_populates="documents")
