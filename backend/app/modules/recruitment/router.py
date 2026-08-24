from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.recruitment import service
from app.modules.recruitment.schema import (
    JobOpeningCreate, JobOpeningUpdate, JobOpeningOut,
    JobApplicantCreate, JobApplicantUpdate, JobApplicantOut,
    InterviewCreate, InterviewUpdate, InterviewOut,
    ConvertToEmployeeRequest,
)
from app.modules.employee.schema import EmployeeOut
from app.utils.file_storage import save_applicant_resume

router = APIRouter(prefix="/api/recruitment", tags=["Recruitment"])


# ---- Job Openings ----

@router.get("/job-openings", response_model=List[JobOpeningOut])
def list_job_openings(
    status: Optional[str] = None, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "read")),
):
    return service.list_job_openings(db, status)


@router.get("/job-openings/{job_opening_id}", response_model=JobOpeningOut)
def get_job_opening(
    job_opening_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "read")),
):
    return service.get_job_opening(db, job_opening_id)


@router.post("/job-openings", response_model=JobOpeningOut)
def create_job_opening(
    payload: JobOpeningCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "create")),
):
    return service.create_job_opening(db, payload)


@router.put("/job-openings/{job_opening_id}", response_model=JobOpeningOut)
def update_job_opening(
    job_opening_id: int, payload: JobOpeningUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "write")),
):
    return service.update_job_opening(db, job_opening_id, payload)


@router.delete("/job-openings/{job_opening_id}")
def delete_job_opening(
    job_opening_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "delete")),
):
    service.delete_job_opening(db, job_opening_id)
    return {"message": "Job opening deleted successfully"}


# ---- Job Applicants ----

@router.get("/applicants", response_model=List[JobApplicantOut])
def list_applicants(
    job_opening_id: Optional[int] = None, status: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("recruitment", "read")),
):
    return service.list_applicants(db, job_opening_id, status)


@router.get("/applicants/{applicant_id}", response_model=JobApplicantOut)
def get_applicant(
    applicant_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "read")),
):
    return service.get_applicant(db, applicant_id)


@router.post("/applicants", response_model=JobApplicantOut)
def create_applicant(
    payload: JobApplicantCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "create")),
):
    return service.create_applicant(db, payload)


@router.put("/applicants/{applicant_id}", response_model=JobApplicantOut)
def update_applicant(
    applicant_id: int, payload: JobApplicantUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "write")),
):
    return service.update_applicant(db, applicant_id, payload)


@router.delete("/applicants/{applicant_id}")
def delete_applicant(
    applicant_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "delete")),
):
    service.delete_applicant(db, applicant_id)
    return {"message": "Applicant deleted successfully"}


@router.post("/applicants/{applicant_id}/resume", response_model=JobApplicantOut)
def upload_resume(
    applicant_id: int, file: UploadFile = File(...), db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "write")),
):
    resume_url = save_applicant_resume(file, applicant_id)
    return service.set_resume(db, applicant_id, resume_url)


# ---- Interviews ----

@router.post("/applicants/{applicant_id}/interviews", response_model=InterviewOut)
def add_interview(
    applicant_id: int, payload: InterviewCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "write")),
):
    return service.add_interview(db, applicant_id, payload)


@router.put("/applicants/{applicant_id}/interviews/{interview_id}", response_model=InterviewOut)
def update_interview(
    applicant_id: int, interview_id: int, payload: InterviewUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "write")),
):
    return service.update_interview(db, applicant_id, interview_id, payload)


@router.delete("/applicants/{applicant_id}/interviews/{interview_id}")
def delete_interview(
    applicant_id: int, interview_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "write")),
):
    service.delete_interview(db, applicant_id, interview_id)
    return {"message": "Interview deleted successfully"}


# ---- Convert to Employee (end of the pipeline) ----

@router.post("/applicants/{applicant_id}/convert-to-employee", response_model=EmployeeOut)
def convert_to_employee(
    applicant_id: int, payload: ConvertToEmployeeRequest, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recruitment", "write")),
):
    return service.convert_to_employee(db, applicant_id, payload)
