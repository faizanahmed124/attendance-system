from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateError, NotFoundError
from app.modules.company.model import Company
from app.modules.company.schema import CompanyCreate, CompanyUpdate


def list_companies(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Company).offset(skip).limit(limit).all()


def get_company(db: Session, company_id: int) -> Company:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise NotFoundError("Company not found")
    return company


def create_company(db: Session, payload: CompanyCreate) -> Company:
    if db.query(Company).filter(Company.name == payload.name).first():
        raise DuplicateError("Company with this name already exists")

    company = Company(**payload.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def update_company(db: Session, company_id: int, payload: CompanyUpdate) -> Company:
    company = get_company(db, company_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return company


def delete_company(db: Session, company_id: int) -> None:
    company = get_company(db, company_id)
    db.delete(company)
    db.commit()
