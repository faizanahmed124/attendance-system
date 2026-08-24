from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundError, DuplicateError
from app.modules.employee.model import Employee, EmployeeDocument
from app.modules.employee.schema import EmployeeCreate, EmployeeUpdate


def list_employees(
    db: Session, skip: int = 0, limit: int = 100,
    department_id: int | None = None, company_id: int | None = None,
    status: str | None = None,
):
    query = db.query(Employee).options(joinedload(Employee.documents))
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if company_id:
        query = query.filter(Employee.company_id == company_id)
    if status:
        query = query.filter(Employee.status == status)
    return query.offset(skip).limit(limit).all()


def get_employee(db: Session, employee_id: int) -> Employee:
    employee = (
        db.query(Employee)
        .options(joinedload(Employee.documents))
        .filter(Employee.id == employee_id)
        .first()
    )
    if not employee:
        raise NotFoundError("Employee not found")
    return employee


def get_employee_by_biometric_id(db: Session, biometric_id: str) -> Employee | None:
    return db.query(Employee).filter(Employee.biometric_id == biometric_id).first()


def create_employee(db: Session, payload: EmployeeCreate) -> Employee:
    if db.query(Employee).filter(Employee.employee_code == payload.employee_code).first():
        raise DuplicateError("Employee code already exists")
    if db.query(Employee).filter(Employee.email == payload.email).first():
        raise DuplicateError("Employee with this email already exists")

    employee = Employee(**payload.model_dump())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


def update_employee(db: Session, employee_id: int, payload: EmployeeUpdate) -> Employee:
    employee = get_employee(db, employee_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(employee, field, value)
    db.commit()
    db.refresh(employee)
    return employee


def delete_employee(db: Session, employee_id: int) -> None:
    employee = get_employee(db, employee_id)
    db.delete(employee)
    db.commit()


def set_photo(db: Session, employee_id: int, photo_url: str) -> Employee:
    employee = get_employee(db, employee_id)
    employee.photo_url = photo_url
    db.commit()
    db.refresh(employee)
    return employee


# ---------- Documents ----------

def add_document(db: Session, employee_id: int, document_name: str, file_url: str) -> EmployeeDocument:
    get_employee(db, employee_id)  # 404s if employee doesn't exist
    doc = EmployeeDocument(employee_id=employee_id, document_name=document_name, file_url=file_url)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def list_documents(db: Session, employee_id: int):
    return db.query(EmployeeDocument).filter(EmployeeDocument.employee_id == employee_id).all()


def delete_document(db: Session, employee_id: int, document_id: int) -> None:
    doc = (
        db.query(EmployeeDocument)
        .filter(EmployeeDocument.id == document_id, EmployeeDocument.employee_id == employee_id)
        .first()
    )
    if not doc:
        raise NotFoundError("Document not found")
    db.delete(doc)
    db.commit()
