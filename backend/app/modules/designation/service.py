from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, DuplicateError
from app.modules.designation.model import Designation
from app.modules.designation.schema import DesignationCreate, DesignationUpdate


def list_designations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Designation).offset(skip).limit(limit).all()


def get_designation(db: Session, designation_id: int) -> Designation:
    designation = db.query(Designation).filter(Designation.id == designation_id).first()
    if not designation:
        raise NotFoundError("Designation not found")
    return designation


def create_designation(db: Session, payload: DesignationCreate) -> Designation:
    if db.query(Designation).filter(Designation.title == payload.title).first():
        raise DuplicateError("Designation already exists")
    designation = Designation(**payload.model_dump())
    db.add(designation)
    db.commit()
    db.refresh(designation)
    return designation


def update_designation(db: Session, designation_id: int, payload: DesignationUpdate) -> Designation:
    designation = get_designation(db, designation_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(designation, field, value)
    db.commit()
    db.refresh(designation)
    return designation


def delete_designation(db: Session, designation_id: int) -> None:
    designation = get_designation(db, designation_id)
    db.delete(designation)
    db.commit()
