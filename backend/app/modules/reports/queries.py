"""
The actual query logic for every report - one function per report, each
taking (db, filters: dict) and returning a list of plain dicts (already
shaped exactly as the report's columns expect - no further transformation
needed by the caller).

Deliberately written using plain SQLAlchemy ORM queries (not raw SQL) so
they stay consistent with the rest of the app and get basic type-safety.
Where a report needs data from two tables that aren't directly joinable
in one query (e.g. Employee + Department names), it fetches both and
joins them in Python via a dict lookup - the same pattern used throughout
the frontend (e.g. `empName = (id) => employees.find(...)`), just on the
backend instead.
"""
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import func


def _date_range(filters, default_days=30):
    today = date.today()
    from_date = filters.get("from_date") or (today - timedelta(days=default_days))
    to_date = filters.get("to_date") or today
    if isinstance(from_date, str):
        from_date = date.fromisoformat(from_date)
    if isinstance(to_date, str):
        to_date = date.fromisoformat(to_date)
    return from_date, to_date


def _employee_lookup(db):
    from app.modules.employee.model import Employee
    return {e.id: e for e in db.query(Employee).all()}


def _department_lookup(db):
    from app.modules.department.model import Department
    return {d.id: d for d in db.query(Department).all()}


def _designation_lookup(db):
    from app.modules.designation.model import Designation
    return {d.id: d for d in db.query(Designation).all()}


def _shift_lookup(db):
    from app.modules.attendance.model import ShiftType
    return {s.id: s for s in db.query(ShiftType).all()}


# =================== ATTENDANCE ===================

def checkin_report(db: Session, filters: dict):
    from app.modules.attendance.model import CheckIn
    from_date, to_date = _date_range(filters, 7)
    employees = _employee_lookup(db)

    query = db.query(CheckIn).filter(
        func.date(CheckIn.timestamp) >= from_date, func.date(CheckIn.timestamp) <= to_date,
    )
    if filters.get("employee_id"):
        query = query.filter(CheckIn.employee_id == int(filters["employee_id"]))

    rows = []
    for c in query.order_by(CheckIn.timestamp.desc()).limit(2000).all():
        emp = employees.get(c.employee_id)
        rows.append({
            "employee_code": emp.employee_code if emp else "—",
            "employee_name": emp.full_name if emp else f"#{c.employee_id}",
            "log_type": c.log_type,
            "timestamp": c.timestamp.isoformat(),
            "source": c.source,
        })
    return rows


def late_entry_report(db: Session, filters: dict):
    from app.modules.attendance.model import Attendance
    from_date, to_date = _date_range(filters, 30)
    employees = _employee_lookup(db)

    query = db.query(Attendance).filter(
        Attendance.attendance_date >= from_date, Attendance.attendance_date <= to_date,
        Attendance.late_entry.is_(True),
    )
    if filters.get("employee_id"):
        query = query.filter(Attendance.employee_id == int(filters["employee_id"]))

    rows = []
    for a in query.order_by(Attendance.attendance_date.desc()).all():
        emp = employees.get(a.employee_id)
        rows.append({
            "employee_code": emp.employee_code if emp else "—",
            "employee_name": emp.full_name if emp else f"#{a.employee_id}",
            "date": a.attendance_date.isoformat(),
            "check_in_time": a.check_in_time.isoformat() if a.check_in_time else "—",
        })
    return rows


def shift_wise_entry_report(db: Session, filters: dict):
    from app.modules.attendance.model import Attendance
    from_date, to_date = _date_range(filters, 30)
    employees = _employee_lookup(db)
    shifts = _shift_lookup(db)

    query = db.query(Attendance).filter(
        Attendance.attendance_date >= from_date, Attendance.attendance_date <= to_date,
    )
    if filters.get("shift_type_id"):
        query = query.filter(Attendance.shift_type_id == int(filters["shift_type_id"]))

    rows = []
    for a in query.order_by(Attendance.attendance_date.desc()).all():
        emp = employees.get(a.employee_id)
        shift = shifts.get(a.shift_type_id)
        rows.append({
            "employee_name": emp.full_name if emp else f"#{a.employee_id}",
            "shift": shift.name if shift else "—",
            "date": a.attendance_date.isoformat(),
            "check_in_time": a.check_in_time.isoformat() if a.check_in_time else "—",
            "check_out_time": a.check_out_time.isoformat() if a.check_out_time else "—",
            "status": a.status,
        })
    return rows


def monthly_attendance_report(db: Session, filters: dict):
    """One row per employee, per-day status letters for the selected month - like a classic muster roll."""
    from app.modules.attendance.model import Attendance
    month_str = filters.get("month") or date.today().strftime("%Y-%m")
    year, month = int(month_str[:4]), int(month_str[5:7])
    from_date = date(year, month, 1)
    to_date = date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1) - timedelta(days=1)

    employees = _employee_lookup(db)
    records = db.query(Attendance).filter(Attendance.attendance_date >= from_date, Attendance.attendance_date <= to_date).all()

    by_employee = {}
    for a in records:
        by_employee.setdefault(a.employee_id, {})[a.attendance_date] = a.status

    status_code = {"Present": "P", "Absent": "A", "On Leave": "L", "Half Day": "H", "Work From Home": "W"}
    rows = []
    for emp_id, day_map in by_employee.items():
        emp = employees.get(emp_id)
        present = sum(1 for s in day_map.values() if s == "Present")
        absent = sum(1 for s in day_map.values() if s == "Absent")
        on_leave = sum(1 for s in day_map.values() if s == "On Leave")
        rows.append({
            "employee_code": emp.employee_code if emp else "—",
            "employee_name": emp.full_name if emp else f"#{emp_id}",
            "days_present": present, "days_absent": absent, "days_on_leave": on_leave,
            "total_marked": len(day_map),
        })
    return sorted(rows, key=lambda r: r["employee_name"])


def absentee_report(db: Session, filters: dict):
    from app.modules.attendance.model import Attendance
    from_date, to_date = _date_range(filters, 7)
    employees = _employee_lookup(db)

    query = db.query(Attendance).filter(
        Attendance.attendance_date >= from_date, Attendance.attendance_date <= to_date,
        Attendance.status == "Absent",
    )
    rows = []
    for a in query.order_by(Attendance.attendance_date.desc()).all():
        emp = employees.get(a.employee_id)
        rows.append({
            "employee_code": emp.employee_code if emp else "—",
            "employee_name": emp.full_name if emp else f"#{a.employee_id}",
            "date": a.attendance_date.isoformat(),
        })
    return rows


def early_exit_report(db: Session, filters: dict):
    from app.modules.attendance.model import Attendance
    from_date, to_date = _date_range(filters, 30)
    employees = _employee_lookup(db)

    query = db.query(Attendance).filter(
        Attendance.attendance_date >= from_date, Attendance.attendance_date <= to_date,
        Attendance.early_exit.is_(True),
    )
    rows = []
    for a in query.order_by(Attendance.attendance_date.desc()).all():
        emp = employees.get(a.employee_id)
        rows.append({
            "employee_code": emp.employee_code if emp else "—",
            "employee_name": emp.full_name if emp else f"#{a.employee_id}",
            "date": a.attendance_date.isoformat(),
            "check_out_time": a.check_out_time.isoformat() if a.check_out_time else "—",
        })
    return rows


# =================== PAYROLL ===================

def salary_register_report(db: Session, filters: dict):
    from app.modules.payroll.model import SalarySlip
    employees = _employee_lookup(db)

    query = db.query(SalarySlip)
    if filters.get("from_date"):
        query = query.filter(SalarySlip.payment_date >= filters["from_date"])
    if filters.get("to_date"):
        query = query.filter(SalarySlip.payment_date <= filters["to_date"])

    rows = []
    for s in query.order_by(SalarySlip.id.desc()).all():
        emp = employees.get(s.employee_id)
        rows.append({
            "employee_code": emp.employee_code if emp else "—",
            "employee_name": emp.full_name if emp else f"#{s.employee_id}",
            "basic_salary": s.basic_salary, "gross_pay": s.gross_pay,
            "total_deductions": s.total_deductions, "net_pay": s.net_pay,
            "status": s.status,
        })
    return rows


