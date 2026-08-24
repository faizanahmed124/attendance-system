from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.onboarding import service
from app.modules.onboarding.schema import (
    EmployeeOnboardingCreate, EmployeeOnboardingUpdate, EmployeeOnboardingOut,
    EmployeeSeparationCreate, EmployeeSeparationUpdate, EmployeeSeparationOut,
    ActivityUpdate, OnboardingActivityOut, SeparationActivityOut,
)

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding & Offboarding"])


# ---- Employee Onboarding ----

@router.get("/onboardings", response_model=List[EmployeeOnboardingOut])
def list_onboardings(
    employee_id: Optional[int] = None, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "read")),
):
    rows = service.list_onboardings(db, employee_id)
    for r in rows:
        r.activities = service.get_onboarding_activities(db, r.id)
    return rows


@router.get("/onboardings/{onboarding_id}", response_model=EmployeeOnboardingOut)
def get_onboarding(
    onboarding_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "read")),
):
    row = service.get_onboarding(db, onboarding_id)
    row.activities = service.get_onboarding_activities(db, onboarding_id)
    return row


@router.post("/onboardings", response_model=EmployeeOnboardingOut)
def create_onboarding(
    payload: EmployeeOnboardingCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "create")),
):
    row = service.create_onboarding(db, payload)
    row.activities = service.get_onboarding_activities(db, row.id)
    return row


@router.put("/onboardings/{onboarding_id}", response_model=EmployeeOnboardingOut)
def update_onboarding(
    onboarding_id: int, payload: EmployeeOnboardingUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "write")),
):
    row = service.update_onboarding(db, onboarding_id, payload)
    row.activities = service.get_onboarding_activities(db, onboarding_id)
    return row


@router.delete("/onboardings/{onboarding_id}")
def delete_onboarding(
    onboarding_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "delete")),
):
    service.delete_onboarding(db, onboarding_id)
    return {"message": "Onboarding deleted successfully"}


@router.put("/onboarding-activities/{activity_id}", response_model=OnboardingActivityOut)
def toggle_onboarding_activity(
    activity_id: int, payload: ActivityUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "write")),
):
    return service.toggle_onboarding_activity(db, activity_id, payload)


# ---- Employee Separation ----

@router.get("/separations", response_model=List[EmployeeSeparationOut])
def list_separations(
    employee_id: Optional[int] = None, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "read")),
):
    rows = service.list_separations(db, employee_id)
    for r in rows:
        r.activities = service.get_separation_activities(db, r.id)
    return rows


@router.get("/separations/{separation_id}", response_model=EmployeeSeparationOut)
def get_separation(
    separation_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "read")),
):
    row = service.get_separation(db, separation_id)
    row.activities = service.get_separation_activities(db, separation_id)
    return row


@router.post("/separations", response_model=EmployeeSeparationOut)
def create_separation(
    payload: EmployeeSeparationCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "create")),
):
    row = service.create_separation(db, payload)
    row.activities = service.get_separation_activities(db, row.id)
    return row


@router.put("/separations/{separation_id}", response_model=EmployeeSeparationOut)
def update_separation(
    separation_id: int, payload: EmployeeSeparationUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "write")),
):
    row = service.update_separation(db, separation_id, payload)
    row.activities = service.get_separation_activities(db, separation_id)
    return row


@router.delete("/separations/{separation_id}")
def delete_separation(
    separation_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "delete")),
):
    service.delete_separation(db, separation_id)
    return {"message": "Separation deleted successfully"}


@router.put("/separation-activities/{activity_id}", response_model=SeparationActivityOut)
def toggle_separation_activity(
    activity_id: int, payload: ActivityUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "write")),
):
    return service.toggle_separation_activity(db, activity_id, payload)
