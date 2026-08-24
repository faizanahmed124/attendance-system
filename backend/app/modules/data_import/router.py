from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import get_current_user
from app.core.exceptions import NotFoundError
from app.core.csv_tools import export_to_csv, csv_response, parse_csv, clean_row, ImportResult
from app.modules.permission.service import has_permission
from app.modules.data_import.registry import DOCTYPE_REGISTRY

router = APIRouter(prefix="/api/data-import", tags=["Data Import"])


def _get_doctype_config(doctype: str) -> dict:
    config = DOCTYPE_REGISTRY.get(doctype)
    if not config:
        raise NotFoundError(f"Unknown doctype '{doctype}'")
    return config


def _check_permission(db: Session, current_user, doctype: str, action: str):
    module = DOCTYPE_REGISTRY[doctype]["permission_module"]
    if not has_permission(db, current_user.role, module, action):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your role does not have '{action}' access to {DOCTYPE_REGISTRY[doctype]['label']}",
        )


@router.get("/doctypes")
def list_doctypes(current_user=Depends(get_current_user)):
    return [{"key": k, "label": v["label"]} for k, v in DOCTYPE_REGISTRY.items()]


@router.get("/doctypes/{doctype}/fields")
def get_doctype_fields(doctype: str, current_user=Depends(get_current_user)):
    config = _get_doctype_config(doctype)
    return config["fields"]


@router.get("/doctypes/{doctype}/template")
def download_template(
    doctype: str, fields: str, db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    """fields = comma-separated field names to include as columns in the blank template."""
    config = _get_doctype_config(doctype)
    _check_permission(db, current_user, doctype, "read")

    field_names = [f.strip() for f in fields.split(",") if f.strip()]
    valid_names = {f["name"] for f in config["fields"]}
    field_names = [f for f in field_names if f in valid_names] or [f["name"] for f in config["fields"]]

    csv_text = ",".join(field_names) + "\n"
    return csv_response(csv_text, f"{doctype}_template.csv")


@router.get("/doctypes/{doctype}/export")
def export_doctype_data(
    doctype: str, fields: str, db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    """fields = comma-separated field names to include as columns in the export."""
    config = _get_doctype_config(doctype)
    _check_permission(db, current_user, doctype, "read")

    field_names = [f.strip() for f in fields.split(",") if f.strip()]
    valid_names = {f["name"] for f in config["fields"]}
    field_names = [f for f in field_names if f in valid_names] or [f["name"] for f in config["fields"]]

    rows = db.query(config["model"]).all()
    csv_text = export_to_csv(rows, field_names)
    return csv_response(csv_text, f"{doctype}.csv")


@router.post("/doctypes/{doctype}/import")
async def import_doctype_data(
    doctype: str, file: UploadFile = File(...), db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    config = _get_doctype_config(doctype)
    _check_permission(db, current_user, doctype, "create")

    model = config["model"]
    create_schema = config["create_schema"]
    update_schema = config["update_schema"]
    unique_field = config["unique_field"]

    int_fields = [f["name"] for f in config["fields"] if f["type"] == "int"]
    float_fields = [f["name"] for f in config["fields"] if f["type"] == "float"]
    bool_fields = [f["name"] for f in config["fields"] if f["type"] == "bool"]

    text = (await file.read()).decode("utf-8-sig")
    rows = parse_csv(text)
    result = ImportResult()

    for i, row in enumerate(rows, start=2):  # row 1 is the header
        try:
            cleaned = clean_row(row, int_fields=int_fields, float_fields=float_fields)
            for bf in bool_fields:
                if cleaned.get(bf) is not None:
                    cleaned[bf] = str(cleaned[bf]).strip().lower() in ("true", "1", "yes")

            existing = None
            if cleaned.get(unique_field) is not None:
                existing = db.query(model).filter(
                    getattr(model, unique_field) == cleaned.get(unique_field)
                ).first()

            if existing and update_schema:
                payload = update_schema(**{k: v for k, v in cleaned.items() if k in update_schema.model_fields})
                for field, value in payload.model_dump(exclude_unset=True).items():
                    setattr(existing, field, value)
                result.updated += 1
            elif not existing:
                payload = create_schema(**{k: v for k, v in cleaned.items() if k in create_schema.model_fields})
                db.add(model(**payload.model_dump()))
                result.created += 1
            else:
                result.errors.append({"row": i, "error": f"Record already exists and this doctype doesn't support updates via import"})
        except Exception as e:
            result.errors.append({"row": i, "error": str(e)})

    db.commit()
    return result.as_dict()
