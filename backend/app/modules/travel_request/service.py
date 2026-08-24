from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.modules.travel_request.model import TravelRequest
from app.modules.travel_request.schema import TravelRequestCreate, TravelRequestUpdate


def list_travel_requests(db: Session, employee_id: int | None = None, status: str | None = None):
    query = db.query(TravelRequest)
    if employee_id:
        query = query.filter(TravelRequest.employee_id == employee_id)
    if status:
        query = query.filter(TravelRequest.status == status)
    return query.order_by(TravelRequest.created_at.desc()).all()


def get_travel_request(db: Session, request_id: int) -> TravelRequest:
    row = db.query(TravelRequest).filter(TravelRequest.id == request_id).first()
    if not row:
        raise NotFoundError("Travel request not found")
    return row


def create_travel_request(db: Session, payload: TravelRequestCreate) -> TravelRequest:
    request = TravelRequest(**payload.model_dump())
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def update_travel_request(db: Session, request_id: int, payload: TravelRequestUpdate) -> TravelRequest:
    request = get_travel_request(db, request_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(request, field, value)
    db.commit()
    db.refresh(request)
    return request


def delete_travel_request(db: Session, request_id: int) -> None:
    request = get_travel_request(db, request_id)
    db.delete(request)
    db.commit()
