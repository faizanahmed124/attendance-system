from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.modules.department.model import Department
from app.modules.department.schema import DepartmentCreate, DepartmentUpdate


def list_departments(db: Session, skip: int = 0, limit: int = 100, company_id: int | None = None):
    query = db.query(Department)
    if company_id:
        query = query.filter(Department.company_id == company_id)
    return query.offset(skip).limit(limit).all()


def get_department(db: Session, department_id: int) -> Department:
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise NotFoundError("Department not found")
    return department


def create_department(db: Session, payload: DepartmentCreate) -> Department:
    department = Department(**payload.model_dump())
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


def update_department(db: Session, department_id: int, payload: DepartmentUpdate) -> Department:
    department = get_department(db, department_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(department, field, value)
    db.commit()
    db.refresh(department)
    return department


def delete_department(db: Session, department_id: int) -> None:
    department = get_department(db, department_id)
    db.delete(department)
    db.commit()
