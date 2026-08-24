from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.designation import service
from app.modules.designation.schema import DesignationCreate, DesignationUpdate, DesignationOut

router = APIRouter(prefix="/api/designations", tags=["Designation"])


@router.get("/", response_model=List[DesignationOut])
def list_designations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(require_permission("designation", "read"))):
    return service.list_designations(db, skip, limit)


@router.get("/{designation_id}", response_model=DesignationOut)
def get_designation(designation_id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("designation", "read"))):
    return service.get_designation(db, designation_id)


@router.post("/", response_model=DesignationOut)
def create_designation(
    payload: DesignationCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("designation", "create")),
):
    return service.create_designation(db, payload)


@router.put("/{designation_id}", response_model=DesignationOut)
def update_designation(
    designation_id: int, payload: DesignationUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("designation", "write")),
):
    return service.update_designation(db, designation_id, payload)


@router.delete("/{designation_id}")
def delete_designation(
    designation_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("designation", "delete")),
):
    service.delete_designation(db, designation_id)
    return {"message": "Designation deleted successfully"}
