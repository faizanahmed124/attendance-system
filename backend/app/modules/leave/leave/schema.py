from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------- Leave Type ----------

class LeaveTypeCreate(BaseModel):
    name: str
    max_leaves_allowed: Optional[float] = 0
    is_carry_forward: Optional[bool] = False
    is_lwp: Optional[bool] = False
    is_encashable: Optional[bool] = False
    is_active: Optional[bool] = True


class LeaveTypeUpdate(BaseModel):
    name: Optional[str] = None
    max_leaves_allowed: Optional[float] = None
    is_carry_forward: Optional[bool] = None
    is_lwp: Optional[bool] = None
    is_encashable: Optional[bool] = None
    is_active: Optional[bool] = None


class LeaveTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    max_leaves_allowed: float
    is_carry_forward: bool
    is_lwp: bool
    is_encashable: bool
    is_active: bool


# ---------- Leave Allocation ----------

class LeaveAllocationCreate(BaseModel):
    employee_id: int
    leave_type_id: int
    from_date: date
    to_date: date
    total_leaves_allocated: float
    carry_forwarded_leaves: Optional[float] = 0


class LeaveAllocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    leave_type_id: int
    from_date: date
    to_date: date
    total_leaves_allocated: float
    carry_forwarded_leaves: float
    created_at: datetime


# ---------- Leave Application ----------

class LeaveApplicationCreate(BaseModel):
    employee_id: int
    leave_type_id: int
    from_date: date
    to_date: date
    half_day: Optional[bool] = False
    reason: Optional[str] = None


class LeaveApplicationUpdate(BaseModel):
    status: Optional[str] = None  # Open, Approved, Rejected
    reason: Optional[str] = None
    approved_by: Optional[int] = None


class LeaveApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    leave_type_id: int
    from_date: date
    to_date: date
    half_day: bool
    total_leave_days: float
    reason: Optional[str] = None
    posting_date: date
    status: str
    approved_by: Optional[int] = None
    created_at: datetime


# ---------- Leave Balance (report) ----------

class LeaveBalanceOut(BaseModel):
    employee_id: int
    leave_type_id: int
    leave_type_name: str
    allocated: float
    carry_forwarded: float
    taken: float
    balance: float
