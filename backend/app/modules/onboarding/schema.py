from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


# ---------- shared activity shapes ----------

class ActivityCreate(BaseModel):
    activity_name: str
    assigned_to: Optional[int] = None
    due_date: Optional[date] = None
    sort_order: Optional[int] = 0


class ActivityUpdate(BaseModel):
    is_completed: Optional[bool] = None
    completed_on: Optional[date] = None


class OnboardingActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    onboarding_id: int
    activity_name: str
    assigned_to: Optional[int] = None
    due_date: Optional[date] = None
    is_completed: bool
    completed_on: Optional[date] = None
    sort_order: int


class SeparationActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    separation_id: int
    activity_name: str
    assigned_to: Optional[int] = None
    due_date: Optional[date] = None
    is_completed: bool
    completed_on: Optional[date] = None
    sort_order: int


# ---------- Employee Onboarding ----------

class EmployeeOnboardingCreate(BaseModel):
    employee_id: int
    company_id: int
    boarding_date: Optional[date] = None
    notes: Optional[str] = None
    activities: List[ActivityCreate] = []


class EmployeeOnboardingUpdate(BaseModel):
    boarding_status: Optional[str] = None
    notes: Optional[str] = None


class EmployeeOnboardingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    company_id: int
    boarding_date: date
    boarding_status: str
    notes: Optional[str] = None
    created_at: datetime
    activities: List[OnboardingActivityOut] = []


# ---------- Employee Separation ----------

class EmployeeSeparationCreate(BaseModel):
    employee_id: int
    company_id: int
    resignation_letter_date: Optional[date] = None
    relieving_date: Optional[date] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    activities: List[ActivityCreate] = []


class EmployeeSeparationUpdate(BaseModel):
    boarding_status: Optional[str] = None
    relieving_date: Optional[date] = None
    exit_interview_held: Optional[bool] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class EmployeeSeparationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    company_id: int
    resignation_letter_date: date
    relieving_date: Optional[date] = None
    reason: Optional[str] = None
    exit_interview_held: bool
    boarding_status: str
    notes: Optional[str] = None
    created_at: datetime
    activities: List[SeparationActivityOut] = []