def department_payroll_cost_report(db: Session, filters: dict):
    from app.modules.payroll.model import SalarySlip
    employees = _employee_lookup(db)
    departments = _department_lookup(db)

    query = db.query(SalarySlip)
    if filters.get("from_date"):
        query = query.filter(SalarySlip.payment_date >= filters["from_date"])
    if filters.get("to_date"):
        query = query.filter(SalarySlip.payment_date <= filters["to_date"])

    by_dept = {}
    for s in query.all():
        emp = employees.get(s.employee_id)
        dept_id = emp.department_id if emp else None
        by_dept.setdefault(dept_id, {"total": 0, "count": 0})
        by_dept[dept_id]["total"] += s.net_pay
        by_dept[dept_id]["count"] += 1

    rows = []
    for dept_id, agg in by_dept.items():
        dept = departments.get(dept_id)
        rows.append({
            "department": dept.name if dept else "Unassigned",
            "employee_count": agg["count"],
            "total_net_pay": round(agg["total"], 2),
        })
    return sorted(rows, key=lambda r: -r["total_net_pay"])


def salary_structure_summary_report(db: Session, filters: dict):
    from app.modules.salary_structure.model import SalaryStructureAssignment, SalaryStructure
    employees = _employee_lookup(db)
    structures = {s.id: s for s in db.query(SalaryStructure).all()}

    by_structure = {}
    for a in db.query(SalaryStructureAssignment).all():
        by_structure.setdefault(a.salary_structure_id, []).append(a)

    rows = []
    for struct_id, assignments in by_structure.items():
        struct = structures.get(struct_id)
        rows.append({
            "structure_name": struct.name if struct else f"#{struct_id}",
            "employee_count": len(assignments),
            "avg_base": round(sum(a.base for a in assignments) / len(assignments), 2) if assignments else 0,
        })
    return rows


# =================== HR / EMPLOYEE ===================

def headcount_by_department_report(db: Session, filters: dict):
    employees = list(_employee_lookup(db).values())
    departments = _department_lookup(db)

    by_dept = {}
    for e in employees:
        if e.status != "active":
            continue
        by_dept[e.department_id] = by_dept.get(e.department_id, 0) + 1

    rows = []
    for dept_id, count in by_dept.items():
        dept = departments.get(dept_id)
        rows.append({"department": dept.name if dept else "Unassigned", "active_employees": count})
    return sorted(rows, key=lambda r: -r["active_employees"])


def headcount_by_designation_report(db: Session, filters: dict):
    employees = list(_employee_lookup(db).values())
    designations = _designation_lookup(db)

    by_desig = {}
    for e in employees:
        if e.status != "active":
            continue
        by_desig[e.designation_id] = by_desig.get(e.designation_id, 0) + 1

    rows = []
    for desig_id, count in by_desig.items():
        desig = designations.get(desig_id)
        rows.append({"designation": desig.title if desig else "Unassigned", "active_employees": count})
    return sorted(rows, key=lambda r: -r["active_employees"])


def new_joiners_report(db: Session, filters: dict):
    employees = list(_employee_lookup(db).values())
    from_date, to_date = _date_range(filters, 30)
    departments = _department_lookup(db)

    rows = []
    for e in employees:
        if e.date_of_joining and from_date <= e.date_of_joining <= to_date:
            dept = departments.get(e.department_id)
            rows.append({
                "employee_code": e.employee_code, "employee_name": e.full_name,
                "department": dept.name if dept else "—", "date_of_joining": e.date_of_joining.isoformat(),
            })
    return sorted(rows, key=lambda r: r["date_of_joining"])


