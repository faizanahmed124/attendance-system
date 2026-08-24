from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import get_current_user
from app.modules.notification import service
from app.modules.notification.schema import NotificationOut, UnreadCountOut

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/", response_model=List[NotificationOut])
def list_notifications(
    unread_only: bool = Query(False), limit: int = Query(30),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    return service.list_notifications(db, current_user.id, unread_only, limit)


@router.get("/unread-count", response_model=UnreadCountOut)
def get_unread_count(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return {"count": service.get_unread_count(db, current_user.id)}


@router.put("/{notification_id}/read", response_model=NotificationOut)
def mark_as_read(
    notification_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    return service.mark_as_read(db, notification_id, current_user.id)


@router.put("/mark-all-read")
def mark_all_as_read(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    count = service.mark_all_as_read(db, current_user.id)
    return {"marked_read": count}
