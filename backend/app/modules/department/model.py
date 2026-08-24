from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    parent_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)

    is_group: Mapped[bool] = mapped_column(Boolean, default=False)  # can have sub-departments, matches the Chart of Accounts tree pattern
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    payroll_cost_center_id: Mapped[int | None] = mapped_column(ForeignKey("cost_centers.id"), nullable=True)

    # single approver per role, matching Employee's own approver fields -
    # Frappe supports multiple approvers per department via a child table,
    # simplified to one each here
    leave_approver_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    expense_approver_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    shift_request_approver_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)

    # was already a column on the real table (NOT NULL) from before the
    # restructure - the earlier version of this file accidentally left it
    # out, which is exactly what caused the "NOT NULL constraint failed:
    # departments.created_at" error on create
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )