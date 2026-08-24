from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.company import service
from app.modules.company.schema import CompanyCreate, CompanyUpdate, CompanyOut

router = APIRouter(prefix="/api/companies", tags=["Company"])


@router.get("/", response_model=List[CompanyOut])
def list_companies(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
    current_user=Depends(require_permission("company", "read")),
):
    return service.list_companies(db, skip, limit)


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(company_id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("company", "read"))):
    return service.get_company(db, company_id)


@router.post("/", response_model=CompanyOut)
def create_company(
    payload: CompanyCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("company", "create")),
):
    return service.create_company(db, payload)


@router.put("/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: int, payload: CompanyUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("company", "write")),
):
    return service.update_company(db, company_id, payload)


@router.delete("/{company_id}")
def delete_company(
    company_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("company", "delete")),
):
    service.delete_company(db, company_id)
    return {"message": "Company deleted successfully"}
