import uuid
from pathlib import Path

from fastapi import UploadFile, HTTPException

# backend/uploads/  (served at /uploads/... via StaticFiles in main.py)
UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent / "uploads"

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_DOCUMENT_TYPES = {
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_SIZE_MB = 10


def _save(file: UploadFile, subfolder: str, allowed_types: set[str]) -> str:
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large (max {MAX_FILE_SIZE_MB}MB)")

    target_dir = UPLOAD_ROOT / subfolder
    target_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix
    unique_name = f"{uuid.uuid4().hex}{ext}"
    target_path = target_dir / unique_name

    with open(target_path, "wb") as f:
        f.write(contents)

    return f"/uploads/{subfolder}/{unique_name}"


def save_employee_photo(file: UploadFile, employee_id: int) -> str:
    return _save(file, f"employees/{employee_id}/photo", ALLOWED_IMAGE_TYPES)


def save_employee_document(file: UploadFile, employee_id: int) -> str:
    return _save(file, f"employees/{employee_id}/documents", ALLOWED_DOCUMENT_TYPES)


def save_applicant_resume(file: UploadFile, applicant_id: int) -> str:
    return _save(file, f"recruitment/applicants/{applicant_id}/resume", ALLOWED_DOCUMENT_TYPES)
