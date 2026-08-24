from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, BadRequestError
from app.modules.reports.registry import REPORTS


def list_reports():
    return [
        {
            "key": key, "title": r["title"], "category": r["category"], "description": r["description"],
            "filters": r["filters"], "columns": r["columns"],
        }
        for key, r in REPORTS.items()
    ]


def get_report_meta(key: str):
    report = REPORTS.get(key)
    if not report:
        raise NotFoundError(f"Unknown report '{key}'")
    return report


def run_report(db: Session, key: str, filters: dict):
    report = get_report_meta(key)

    required_missing = [
        f["name"] for f in report["filters"]
        if f.get("required") and not filters.get(f["name"])
    ]
    if required_missing:
        raise BadRequestError(f"Missing required filter(s): {', '.join(required_missing)}")

    try:
        rows = report["run"](db, filters)
    except Exception as e:  # noqa: BLE001 - surface a clean error instead of a raw 500 traceback
        raise BadRequestError(f"Could not run report '{report['title']}': {e}")

    return {"columns": report["columns"], "rows": rows, "total_rows": len(rows)}
