from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.data_import import service

router = APIRouter(prefix="/api/data-import", tags=["Data Import"])


@router.get("/doctypes")
def list_doctypes(current_user=Depends(require_permission("system_settings", "read"))):
    """All importable doctypes with their field definitions (label, type, required) - drives the frontend UI."""
    return service.list_doctypes()


@router.get("/{doctype_key}/template", response_class=PlainTextResponse)
def download_template(
    doctype_key: str, db: Session = Depends(get_db),
    current_user=Depends(require_permission("system_settings", "read")),
):
    """A blank CSV with just the correct column headers (readable names, never raw IDs)."""
    return service.generate_template_csv(doctype_key)


@router.get("/{doctype_key}/export", response_class=PlainTextResponse)
def export_data(
    doctype_key: str, db: Session = Depends(get_db),
    current_user=Depends(require_permission("system_settings", "read")),
):
    """Every existing record for this doctype, with lookup IDs resolved back to names."""
    return service.export_csv(db, doctype_key)


@router.post("/{doctype_key}/import")
async def import_data(
    doctype_key: str, file: UploadFile = File(...), db: Session = Depends(get_db),
    current_user=Depends(require_permission("system_settings", "write")),
):
    """
    Upload a CSV matching the template's column headers. Each row is
    processed and committed independently - one bad row (e.g. a
    misspelled Company name) is reported as an error but never blocks
    the rest of the file from importing.
    """
    content = (await file.read()).decode("utf-8-sig")  # utf-8-sig strips Excel's BOM if present
    return service.import_csv(db, doctype_key, content)
