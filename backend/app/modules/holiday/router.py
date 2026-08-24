from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.holiday import service
from app.modules.holiday.schema import (
    HolidayListCreate, HolidayListUpdate, HolidayListOut, HolidayItem,
)

router = APIRouter(prefix="/api/holiday-lists", tags=["Holiday"])


@router.get("/", response_model=List[HolidayListOut])
def list_holiday_lists(
    skip: int = 0, limit: int = 100, company_id: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("holiday", "read")),
):
    return service.list_holiday_lists(db, skip, limit, company_id)


@router.get("/{holiday_list_id}", response_model=HolidayListOut)
def get_holiday_list(holiday_list_id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("holiday", "read"))):
    return service.get_holiday_list(db, holiday_list_id)


@router.post("/", response_model=HolidayListOut)
def create_holiday_list(
    payload: HolidayListCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("holiday", "create")),
):
    return service.create_holiday_list(db, payload)


@router.post("/{holiday_list_id}/holidays", response_model=HolidayListOut)
def add_holiday(
    holiday_list_id: int, item: HolidayItem, db: Session = Depends(get_db),
    current_user=Depends(require_permission("holiday", "write")),
):
    return service.add_holiday(db, holiday_list_id, item)


@router.put("/{holiday_list_id}", response_model=HolidayListOut)
def update_holiday_list(
    holiday_list_id: int, payload: HolidayListUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("holiday", "write")),
):
    return service.update_holiday_list(db, holiday_list_id, payload)


@router.delete("/{holiday_list_id}")
def delete_holiday_list(
    holiday_list_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("holiday", "delete")),
):
    service.delete_holiday_list(db, holiday_list_id)
    return {"message": "Holiday list deleted successfully"}