def employee_directory_report(db: Session, filters: dict):
    employees = list(_employee_lookup(db).values())
    departments = _department_lookup(db)
    designations = _designation_lookup(db)

    rows = []
    for e in employees:
        dept = departments.get(e.department_id)
        desig = designations.get(e.designation_id)
        rows.append({
            "employee_code": e.employee_code, "employee_name": e.full_name, "email": e.email,
            "phone": e.phone or "—", "department": dept.name if dept else "—",
            "designation": desig.title if desig else "—", "status": e.status,
        })
    return sorted(rows, key=lambda r: r["employee_name"])


def employee_status_summary_report(db: Session, filters: dict):
    employees = list(_employee_lookup(db).values())
    counts = {}
    for e in employees:
        counts[e.status] = counts.get(e.status, 0) + 1
    return [{"status": k, "count": v} for k, v in counts.items()]


# =================== RECRUITMENT ===================

def recruitment_pipeline_report(db: Session, filters: dict):
    from app.modules.recruitment.model import JobApplicant, JobOpening
    openings = {o.id: o for o in db.query(JobOpening).all()}

    rows = []
    for a in db.query(JobApplicant).all():
        opening = openings.get(a.job_opening_id)
        rows.append({
            "applicant_name": a.name, "job_opening": opening.title if opening else "—",
            "status": a.status, "expected_salary": a.expected_salary or "—",
        })
    return rows


def job_openings_summary_report(db: Session, filters: dict):
    from app.modules.recruitment.model import JobOpening, JobApplicant
    applicants_by_opening = {}
    for a in db.query(JobApplicant).all():
        applicants_by_opening.setdefault(a.job_opening_id, []).append(a)

    rows = []
    for o in db.query(JobOpening).all():
        applicants = applicants_by_opening.get(o.id, [])
        hired = sum(1 for a in applicants if a.status == "Hired")
        rows.append({
            "job_title": o.title, "positions": o.positions, "status": o.status,
            "total_applicants": len(applicants), "hired": hired,
        })
    return rows


def time_to_hire_report(db: Session, filters: dict):
    from app.modules.recruitment.model import JobApplicant
    rows = []
    for a in db.query(JobApplicant).filter(JobApplicant.status == "Hired", JobApplicant.offer_date.isnot(None)).all():
        rows.append({
            "applicant_name": a.name, "offer_date": a.offer_date.isoformat() if a.offer_date else "—",
            "offered_salary": a.offered_salary or "—",
        })
    return rows


# =================== LOAN ===================

def outstanding_loans_report(db: Session, filters: dict):
    from app.modules.loan.model import Loan
    employees = _employee_lookup(db)

    rows = []
    for loan in db.query(Loan).filter(Loan.status == "Disbursed", Loan.balance_amount > 0).all():
        emp = employees.get(loan.employee_id)
        rows.append({
            "employee_name": emp.full_name if emp else f"#{loan.employee_id}",
            "loan_amount": loan.loan_amount, "balance_amount": loan.balance_amount,
            "monthly_repayment": loan.monthly_repayment_amount,
        })
    return sorted(rows, key=lambda r: -r["balance_amount"])


def loan_repayment_history_report(db: Session, filters: dict):
    from app.modules.loan.model import Loan, LoanRepayment
    employees = _employee_lookup(db)
    loans = {l.id: l for l in db.query(Loan).all()}
    from_date, to_date = _date_range(filters, 30)

    rows = []
    for r in db.query(LoanRepayment).filter(LoanRepayment.payment_date >= from_date, LoanRepayment.payment_date <= to_date).all():
        loan = loans.get(r.loan_id)
        emp = employees.get(loan.employee_id) if loan else None
        rows.append({
            "employee_name": emp.full_name if emp else "—", "payment_date": r.payment_date.isoformat(),
            "amount_paid": r.amount_paid, "principal": r.principal_amount, "interest": r.interest_amount,
        })
    return rows


