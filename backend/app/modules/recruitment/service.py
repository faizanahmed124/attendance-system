from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundError, DuplicateError, BadRequestError
from app.modules.recruitment.model import JobOpening, JobApplicant, Interview
from app.modules.recruitment.schema import (
    JobOpeningCreate, JobOpeningUpdate,
    JobApplicantCreate, JobApplicantUpdate,
    InterviewCreate, InterviewUpdate,
    ConvertToEmployeeRequest,
)
from app.modules.employee.model import Employee


# ---------- Job Opening ----------

def list_job_openings(db: Session, status: str | None = None):
    query = db.query(JobOpening)
    if status:
        query = query.filter(JobOpening.status == status)
    return query.order_by(JobOpening.created_at.desc()).all()


def get_job_opening(db: Session, job_opening_id: int) -> JobOpening:
    job_opening = db.query(JobOpening).filter(JobOpening.id == job_opening_id).first()
    if not job_opening:
        raise NotFoundError("Job opening not found")
    return job_opening


def create_job_opening(db: Session, payload: JobOpeningCreate) -> JobOpening:
    job_opening = JobOpening(**payload.model_dump())
    db.add(job_opening)
    db.commit()
    db.refresh(job_opening)
    return job_opening


def update_job_opening(db: Session, job_opening_id: int, payload: JobOpeningUpdate) -> JobOpening:
    job_opening = get_job_opening(db, job_opening_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job_opening, field, value)
    db.commit()
    db.refresh(job_opening)
    return job_opening


def delete_job_opening(db: Session, job_opening_id: int) -> None:
    job_opening = get_job_opening(db, job_opening_id)
    db.delete(job_opening)
    db.commit()


# ---------- Job Applicant ----------

def list_applicants(db: Session, job_opening_id: int | None = None, status: str | None = None):
    query = db.query(JobApplicant).options(joinedload(JobApplicant.interviews))
    if job_opening_id:
        query = query.filter(JobApplicant.job_opening_id == job_opening_id)
    if status:
        query = query.filter(JobApplicant.status == status)
    return query.order_by(JobApplicant.created_at.desc()).all()


def get_applicant(db: Session, applicant_id: int) -> JobApplicant:
    applicant = (
        db.query(JobApplicant)
        .options(joinedload(JobApplicant.interviews))
        .filter(JobApplicant.id == applicant_id)
        .first()
    )
    if not applicant:
        raise NotFoundError("Applicant not found")
    return applicant


def create_applicant(db: Session, payload: JobApplicantCreate) -> JobApplicant:
    get_job_opening(db, payload.job_opening_id)  # 404s if invalid
    applicant = JobApplicant(**payload.model_dump(exclude_unset=True))
    db.add(applicant)
    db.commit()
    db.refresh(applicant)
    return applicant


def update_applicant(db: Session, applicant_id: int, payload: JobApplicantUpdate) -> JobApplicant:
    applicant = get_applicant(db, applicant_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(applicant, field, value)
    db.commit()
    db.refresh(applicant)
    return applicant


def delete_applicant(db: Session, applicant_id: int) -> None:
    applicant = get_applicant(db, applicant_id)
    db.delete(applicant)
    db.commit()


def set_resume(db: Session, applicant_id: int, resume_url: str) -> JobApplicant:
    applicant = get_applicant(db, applicant_id)
    applicant.resume_url = resume_url
    db.commit()
    db.refresh(applicant)
    return applicant


# ---------- Interview ----------

def add_interview(db: Session, applicant_id: int, payload: InterviewCreate) -> Interview:
    get_applicant(db, applicant_id)  # 404s if invalid
    interview = Interview(job_applicant_id=applicant_id, **payload.model_dump())
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


def update_interview(db: Session, applicant_id: int, interview_id: int, payload: InterviewUpdate) -> Interview:
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.job_applicant_id == applicant_id)
        .first()
    )
    if not interview:
        raise NotFoundError("Interview not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(interview, field, value)
    db.commit()
    db.refresh(interview)
    return interview


def delete_interview(db: Session, applicant_id: int, interview_id: int) -> None:
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.job_applicant_id == applicant_id)
        .first()
    )
    if not interview:
        raise NotFoundError("Interview not found")
    db.delete(interview)
    db.commit()


# ---------- Convert to Employee (the final step of the pipeline) ----------

def convert_to_employee(db: Session, applicant_id: int, payload: ConvertToEmployeeRequest) -> Employee:
    applicant = get_applicant(db, applicant_id)

    if applicant.employee_id:
        raise BadRequestError("This applicant has already been converted to an employee")

    if db.query(Employee).filter(Employee.employee_code == payload.employee_code).first():
        raise DuplicateError("Employee code already exists")
    if db.query(Employee).filter(Employee.email == applicant.email).first():
        raise DuplicateError("An employee with this email already exists")

    job_opening = get_job_opening(db, applicant.job_opening_id)

    employee = Employee(
        employee_code=payload.employee_code,
        full_name=applicant.full_name,
        email=applicant.email,
        phone=applicant.phone,
        company_id=job_opening.company_id,
        department_id=job_opening.department_id,
        designation_id=job_opening.designation_id,
        branch=payload.branch,
        employment_type=payload.employment_type,
        date_of_joining=payload.date_of_joining,
        salary=payload.salary or applicant.offered_salary,
        status="active",
    )
    db.add(employee)
    db.flush()  # get employee.id before committing

    applicant.employee_id = employee.id
    applicant.status = "Hired"

    db.commit()
    db.refresh(employee)
    return employee
