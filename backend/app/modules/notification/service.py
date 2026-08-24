"""
Generic notification service - any other module can call
create_notification() to alert a user, without needing to know anything
about how notifications are displayed.

Usage from another module's service.py:

    from app.modules.notification.service import create_notification

    create_notification(
        db, user_id=some_user.id,
        title="Leave Approved",
        message=f"Your leave request for {app.from_date} was approved.",
        link=f"/leaves/applications/{app.id}",
        notification_type="leave",
    )

Deliberately takes a `user_id` (not employee_id) since notifications are
tied to the login account - if you only have an employee_id, look up
Employee.user_id first and skip notifying if it's None (not every
employee necessarily has a linked login).
"""
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, BadRequestError
from app.modules.notification.model import Notification


def create_notification(
    db: Session, user_id: int, title: str, message: str,
    link: str | None = None, notification_type: str = "general",
) -> Notification:
    notification = Notification(
        user_id=user_id, title=title, message=message, link=link, notification_type=notification_type,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def list_notifications(db: Session, user_id: int, unread_only: bool = False, limit: int = 30):
    query = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))
    return query.order_by(Notification.created_at.desc()).limit(limit).all()


def get_unread_count(db: Session, user_id: int) -> int:
    return db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read.is_(False)).count()


def mark_as_read(db: Session, notification_id: int, user_id: int) -> Notification:
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise NotFoundError("Notification not found")
    if notification.user_id != user_id:
        raise BadRequestError("You can only mark your own notifications as read")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_as_read(db: Session, user_id: int) -> int:
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .update({"is_read": True})
    )
    db.commit()
    return count