def loan_disbursement_summary_report(db: Session, filters: dict):
    from app.modules.loan.model import Loan, LoanDisbursement
    employees = _employee_lookup(db)
    loans = {l.id: l for l in db.query(Loan).all()}
    from_date, to_date = _date_range(filters, 90)

    rows = []
    for d in db.query(LoanDisbursement).filter(LoanDisbursement.disbursement_date >= from_date, LoanDisbursement.disbursement_date <= to_date).all():
        loan = loans.get(d.loan_id)
        emp = employees.get(loan.employee_id) if loan else None
        rows.append({
            "employee_name": emp.full_name if emp else "—", "disbursement_date": d.disbursement_date.isoformat(),
            "disbursed_amount": d.disbursed_amount,
        })
    return rows


# =================== LEAVE ===================

def leave_applications_summary_report(db: Session, filters: dict):
    from app.modules.leave.model import LeaveApplication, LeaveType
    employees = _employee_lookup(db)
    leave_types = {t.id: t for t in db.query(LeaveType).all()}

    query = db.query(LeaveApplication)
    if filters.get("status"):
        query = query.filter(LeaveApplication.status == filters["status"])

    rows = []
    for a in query.order_by(LeaveApplication.created_at.desc()).all():
        emp = employees.get(a.employee_id)
        lt = leave_types.get(a.leave_type_id)
        rows.append({
            "employee_name": emp.full_name if emp else "—", "leave_type": lt.name if lt else "—",
            "from_date": a.from_date.isoformat(), "to_date": a.to_date.isoformat(),
            "days": a.total_leave_days, "status": a.status,
        })
    return rows


def leave_type_utilization_report(db: Session, filters: dict):
    from app.modules.leave.model import LeaveApplication, LeaveType
    leave_types = {t.id: t for t in db.query(LeaveType).all()}

    by_type = {}
    for a in db.query(LeaveApplication).filter(LeaveApplication.status == "Approved").all():
        by_type[a.leave_type_id] = by_type.get(a.leave_type_id, 0) + a.total_leave_days

    rows = []
    for type_id, days in by_type.items():
        lt = leave_types.get(type_id)
        rows.append({"leave_type": lt.name if lt else "—", "total_days_taken": days})
    return sorted(rows, key=lambda r: -r["total_days_taken"])


def leave_balance_summary_report(db: Session, filters: dict):
    from app.modules.leave.service import get_leave_balance_report
    employees = list(_employee_lookup(db).values())

    rows = []
    for e in employees:
        if e.status != "active":
            continue
        for b in get_leave_balance_report(db, e.id):
            rows.append({
                "employee_name": e.full_name, "leave_type": b["leave_type_name"],
                "allocated": b["allocated"], "taken": b["taken"], "balance": b["balance"],
            })
    return rows


# =================== ACCOUNTS ===================

def journal_entry_register_report(db: Session, filters: dict):
    from app.modules.accounts.model import JournalEntry
    from_date, to_date = _date_range(filters, 30)

    query = db.query(JournalEntry).filter(JournalEntry.entry_date >= from_date, JournalEntry.entry_date <= to_date)
    rows = []
    for j in query.order_by(JournalEntry.entry_date.desc()).all():
        rows.append({
            "entry_date": j.entry_date.isoformat(), "reference_number": j.reference_number or "—",
            "total_debit": j.total_debit, "total_credit": j.total_credit, "status": j.status,
        })
    return rows


