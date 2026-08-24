from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.reports.registry import REPORTS, REPORTS_BY_KEY

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/")
def list_reports(current_user=Depends(require_permission("reports", "read"))):
    """Metadata only (no data) - grouped by module, for the Reports workspace page."""
    by_module: dict[str, list] = {}
    for r in REPORTS:
        by_module.setdefault(r["module"], []).append({
            "key": r["key"], "title": r["title"], "description": r["description"], "columns": r["columns"],
        })
    return by_module


@router.get("/{report_key}/run")
def run_report(
    report_key: str,
    from_date: Optional[str] = None, to_date: Optional[str] = None, month: Optional[str] = None,
    employee_id: Optional[int] = None, department_id: Optional[int] = None, company_id: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("reports", "read")),
):
    report = REPORTS_BY_KEY.get(report_key)
    if not report:
        raise HTTPException(status_code=404, detail=f"No report registered with key '{report_key}'")

    filters = {
        "from_date": from_date, "to_date": to_date, "month": month,
        "employee_id": employee_id, "department_id": department_id, "company_id": company_id,
    }

    try:
        rows = report["run"](db, filters)
    except (OperationalError, ProgrammingError) as e:
        # A wrong table/column name in one report's SQL should never crash
        # the whole reports feature - surface it as a clear, scoped error
        # for just this report instead.
        raise HTTPException(
            status_code=500,
            detail=(
                f"This report's query doesn't match your database schema yet "
                f"(likely a table/column name mismatch): {str(e.orig) if hasattr(e, 'orig') else str(e)}"
            ),
        )

    return {"columns": report["columns"], "rows": rows}
