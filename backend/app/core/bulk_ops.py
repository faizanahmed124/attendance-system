"""
Generic bulk-edit helper, reusable across every module.

Usage in any router:

    from app.core.bulk_ops import bulk_update_fields, BulkUpdateRequest

    ALLOWED_BULK_FIELDS = {"status", "department_id"}  # whatever is safe to mass-edit

    @router.post("/bulk-update")
    def bulk_update_employees(payload: BulkUpdateRequest, db=Depends(get_db), ...):
        updates = {k: v for k, v in payload.updates.items() if k in ALLOWED_BULK_FIELDS}
        if not updates:
            raise BadRequestError("No editable fields in this request")
        count = bulk_update_fields(db, Employee, payload.ids, updates)
        return {"updated": count}

Deliberately does NOT run each row through its module's service.py business
logic (that would mean N individual UPDATE statements plus side effects) -
it's a single fast SQL UPDATE ... WHERE id IN (...). That's why callers
must pass an explicit allow-list of fields: only allow bulk-editing plain
scalar fields that don't trigger side effects elsewhere (e.g. don't allow
bulk-editing Employee.shift_type_id, since that field is meant to be
derived from ShiftAssignment, not set directly).
"""
from typing import Any

from pydantic import BaseModel
from sqlalchemy.orm import Session


class BulkUpdateRequest(BaseModel):
    ids: list[int]
    updates: dict[str, Any]


def bulk_update_fields(db: Session, model, ids: list[int], updates: dict) -> int:
    if not ids or not updates:
        return 0
    count = (
        db.query(model)
        .filter(model.id.in_(ids))
        .update(updates, synchronize_session=False)
    )
    db.commit()
    return count


def bulk_delete(db: Session, model, ids: list[int]) -> int:
    if not ids:
        return 0
    count = db.query(model).filter(model.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return count
