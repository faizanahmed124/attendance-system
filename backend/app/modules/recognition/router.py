from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission, get_current_user
from app.core.exceptions import BadRequestError
from app.modules.recognition import service
from app.modules.recognition.schema import RecognitionCreate, RecognitionOut, LeaderboardEntry

router = APIRouter(prefix="/api/recognition", tags=["Recognition"])


def _current_employee_id(db: Session, current_user) -> int:
    """Recognition is given/received by Employees, but the logged-in
    principal is a User - resolve the Employee record linked to this
    user's account (Employee.user_id), same link used elsewhere in the app."""
    from app.modules.employee.model import Employee
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise BadRequestError("Your account isn't linked to an Employee profile yet, so you can't give kudos.")
    return employee.id


@router.get("/", response_model=List[RecognitionOut])
def list_recognitions(
    employee_id: Optional[int] = None, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recognition", "read")),
):
    return service.list_recognitions(db, employee_id)


@router.post("/", response_model=RecognitionOut)
def create_recognition(
    payload: RecognitionCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recognition", "create")),
):
    given_by = _current_employee_id(db, current_user)
    return service.create_recognition(db, given_by, payload)


@router.delete("/{recognition_id}")
def delete_recognition(
    recognition_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("recognition", "delete")),
):
    given_by = _current_employee_id(db, current_user)
    service.delete_recognition(db, recognition_id, given_by)
    return {"message": "Recognition deleted successfully"}


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
def get_leaderboard(
    db: Session = Depends(get_db), current_user=Depends(require_permission("recognition", "read")),
):
    return service.get_leaderboard(db)
