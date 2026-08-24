from sqlalchemy import String, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# Every module/doctype that can be permission-controlled.
# Keep this list in sync with the routers registered in main.py.
MODULES = [
    "company", "department", "designation", "employee",
    "holiday", "attendance", "accounts", "user", "permission",
    "recruitment", "integration", "payroll", "system_settings",
    "loan",
    "leave",
    "recognition",
    "helpdesk",
    "reports",
]

ACTIONS = ["read", "create", "write", "delete"]


class RolePermission(Base):
    """
    One row = what a given role can do on a given module.
    e.g. role='hr_manager', module='employee', can_read=True, can_create=True,
         can_write=True, can_delete=False
    """
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role", "module", name="uq_role_module"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    role: Mapped[str] = mapped_column(String(50), index=True)
    module: Mapped[str] = mapped_column(String(50), index=True)

    can_read: Mapped[bool] = mapped_column(Boolean, default=False)
    can_create: Mapped[bool] = mapped_column(Boolean, default=False)
    can_write: Mapped[bool] = mapped_column(Boolean, default=False)
    can_delete: Mapped[bool] = mapped_column(Boolean, default=False)
