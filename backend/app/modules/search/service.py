from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.modules.employee.model import Employee
from app.modules.department.model import Department
from app.modules.company.model import Company
from app.modules.designation.model import Designation
from app.modules.permission.service import has_permission
from app.modules.search.schema import SearchResultItem
from app.modules.recruitment.model import JobApplicant, JobOpening

LIMIT_PER_TYPE = 5


def global_search(db: Session, query: str, role: str) -> list[SearchResultItem]:
    q = f"%{query}%"
    results: list[SearchResultItem] = []

    if has_permission(db, role, "employee", "read"):
        employees = (
            db.query(Employee)
            .filter(
                or_(
                    Employee.full_name.ilike(q),
                    Employee.employee_code.ilike(q),
                    Employee.email.ilike(q),
                )
            )
            .limit(LIMIT_PER_TYPE)
            .all()
        )
        for e in employees:
            results.append(SearchResultItem(
                type="employee", id=e.id,
                title=e.full_name, subtitle=f"{e.employee_code} · {e.email}",
                url=f"/employees?open={e.id}",
            ))

    if has_permission(db, role, "department", "read"):
        departments = db.query(Department).filter(Department.name.ilike(q)).limit(LIMIT_PER_TYPE).all()
        for d in departments:
            results.append(SearchResultItem(
                type="department", id=d.id, title=d.name, subtitle="Department",
                url=f"/departments?open={d.id}",
            ))

    if has_permission(db, role, "company", "read"):
        companies = db.query(Company).filter(Company.name.ilike(q)).limit(LIMIT_PER_TYPE).all()
        for c in companies:
            results.append(SearchResultItem(
                type="company", id=c.id, title=c.name, subtitle="Company",
                url=f"/companies?open={c.id}",
            ))

    if has_permission(db, role, "designation", "read"):
        designations = db.query(Designation).filter(Designation.title.ilike(q)).limit(LIMIT_PER_TYPE).all()
        for d in designations:
            results.append(SearchResultItem(
                type="designation", id=d.id, title=d.title, subtitle="Designation",
                url=f"/designations?open={d.id}",
            ))

    if has_permission(db, role, "recruitment", "read"):
        job_openings = db.query(JobOpening).filter(JobOpening.title.ilike(q)).limit(LIMIT_PER_TYPE).all()
        for j in job_openings:
            results.append(SearchResultItem(
                type="job_opening", id=j.id, title=j.title, subtitle=f"Job Opening · {j.status}",
                url=f"/recruitment/job-openings?open={j.id}",
            ))

        applicants = (
            db.query(JobApplicant)
            .filter(or_(JobApplicant.full_name.ilike(q), JobApplicant.email.ilike(q)))
            .limit(LIMIT_PER_TYPE)
            .all()
        )
        for a in applicants:
            results.append(SearchResultItem(
                type="applicant", id=a.id, title=a.full_name, subtitle=f"Applicant · {a.status}",
                url=f"/recruitment/applicants/{a.id}",
            ))

    return results