def account_balances_report(db: Session, filters: dict):
    from app.modules.accounts.model import Account, JournalEntryLine
    accounts = db.query(Account).filter(Account.is_group.is_(False)).all()

    rows = []
    for acc in accounts:
        debit_sum = db.query(func.coalesce(func.sum(JournalEntryLine.debit), 0.0)).filter(JournalEntryLine.account_id == acc.id).scalar() or 0
        credit_sum = db.query(func.coalesce(func.sum(JournalEntryLine.credit), 0.0)).filter(JournalEntryLine.account_id == acc.id).scalar() or 0
        balance = debit_sum - credit_sum
        if balance == 0:
            continue
        rows.append({
            "account_name": acc.account_name, "root_type": acc.root_type,
            "total_debit": round(debit_sum, 2), "total_credit": round(credit_sum, 2), "balance": round(balance, 2),
        })
    return sorted(rows, key=lambda r: r["account_name"])


# =================== HELPDESK ===================

def ticket_summary_report(db: Session, filters: dict):
    from app.modules.helpdesk.model import Ticket
    tickets = db.query(Ticket).all()
    counts = {}
    for t in tickets:
        counts[t.status] = counts.get(t.status, 0) + 1
    return [{"status": k, "count": v} for k, v in counts.items()]


def ticket_resolution_time_report(db: Session, filters: dict):
    from app.modules.helpdesk.model import Ticket
    employees = _employee_lookup(db)

    rows = []
    for t in db.query(Ticket).filter(Ticket.resolved_at.isnot(None)).all():
        hours = round((t.resolved_at - t.created_at).total_seconds() / 3600, 1)
        assignee = employees.get(t.assigned_to)
        rows.append({
            "subject": t.subject, "assigned_to": assignee.full_name if assignee else "Unassigned",
            "hours_to_resolve": hours,
        })
    return sorted(rows, key=lambda r: -r["hours_to_resolve"])


# =================== ONBOARDING / TRAVEL ===================

def onboarding_progress_report(db: Session, filters: dict):
    from app.modules.onboarding.model import EmployeeOnboarding
    from app.modules.onboarding.service import get_onboarding_activities
    employees = _employee_lookup(db)

    rows = []
    for o in db.query(EmployeeOnboarding).all():
        emp = employees.get(o.employee_id)
        activities = get_onboarding_activities(db, o.id)
        done = sum(1 for a in activities if a.is_completed)
        rows.append({
            "employee_name": emp.full_name if emp else "—", "status": o.boarding_status,
            "progress": f"{done}/{len(activities)}",
        })
    return rows


def travel_request_summary_report(db: Session, filters: dict):
    from app.modules.travel_request.model import TravelRequest
    employees = _employee_lookup(db)

    query = db.query(TravelRequest)
    if filters.get("status"):
        query = query.filter(TravelRequest.status == filters["status"])

    rows = []
    for t in query.order_by(TravelRequest.created_at.desc()).all():
        emp = employees.get(t.employee_id)
        rows.append({
            "employee_name": emp.full_name if emp else "—", "destination": t.destination,
            "from_date": t.from_date.isoformat(), "to_date": t.to_date.isoformat(),
            "estimated_cost": t.estimated_cost or 0, "status": t.status,
        })
    return rows


def recognition_summary_report(db: Session, filters: dict):
    from app.modules.recognition.model import Recognition
    employees = _employee_lookup(db)

    by_employee = {}
    for r in db.query(Recognition).all():
        by_employee[r.given_to] = by_employee.get(r.given_to, 0) + 1

    rows = []
    for emp_id, count in by_employee.items():
        emp = employees.get(emp_id)
        rows.append({"employee_name": emp.full_name if emp else "—", "kudos_received": count})
    return sorted(rows, key=lambda r: -r["kudos_received"])


def biometric_device_activity_report(db: Session, filters: dict):
    from app.modules.attendance.model import CheckIn
    from_date, to_date = _date_range(filters, 7)

    query = db.query(CheckIn).filter(
        func.date(CheckIn.timestamp) >= from_date, func.date(CheckIn.timestamp) <= to_date,
        CheckIn.source == "biometric",
    )
    by_device = {}
    for c in query.all():
        by_device[c.device_id or "unknown"] = by_device.get(c.device_id or "unknown", 0) + 1

    return [{"device_id": k, "punches": v} for k, v in by_device.items()]
