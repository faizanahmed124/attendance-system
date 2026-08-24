from typing import Optional

from pydantic import BaseModel, ConfigDict


class DepartmentCreate(BaseModel):
    name: str
    company_id: int
    parent_department_id: Optional[int] = None
    is_group: Optional[bool] = False
    is_active: Optional[bool] = True
    payroll_cost_center_id: Optional[int] = None
    leave_approver_id: Optional[int] = None
    expense_approver_id: Optional[int] = None
    shift_request_approver_id: Optional[int] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    company_id: Optional[int] = None
    parent_department_id: Optional[int] = None
    is_group: Optional[bool] = None
    is_active: Optional[bool] = None
    payroll_cost_center_id: Optional[int] = None
    leave_approver_id: Optional[int] = None
    expense_approver_id: Optional[int] = None
    shift_request_approver_id: Optional[int] = None


class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company_id: int
    parent_department_id: Optional[int] = None
    is_group: bool
    is_active: bool
    payroll_cost_center_id: Optional[int] = None
    leave_approver_id: Optional[int] = None
    expense_approver_id: Optional[int] = None
    shift_request_approver_id: Optional[int] = None
