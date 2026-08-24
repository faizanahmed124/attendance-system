"""
Generic CSV export/import helpers, reusable across every module.

Export usage (any router):

    from app.core.csv_tools import export_to_csv

    EXPORT_FIELDS = ["employee_code", "full_name", "email", "department_id"]

    @router.get("/export-csv")
    def export_csv(db=Depends(get_db), ...):
        rows = db.query(Employee).all()
        csv_text = export_to_csv(rows, EXPORT_FIELDS)
        return csv_response(csv_text, "employees.csv")

Import usage (any router) - deliberately goes THROUGH each module's own
Pydantic Create schema (so required-field validation and type coercion
still happen), then does a simple upsert keyed on one unique field:

    from app.core.csv_tools import parse_csv, ImportResult

    @router.post("/import-csv")
    async def import_csv(file: UploadFile, db=Depends(get_db), ...):
        text = (await file.read()).decode("utf-8-sig")
        rows = parse_csv(text)
        result = ImportResult()
        for i, row in enumerate(rows, start=2):  # row 1 is the header
            try:
                existing = db.query(Employee).filter(Employee.employee_code == row.get("employee_code")).first()
                payload = EmployeeCreate(**_coerce(row))
                if existing:
                    for field, value in payload.model_dump(exclude_unset=True).items():
                        setattr(existing, field, value)
                    result.updated += 1
                else:
                    db.add(Employee(**payload.model_dump()))
                    result.created += 1
            except Exception as e:
                result.errors.append({"row": i, "error": str(e)})
        db.commit()
        return result.as_dict()

CSV cells are always strings - each module's router is responsible for
converting the ones that need it (ints, floats, dates) before handing the
row to its Pydantic schema; see app/modules/employee/router.py for a
worked example with dates/floats/foreign keys.
"""
import csv
import io
from datetime import date, datetime
from typing import Any

from fastapi import Response


def export_to_csv(rows: list, fields: list[str]) -> str:
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()

    for row in rows:
        record = {}
        for field in fields:
            value = getattr(row, field, None)
            if isinstance(value, (date, datetime)):
                value = value.isoformat()
            record[field] = "" if value is None else value
        writer.writerow(record)

    return output.getvalue()


def csv_response(csv_text: str, filename: str) -> Response:
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def parse_csv(csv_text: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(csv_text))
    return [
        {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
        for row in reader
    ]


def clean_row(row: dict, int_fields: list[str] = None, float_fields: list[str] = None) -> dict:
    """
    Converts CSV's all-strings into the right types for the given field
    names, and turns empty-string cells into None so optional fields work.
    Leaves date/datetime strings as-is - Pydantic parses ISO 'YYYY-MM-DD'
    strings into date objects on its own.
    """
    int_fields = int_fields or []
    float_fields = float_fields or []
    cleaned: dict[str, Any] = {}

    for key, value in row.items():
        if value == "":
            cleaned[key] = None
        elif key in int_fields:
            cleaned[key] = int(value)
        elif key in float_fields:
            cleaned[key] = float(value)
        else:
            cleaned[key] = value

    return cleaned


class ImportResult:
    def __init__(self):
        self.created = 0
        self.updated = 0
        self.errors: list[dict] = []

    def as_dict(self):
        return {"created": self.created, "updated": self.updated, "errors": self.errors}
