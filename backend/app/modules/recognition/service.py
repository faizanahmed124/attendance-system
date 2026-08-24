from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.exceptions import NotFoundError, BadRequestError
from app.modules.recognition.model import Recognition
from app.modules.recognition.schema import RecognitionCreate

CATEGORIES = ["Teamwork", "Innovation", "Leadership", "Customer Focus", "Above & Beyond"]


def list_recognitions(db: Session, employee_id: int | None = None, limit: int = 50):
    query = db.query(Recognition)
    if employee_id:
        query = query.filter(Recognition.given_to == employee_id)
    return query.order_by(Recognition.created_at.desc()).limit(limit).all()


def create_recognition(db: Session, given_by: int, payload: RecognitionCreate) -> Recognition:
    if payload.category not in CATEGORIES:
        raise BadRequestError(f"category must be one of: {CATEGORIES}")
    if given_by == payload.given_to:
        raise BadRequestError("You can't give yourself kudos")

    recognition = Recognition(given_by=given_by, given_to=payload.given_to, category=payload.category, message=payload.message)
    db.add(recognition)
    db.commit()
    db.refresh(recognition)

    # notify the recipient - best-effort, never blocks giving kudos if it fails
    try:
        from app.modules.employee.model import Employee
        from app.modules.notification.service import create_notification

        giver = db.query(Employee).filter(Employee.id == given_by).first()
        recipient = db.query(Employee).filter(Employee.id == payload.given_to).first()
        if recipient and recipient.user_id:
            create_notification(
                db, recipient.user_id,
                title=f"🎉 Kudos from {giver.full_name if giver else 'a colleague'}",
                message=f"\"{payload.message}\" ({payload.category})",
                link="/recognition", notification_type="recognition",
            )
    except Exception:  # noqa: BLE001 - a notification failure must never block the kudos itself
        pass

    return recognition


def delete_recognition(db: Session, recognition_id: int, current_employee_id: int) -> None:
    row = db.query(Recognition).filter(Recognition.id == recognition_id).first()
    if not row:
        raise NotFoundError("Recognition not found")
    if row.given_by != current_employee_id:
        raise BadRequestError("You can only delete kudos you gave yourself")
    db.delete(row)
    db.commit()


def get_leaderboard(db: Session, limit: int = 10):
    rows = (
        db.query(Recognition.given_to, func.count(Recognition.id).label("kudos_received"))
        .group_by(Recognition.given_to)
        .order_by(func.count(Recognition.id).desc())
        .limit(limit)
        .all()
    )
    return [{"employee_id": r[0], "kudos_received": r[1]} for r in rows]
