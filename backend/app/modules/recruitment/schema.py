from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict


# ---------- Job Opening ----------

class JobOpeningCreate(BaseModel):
    title: str
    company_id: int
    department_id: int
    designation_id: int
    positions: Optional[int] = 1
    description: Optional[str] = None
    status: Optional[str] = "Open"


class JobOpeningUpdate(BaseModel):
    title: Optional[str] = None
    positions: Optional[int] = None
    description: Optional[str] = None
    status: Optional[str] = None


class JobOpeningOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    company_id: int
    department_id: int
    designation_id: int
    positions: int
    description: Optional[str] = None
    status: str
    created_at: datetime


# ---------- Interview ----------

class InterviewCreate(BaseModel):
    round_name: str
    scheduled_on: datetime
    interviewer_name: Optional[str] = None
    status: Optional[str] = "Scheduled"
    feedback: Optional[str] = None


class InterviewUpdate(BaseModel):
    round_name: Optional[str] = None
    scheduled_on: Optional[datetime] = None
    interviewer_name: Optional[str] = None
    status: Optional[str] = None
    feedback: Optional[str] = None


class InterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_applicant_id: int
    round_name: str
    scheduled_on: datetime
    interviewer_name: Optional[str] = None
    status: str
    feedback: Optional[str] = None
    created_at: datetime


# ---------- Job Applicant ----------

class JobApplicantCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    job_opening_id: int
    applied_date: Optional[date] = None
    expected_salary: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = "Open"


class JobApplicantUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    expected_salary: Optional[float] = None
    offered_salary: Optional[float] = None
    offer_date: Optional[date] = None
    notes: Optional[str] = None


class JobApplicantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    resume_url: Optional[str] = None
    job_opening_id: int
    applied_date: date
    status: str
    expected_salary: Optional[float] = None
    offered_salary: Optional[float] = None
    offer_date: Optional[date] = None
    employee_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    interviews: List[InterviewOut] = []


class ConvertToEmployeeRequest(BaseModel):
    employee_code: str
    date_of_joining: date
    branch: Optional[str] = None
    employment_type: Optional[str] = None
    salary: Optional[float] = None
