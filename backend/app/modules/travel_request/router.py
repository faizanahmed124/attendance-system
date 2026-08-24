from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.travel_request import service
from app.modules.travel_request.schema import TravelRequestCreate, TravelRequestUpdate, TravelRequestOut

router = APIRouter(prefix="/api/travel-requests", tags=["Travel Request"])


@router.get("/", response_model=List[TravelRequestOut])
def list_travel_requests(
    employee_id: Optional[int] = None, status: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("employee", "read")),
):
    return service.list_travel_requests(db, employee_id, status)


@router.get("/{request_id}", response_model=TravelRequestOut)
def get_travel_request(
    request_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "read")),
):
    return service.get_travel_request(db, request_id)


@router.post("/", response_model=TravelRequestOut)
def create_travel_request(
    payload: TravelRequestCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "create")),
):
    return service.create_travel_request(db, payload)


@router.put("/{request_id}", response_model=TravelRequestOut)
def update_travel_request(
    request_id: int, payload: TravelRequestUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "write")),
):
    return service.update_travel_request(db, request_id, payload)


@router.delete("/{request_id}")
def delete_travel_request(
    request_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("employee", "delete")),
):
    service.delete_travel_request(db, request_id)
    return {"message": "Travel request deleted successfully"}
