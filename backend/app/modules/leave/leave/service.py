from datetime import date

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.exceptions import NotFoundError, BadRequestError
from app.modules.leave.model import LeaveType, LeaveAllocation, LeaveApplication
from app.modules.leave.schema import (
    LeaveTypeCreate, LeaveTypeUpdate,
    LeaveAllocationCreate,
    LeaveApplicationCreate, LeaveApplicationUpdate,
)


def calculate_leave_days(from_date: date, to_date: date, half_day: bool) -> float:
    if half_day:
        return 0.5
    if to_date < from_date:
        raise BadRequestError("to_date can't be before from_date")
    return (to_date - from_date).days + 1  # inclusive of both ends


# ---------- Leave Type ----------

def list_leave_types(db: Session):
    return db.query(LeaveType).all()


def get_leave_type(db: Session, leave_type_id: int) -> LeaveType:
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not leave_type:
        raise NotFoundError("Leave type not found")
    return leave_type


def create_leave_type(db: Session, payload: LeaveTypeCreate) -> LeaveType:
    leave_type = LeaveType(**payload.model_dump())
    db.add(leave_type)
    db.commit()
    db.refresh(leave_type)
    return leave_type


def update_leave_type(db: Session, leave_type_id: int, payload: LeaveTypeUpdate) -> LeaveType:
    leave_type = get_leave_type(db, leave_type_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(leave_type, field, value)
    db.commit()
    db.refresh(leave_type)
    return leave_type


def delete_leave_type(db: Session, leave_type_id: int) -> None:
    leave_type = get_leave_type(db, leave_type_id)
    db.delete(leave_type)
    db.commit()


# ---------- Leave Allocation ----------

def list_leave_allocations(db: Session, employee_id: int | None = None):
    query = db.query(LeaveAllocation)
    if employee_id:
        query = query.filter(LeaveAllocation.employee_id == employee_id)
    return query.order_by(LeaveAllocation.created_at.desc()).all()


def get_leave_allocation(db: Session, allocation_id: int) -> LeaveAllocation:
    allocation = db.query(LeaveAllocation).filter(LeaveAllocation.id == allocation_id).first()
    if not allocation:
        raise NotFoundError("Leave allocation not found")
    return allocation


def create_leave_allocation(db: Session, payload: LeaveAllocationCreate) -> LeaveAllocation:
    get_leave_type(db, payload.leave_type_id)  # 404s if invalid
    allocation = LeaveAllocation(**payload.model_dump())
    db.add(allocation)
    db.commit()
    db.refresh(allocation)
    return allocation


def delete_leave_allocation(db: Session, allocation_id: int) -> None:
    allocation = get_leave_allocation(db, allocation_id)
    db.delete(allocation)
    db.commit()


# ---------- Leave balance ----------

def get_leave_balance_for_type(db: Session, employee_id: int, leave_type_id: int) -> dict:
    allocated_sum = (
        db.query(
            func.coalesce(func.sum(LeaveAllocation.total_leaves_allocated), 0.0),
            func.coalesce(func.sum(LeaveAllocation.carry_forwarded_leaves), 0.0),
        )
        .filter(LeaveAllocation.employee_id == employee_id, LeaveAllocation.leave_type_id == leave_type_id)
        .first()
    )
    allocated, carry_forwarded = allocated_sum

    taken = (
        db.query(func.coalesce(func.sum(LeaveApplication.total_leave_days), 0.0))
        .filter(
            LeaveApplication.employee_id == employee_id,
            LeaveApplication.leave_type_id == leave_type_id,
            LeaveApplication.status == "Approved",
        )
        .scalar()
    ) or 0.0

    return {
        "allocated": float(allocated),
        "carry_forwarded": float(carry_forwarded),
        "taken": float(taken),
        "balance": round(float(allocated) + float(carry_forwarded) - float(taken), 2),
    }


def get_leave_balance_report(db: Session, employee_id: int) -> list[dict]:
    """One row per Leave Type this employee has ANY allocation or application history for."""
    leave_type_ids = set()
    for row in db.query(LeaveAllocation.leave_type_id).filter(LeaveAllocation.employee_id == employee_id).distinct():
        leave_type_ids.add(row[0])
    for row in db.query(LeaveApplication.leave_type_id).filter(LeaveApplication.employee_id == employee_id).distinct():
        leave_type_ids.add(row[0])

    results = []
    for leave_type_id in leave_type_ids:
        leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
        if not leave_type:
            continue
        balance = get_leave_balance_for_type(db, employee_id, leave_type_id)
        results.append({
            "employee_id": employee_id,
            "leave_type_id": leave_type_id,
            "leave_type_name": leave_type.name,
            **balance,
        })
    return results


# ---------- Leave Application ----------

def list_leave_applications(db: Session, employee_id: int | None = None, status: str | None = None):
    query = db.query(LeaveApplication)
    if employee_id:
        query = query.filter(LeaveApplication.employee_id == employee_id)
    if status:
        query = query.filter(LeaveApplication.status == status)
    return query.order_by(LeaveApplication.created_at.desc()).all()


def get_leave_application(db: Session, application_id: int) -> LeaveApplication:
    application = db.query(LeaveApplication).filter(LeaveApplication.id == application_id).first()
    if not application:
        raise NotFoundError("Leave application not found")
    return application


def create_leave_application(db: Session, payload: LeaveApplicationCreate) -> LeaveApplication:
    leave_type = get_leave_type(db, payload.leave_type_id)
    days = calculate_leave_days(payload.from_date, payload.to_date, payload.half_day)

    # Leave-Without-Pay doesn't need a balance - it's an unpaid absence,
    # not something drawn from an allocated pool.
    if not leave_type.is_lwp:
        balance = get_leave_balance_for_type(db, payload.employee_id, payload.leave_type_id)
        if days > balance["balance"]:
            raise BadRequestError(
                f"Insufficient leave balance for '{leave_type.name}': "
                f"requesting {days} day(s), only {balance['balance']} available"
            )

    application = LeaveApplication(
        **payload.model_dump(),
        total_leave_days=days,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def update_leave_application(db: Session, application_id: int, payload: LeaveApplicationUpdate) -> LeaveApplication:
    application = get_leave_application(db, application_id)

    # re-validate balance at approval time too, in case other leaves were
    # approved in between the request being made and now
    if payload.status == "Approved" and application.status != "Approved":
        leave_type = get_leave_type(db, application.leave_type_id)
        if not leave_type.is_lwp:
            balance = get_leave_balance_for_type(db, application.employee_id, application.leave_type_id)
            if application.total_leave_days > balance["balance"]:
                raise BadRequestError(
                    f"Insufficient leave balance for '{leave_type.name}': "
                    f"this application needs {application.total_leave_days} day(s), "
                    f"only {balance['balance']} available"
                )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(application, field, value)
    db.commit()
    db.refresh(application)
    return application


def delete_leave_application(db: Session, application_id: int) -> None:
    application = get_leave_application(db, application_id)
    db.delete(application)
    db.commit()
