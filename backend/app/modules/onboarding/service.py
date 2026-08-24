from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.modules.onboarding.model import (
    EmployeeOnboarding, OnboardingActivity, EmployeeSeparation, SeparationActivity,
)
from app.modules.onboarding.schema import (
    EmployeeOnboardingCreate, EmployeeOnboardingUpdate, ActivityUpdate,
    EmployeeSeparationCreate, EmployeeSeparationUpdate,
)


def _recompute_status(activities: list) -> str:
    if not activities:
        return "Pending"
    done = sum(1 for a in activities if a.is_completed)
    if done == 0:
        return "Pending"
    if done == len(activities):
        return "Completed"
    return "In Process"


# ---------- Employee Onboarding ----------

def list_onboardings(db: Session, employee_id: int | None = None):
    query = db.query(EmployeeOnboarding)
    if employee_id:
        query = query.filter(EmployeeOnboarding.employee_id == employee_id)
    return query.order_by(EmployeeOnboarding.created_at.desc()).all()


def get_onboarding(db: Session, onboarding_id: int) -> EmployeeOnboarding:
    row = db.query(EmployeeOnboarding).filter(EmployeeOnboarding.id == onboarding_id).first()
    if not row:
        raise NotFoundError("Employee onboarding not found")
    return row


def get_onboarding_activities(db: Session, onboarding_id: int):
    return (
        db.query(OnboardingActivity)
        .filter(OnboardingActivity.onboarding_id == onboarding_id)
        .order_by(OnboardingActivity.sort_order)
        .all()
    )


def create_onboarding(db: Session, payload: EmployeeOnboardingCreate) -> EmployeeOnboarding:
    onboarding = EmployeeOnboarding(
        employee_id=payload.employee_id, company_id=payload.company_id,
        boarding_date=payload.boarding_date or date.today(), notes=payload.notes,
    )
    db.add(onboarding)
    db.flush()

    for i, act in enumerate(payload.activities):
        db.add(OnboardingActivity(
            onboarding_id=onboarding.id, activity_name=act.activity_name,
            assigned_to=act.assigned_to, due_date=act.due_date,
            sort_order=act.sort_order if act.sort_order else i,
        ))

    db.commit()
    db.refresh(onboarding)
    return onboarding


def update_onboarding(db: Session, onboarding_id: int, payload: EmployeeOnboardingUpdate) -> EmployeeOnboarding:
    onboarding = get_onboarding(db, onboarding_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(onboarding, field, value)
    db.commit()
    db.refresh(onboarding)
    return onboarding


def toggle_onboarding_activity(db: Session, activity_id: int, payload: ActivityUpdate) -> OnboardingActivity:
    activity = db.query(OnboardingActivity).filter(OnboardingActivity.id == activity_id).first()
    if not activity:
        raise NotFoundError("Activity not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(activity, field, value)
    if activity.is_completed and not activity.completed_on:
        activity.completed_on = date.today()
    if not activity.is_completed:
        activity.completed_on = None

    db.commit()

    # auto-update the parent onboarding's overall status based on activity completion
    onboarding = get_onboarding(db, activity.onboarding_id)
    activities = get_onboarding_activities(db, onboarding.id)
    onboarding.boarding_status = _recompute_status(activities)
    db.commit()
    db.refresh(activity)
    return activity


def delete_onboarding(db: Session, onboarding_id: int) -> None:
    onboarding = get_onboarding(db, onboarding_id)
    db.query(OnboardingActivity).filter(OnboardingActivity.onboarding_id == onboarding_id).delete()
    db.delete(onboarding)
    db.commit()


# ---------- Employee Separation ----------

def list_separations(db: Session, employee_id: int | None = None):
    query = db.query(EmployeeSeparation)
    if employee_id:
        query = query.filter(EmployeeSeparation.employee_id == employee_id)
    return query.order_by(EmployeeSeparation.created_at.desc()).all()


def get_separation(db: Session, separation_id: int) -> EmployeeSeparation:
    row = db.query(EmployeeSeparation).filter(EmployeeSeparation.id == separation_id).first()
    if not row:
        raise NotFoundError("Employee separation not found")
    return row


def get_separation_activities(db: Session, separation_id: int):
    return (
        db.query(SeparationActivity)
        .filter(SeparationActivity.separation_id == separation_id)
        .order_by(SeparationActivity.sort_order)
        .all()
    )


def create_separation(db: Session, payload: EmployeeSeparationCreate) -> EmployeeSeparation:
    separation = EmployeeSeparation(
        employee_id=payload.employee_id, company_id=payload.company_id,
        resignation_letter_date=payload.resignation_letter_date or date.today(),
        relieving_date=payload.relieving_date, reason=payload.reason, notes=payload.notes,
    )
    db.add(separation)
    db.flush()

    for i, act in enumerate(payload.activities):
        db.add(SeparationActivity(
            separation_id=separation.id, activity_name=act.activity_name,
            assigned_to=act.assigned_to, due_date=act.due_date,
            sort_order=act.sort_order if act.sort_order else i,
        ))

    db.commit()
    db.refresh(separation)
    return separation


def update_separation(db: Session, separation_id: int, payload: EmployeeSeparationUpdate) -> EmployeeSeparation:
    separation = get_separation(db, separation_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(separation, field, value)
    db.commit()
    db.refresh(separation)
    return separation


def toggle_separation_activity(db: Session, activity_id: int, payload: ActivityUpdate) -> SeparationActivity:
    activity = db.query(SeparationActivity).filter(SeparationActivity.id == activity_id).first()
    if not activity:
        raise NotFoundError("Activity not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(activity, field, value)
    if activity.is_completed and not activity.completed_on:
        activity.completed_on = date.today()
    if not activity.is_completed:
        activity.completed_on = None

    db.commit()

    separation = get_separation(db, activity.separation_id)
    activities = get_separation_activities(db, separation.id)
    separation.boarding_status = _recompute_status(activities)
    db.commit()
    db.refresh(activity)
    return activity


def delete_separation(db: Session, separation_id: int) -> None:
    separation = get_separation(db, separation_id)
    db.query(SeparationActivity).filter(SeparationActivity.separation_id == separation_id).delete()
    db.delete(separation)
    db.commit()
