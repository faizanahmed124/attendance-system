"""
Report registry - every report is: a key, title, module, description, its
output columns, and a run(db, filters) function that returns a list of
row-dicts matching those columns.

Queries verified against the actual live schema (2026-08-21) via
inspect_schema.py output. Key corrections from the first version:
  - table is `attendance` (singular), not `attendances`
  - attendance has check_in_time/check_out_time (not check_in/check_out),
    and already-computed `late_entry`/`early_exit` boolean columns, and
    a shift_type_id directly on each row - no need to join through
    shift_assignments for shift info on an attendance record
  - salary_slips uses pay_period_start/pay_period_end (not start_date/
    end_date), total_deductions (not total_deduction), and already has
    department_id directly on the slip
  - job_openings uses `positions` (not no_of_positions)
  - accounts has `root_type` (not report_type)
  - expense_claims uses `amount`/`expense_date` (not total_claimed_amount/
    posting_date)

The router wraps every report's execution in a try/except, so if your
schema still doesn't match somewhere, only that one report shows an
error - it never breaks the others.
"""
from datetime import date
from calendar import monthrange

from sqlalchemy import text
from sqlalchemy.orm import Session


def _month_bounds(filters: dict) -> tuple[str, str]:
    if filters.get("from_date") and filters.get("to_date"):
        return filters["from_date"], filters["to_date"]
    month = filters.get("month")
    if month:
        year, mon = map(int, month.split("-"))
    else:
        today = date.today()
        year, mon = today.year, today.month
    last_day = monthrange(year, mon)[1]
    return f"{year:04d}-{mon:02d}-01", f"{year:04d}-{mon:02d}-{last_day:02d}"


def _rows(db: Session, sql: str, params: dict) -> list[dict]:
    result = db.execute(text(sql), params)
    return [dict(row._mapping) for row in result]


# ============================================================
# ATTENDANCE
# ============================================================

def run_checkin_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, c.employee_id,
               date(c.timestamp) AS date, c.log_type, c.timestamp
        FROM check_ins c
        JOIN employees e ON e.id = c.employee_id
        WHERE date(c.timestamp) BETWEEN :from_date AND :to_date
        {employee_filter}
        ORDER BY c.timestamp DESC
    """
    params = {"from_date": from_date, "to_date": to_date}
    employee_filter = ""
    if filters.get("employee_id"):
        employee_filter = "AND c.employee_id = :employee_id"
        params["employee_id"] = filters["employee_id"]
    return _rows(db, sql.format(employee_filter=employee_filter), params)


def run_late_entry_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, d.name AS department,
               a.attendance_date, a.check_in_time, st.name AS shift_name, st.start_time
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN shift_types st ON st.id = a.shift_type_id
        WHERE a.attendance_date BETWEEN :from_date AND :to_date
          AND a.late_entry = 1
        ORDER BY a.attendance_date DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_early_exit_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, d.name AS department,
               a.attendance_date, a.check_out_time, st.name AS shift_name, st.end_time
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN shift_types st ON st.id = a.shift_type_id
        WHERE a.attendance_date BETWEEN :from_date AND :to_date
          AND a.early_exit = 1
        ORDER BY a.attendance_date DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_shift_wise_entry_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT st.name AS shift_name, e.employee_code, e.full_name,
               a.attendance_date, a.check_in_time, a.check_out_time, a.status
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        LEFT JOIN shift_types st ON st.id = a.shift_type_id
        WHERE a.attendance_date BETWEEN :from_date AND :to_date
        ORDER BY st.name, a.attendance_date DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_monthly_attendance_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, d.name AS department,
               SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present_days,
               SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent_days,
               SUM(CASE WHEN a.status = 'Half Day' THEN 1 ELSE 0 END) AS half_days,
               SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END) AS leave_days,
               COUNT(*) AS total_marked_days
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE a.attendance_date BETWEEN :from_date AND :to_date
        GROUP BY e.id
        ORDER BY e.full_name
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_attendance_summary_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT a.attendance_date AS date,
               SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
               SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent,
               SUM(CASE WHEN a.status = 'Half Day' THEN 1 ELSE 0 END) AS half_day,
               SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END) AS on_leave,
               COUNT(*) AS total
        FROM attendance a
        WHERE a.attendance_date BETWEEN :from_date AND :to_date
        GROUP BY a.attendance_date
        ORDER BY a.attendance_date DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_absentee_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, d.name AS department, a.attendance_date
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE a.attendance_date BETWEEN :from_date AND :to_date AND a.status = 'Absent'
        ORDER BY a.attendance_date DESC, e.full_name
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_attendance_check_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, a.attendance_date, a.check_in_time, a.check_out_time, a.status
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        WHERE a.attendance_date BETWEEN :from_date AND :to_date
          AND ((a.check_in_time IS NOT NULL AND a.check_out_time IS NULL)
               OR (a.check_in_time IS NULL AND a.check_out_time IS NOT NULL))
        ORDER BY a.attendance_date DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


# ============================================================
# HR
# ============================================================

def run_employee_directory_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT e.employee_code, e.full_name, d.name AS department, c.name AS company,
               e.email, e.phone, e.status, e.date_of_joining
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN companies c ON c.id = e.company_id
        ORDER BY e.full_name
    """
    return _rows(db, sql, {})


def run_headcount_by_department_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT d.name AS department, COUNT(e.id) AS headcount
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
        GROUP BY d.id
        ORDER BY headcount DESC
    """
    return _rows(db, sql, {})


def run_new_joiners_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, d.name AS department, e.date_of_joining
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.date_of_joining BETWEEN :from_date AND :to_date
        ORDER BY e.date_of_joining DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_exit_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT e.employee_code, e.full_name, s.resignation_letter_date,
               s.relieving_date, s.reason, s.boarding_status
        FROM employee_separations s
        JOIN employees e ON e.id = s.employee_id
        ORDER BY s.resignation_letter_date DESC
    """
    return _rows(db, sql, {})


def run_work_anniversary_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT e.employee_code, e.full_name, e.date_of_joining,
               CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', e.date_of_joining) AS INTEGER) AS years_completed
        FROM employees e
        WHERE strftime('%m', e.date_of_joining) = strftime('%m', 'now')
          AND e.status = 'active'
        ORDER BY strftime('%d', e.date_of_joining)
    """
    return _rows(db, sql, {})


# ============================================================
# PAYROLL
# ============================================================

def run_salary_register_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, d.name AS department,
               s.pay_period_start AS start_date, s.pay_period_end AS end_date,
               s.gross_pay, s.total_deductions AS total_deduction, s.net_pay
        FROM salary_slips s
        JOIN employees e ON e.id = s.employee_id
        LEFT JOIN departments d ON d.id = s.department_id
        WHERE s.pay_period_start >= :from_date AND s.pay_period_end <= :to_date
        ORDER BY e.full_name
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_salary_structure_assignment_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT e.employee_code, e.full_name, ss.name AS structure_name,
               a.from_date, a.base, a.variable
        FROM salary_structure_assignments a
        JOIN employees e ON e.id = a.employee_id
        JOIN salary_structures ss ON ss.id = a.salary_structure_id
        ORDER BY a.from_date DESC
    """
    return _rows(db, sql, {})


def run_component_wise_payroll_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT sc.component_name, sc.component_type, SUM(sc.amount) AS total_amount, COUNT(*) AS employee_count
        FROM salary_slip_components sc
        JOIN salary_slips s ON s.id = sc.salary_slip_id
        WHERE s.pay_period_start >= :from_date AND s.pay_period_end <= :to_date
        GROUP BY sc.component_name, sc.component_type
        ORDER BY total_amount DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_bank_transfer_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, e.bank_name, e.bank_account_no,
               s.net_pay, s.pay_period_end AS end_date
        FROM salary_slips s
        JOIN employees e ON e.id = s.employee_id
        WHERE s.pay_period_start >= :from_date AND s.pay_period_end <= :to_date
        ORDER BY e.full_name
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_payroll_cost_by_department_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT d.name AS department, SUM(s.net_pay) AS total_net_pay, COUNT(*) AS employee_count
        FROM salary_slips s
        LEFT JOIN departments d ON d.id = s.department_id
        WHERE s.pay_period_start >= :from_date AND s.pay_period_end <= :to_date
        GROUP BY d.id
        ORDER BY total_net_pay DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


# ============================================================
# LOAN
# ============================================================

def run_outstanding_loans_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT e.employee_code, e.full_name, l.loan_amount, l.balance_amount,
               l.monthly_repayment_amount, l.status, l.disbursement_date
        FROM loans l
        JOIN employees e ON e.id = l.employee_id
        WHERE l.balance_amount > 0
        ORDER BY l.balance_amount DESC
    """
    return _rows(db, sql, {})


def run_loan_repayment_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, r.payment_date, r.amount_paid,
               r.principal_amount, r.interest_amount, r.balance_after
        FROM loan_repayments r
        JOIN loans l ON l.id = r.loan_id
        JOIN employees e ON e.id = l.employee_id
        WHERE r.payment_date BETWEEN :from_date AND :to_date
        ORDER BY r.payment_date DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


# ============================================================
# LEAVE
# ============================================================

def run_leave_balance_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT e.employee_code, e.full_name, lt.name AS leave_type,
               COALESCE(SUM(la.total_leaves_allocated), 0) + COALESCE(SUM(la.carry_forwarded_leaves), 0) AS allocated,
               COALESCE((
                   SELECT SUM(app.total_leave_days) FROM leave_applications app
                   WHERE app.employee_id = e.id AND app.leave_type_id = lt.id AND app.status = 'Approved'
               ), 0) AS taken
        FROM employees e
        JOIN leave_allocations la ON la.employee_id = e.id
        JOIN leave_types lt ON lt.id = la.leave_type_id
        GROUP BY e.id, lt.id
        ORDER BY e.full_name
    """
    return _rows(db, sql, {})


def run_leave_application_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, lt.name AS leave_type,
               la.from_date, la.to_date, la.total_leave_days, la.status
        FROM leave_applications la
        JOIN employees e ON e.id = la.employee_id
        JOIN leave_types lt ON lt.id = la.leave_type_id
        WHERE la.posting_date BETWEEN :from_date AND :to_date
        ORDER BY la.posting_date DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_employee_leave_taken_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, d.name AS department,
               SUM(la.total_leave_days) AS total_days_taken, COUNT(*) AS applications_count
        FROM leave_applications la
        JOIN employees e ON e.id = la.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE la.status = 'Approved' AND la.from_date BETWEEN :from_date AND :to_date
        GROUP BY e.id
        ORDER BY total_days_taken DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


# ============================================================
# RECRUITMENT
# ============================================================

def run_job_openings_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT j.title, d.name AS department, j.status, j.positions AS no_of_positions,
               (SELECT COUNT(*) FROM job_applicants ja WHERE ja.job_opening_id = j.id) AS applicant_count
        FROM job_openings j
        LEFT JOIN departments d ON d.id = j.department_id
        ORDER BY j.id DESC
    """
    return _rows(db, sql, {})


def run_applicant_pipeline_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT j.title AS job_opening, ja.status AS stage, COUNT(*) AS applicant_count
        FROM job_applicants ja
        JOIN job_openings j ON j.id = ja.job_opening_id
        GROUP BY j.id, ja.status
        ORDER BY j.title, ja.status
    """
    return _rows(db, sql, {})


# ============================================================
# ACCOUNTS
# ============================================================

def run_account_balances_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT a.account_name, a.account_type, a.root_type AS report_type,
               COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0) AS balance
        FROM accounts a
        LEFT JOIN journal_entry_lines l ON l.account_id = a.id
        WHERE a.is_group = 0
        GROUP BY a.id
        ORDER BY a.account_name
    """
    return _rows(db, sql, {})


def run_expense_claims_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, ec.expense_date AS posting_date,
               ec.amount AS total_claimed_amount, ec.status
        FROM expense_claims ec
        JOIN employees e ON e.id = ec.employee_id
        WHERE ec.expense_date BETWEEN :from_date AND :to_date
        ORDER BY ec.expense_date DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


# ============================================================
# HELPDESK / RECOGNITION / TRAVEL / ONBOARDING
# ============================================================

def run_ticket_summary_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT status, priority, category, COUNT(*) AS ticket_count
        FROM helpdesk_tickets
        GROUP BY status, priority, category
        ORDER BY ticket_count DESC
    """
    return _rows(db, sql, {})


def run_kudos_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT giver.full_name AS given_by, receiver.full_name AS given_to,
               r.category, r.message, r.created_at
        FROM recognitions r
        JOIN employees giver ON giver.id = r.given_by
        JOIN employees receiver ON receiver.id = r.given_to
        WHERE date(r.created_at) BETWEEN :from_date AND :to_date
        ORDER BY r.created_at DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_travel_requests_report(db: Session, filters: dict) -> list[dict]:
    from_date, to_date = _month_bounds(filters)
    sql = """
        SELECT e.employee_code, e.full_name, t.destination, t.travel_type,
               t.from_date, t.to_date, t.estimated_cost, t.status
        FROM travel_requests t
        JOIN employees e ON e.id = t.employee_id
        WHERE t.posting_date BETWEEN :from_date AND :to_date
        ORDER BY t.posting_date DESC
    """
    return _rows(db, sql, {"from_date": from_date, "to_date": to_date})


def run_onboarding_progress_report(db: Session, filters: dict) -> list[dict]:
    sql = """
        SELECT e.employee_code, e.full_name, o.boarding_date, o.boarding_status,
               COUNT(a.id) AS total_activities,
               SUM(CASE WHEN a.is_completed THEN 1 ELSE 0 END) AS completed_activities
        FROM employee_onboardings o
        JOIN employees e ON e.id = o.employee_id
        LEFT JOIN onboarding_activities a ON a.onboarding_id = o.id
        GROUP BY o.id
        ORDER BY o.boarding_date DESC
    """
    return _rows(db, sql, {})


# ============================================================
# REGISTRY
# ============================================================

REPORTS = [
    {"key": "checkin_report", "title": "Employee Check-in Report", "module": "attendance",
     "description": "Raw check-in/check-out log per employee.", "run": run_checkin_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"},
                 {"key": "date", "label": "Date"}, {"key": "log_type", "label": "Type"}, {"key": "timestamp", "label": "Timestamp"}]},
    {"key": "late_entry_report", "title": "Late Entry Report", "module": "attendance",
     "description": "Attendance rows flagged late_entry.", "run": run_late_entry_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "department", "label": "Department"},
                 {"key": "attendance_date", "label": "Date"}, {"key": "check_in_time", "label": "Check-in"}, {"key": "shift_name", "label": "Shift"}, {"key": "start_time", "label": "Shift Start"}]},
    {"key": "early_exit_report", "title": "Early Exit Report", "module": "attendance",
     "description": "Attendance rows flagged early_exit.", "run": run_early_exit_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "department", "label": "Department"},
                 {"key": "attendance_date", "label": "Date"}, {"key": "check_out_time", "label": "Check-out"}, {"key": "shift_name", "label": "Shift"}, {"key": "end_time", "label": "Shift End"}]},
    {"key": "shift_wise_entry_report", "title": "Shift-wise Entry Report", "module": "attendance",
     "description": "Attendance grouped by assigned shift.", "run": run_shift_wise_entry_report,
     "columns": [{"key": "shift_name", "label": "Shift"}, {"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"},
                 {"key": "attendance_date", "label": "Date"}, {"key": "check_in_time", "label": "Check-in"}, {"key": "check_out_time", "label": "Check-out"}, {"key": "status", "label": "Status"}]},
    {"key": "monthly_attendance_report", "title": "Monthly Attendance Report", "module": "attendance",
     "description": "Present/Absent/Half-day/Leave day counts per employee for a month.", "run": run_monthly_attendance_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "department", "label": "Department"},
                 {"key": "present_days", "label": "Present"}, {"key": "absent_days", "label": "Absent"}, {"key": "half_days", "label": "Half Day"}, {"key": "leave_days", "label": "On Leave"}, {"key": "total_marked_days", "label": "Total"}]},
    {"key": "attendance_summary_report", "title": "Daily Attendance Summary", "module": "attendance",
     "description": "Company-wide present/absent counts per day.", "run": run_attendance_summary_report,
     "columns": [{"key": "date", "label": "Date"}, {"key": "present", "label": "Present"}, {"key": "absent", "label": "Absent"}, {"key": "half_day", "label": "Half Day"}, {"key": "on_leave", "label": "On Leave"}, {"key": "total", "label": "Total"}]},
    {"key": "absentee_report", "title": "Absentee Report", "module": "attendance",
     "description": "Who was marked absent, and when.", "run": run_absentee_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "department", "label": "Department"}, {"key": "attendance_date", "label": "Date"}]},
    {"key": "attendance_check_report", "title": "Attendance Check Report", "module": "attendance",
     "description": "Data-quality check - records with only a check-in or only a check-out.", "run": run_attendance_check_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "attendance_date", "label": "Date"}, {"key": "check_in_time", "label": "Check-in"}, {"key": "check_out_time", "label": "Check-out"}, {"key": "status", "label": "Status"}]},

    {"key": "employee_directory_report", "title": "Employee Directory", "module": "hr",
     "description": "Full employee listing with contact info.", "run": run_employee_directory_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Name"}, {"key": "department", "label": "Department"}, {"key": "company", "label": "Company"}, {"key": "email", "label": "Email"}, {"key": "phone", "label": "Phone"}, {"key": "status", "label": "Status"}, {"key": "date_of_joining", "label": "Joined"}]},
    {"key": "headcount_by_department_report", "title": "Headcount by Department", "module": "hr",
     "description": "Active employee count per department.", "run": run_headcount_by_department_report,
     "columns": [{"key": "department", "label": "Department"}, {"key": "headcount", "label": "Headcount"}]},
    {"key": "new_joiners_report", "title": "New Joiners Report", "module": "hr",
     "description": "Employees who joined within a date range.", "run": run_new_joiners_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "department", "label": "Department"}, {"key": "date_of_joining", "label": "Joined"}]},
    {"key": "exit_report", "title": "Employee Exit Report", "module": "hr",
     "description": "Separation/offboarding records.", "run": run_exit_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "resignation_letter_date", "label": "Resigned"}, {"key": "relieving_date", "label": "Relieved"}, {"key": "reason", "label": "Reason"}, {"key": "boarding_status", "label": "Status"}]},
    {"key": "work_anniversary_report", "title": "Work Anniversary Report", "module": "hr",
     "description": "Active employees with a work anniversary this month.", "run": run_work_anniversary_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "date_of_joining", "label": "Joined"}, {"key": "years_completed", "label": "Years"}]},

    {"key": "salary_register_report", "title": "Salary Register", "module": "payroll",
     "description": "Gross/deductions/net pay per employee for a period.", "run": run_salary_register_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "department", "label": "Department"}, {"key": "start_date", "label": "From"}, {"key": "end_date", "label": "To"}, {"key": "gross_pay", "label": "Gross"}, {"key": "total_deduction", "label": "Deductions"}, {"key": "net_pay", "label": "Net Pay"}]},
    {"key": "salary_structure_assignment_report", "title": "Salary Structure Assignment Report", "module": "payroll",
     "description": "Which structure and base pay each employee is on.", "run": run_salary_structure_assignment_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "structure_name", "label": "Structure"}, {"key": "from_date", "label": "From"}, {"key": "base", "label": "Base"}, {"key": "variable", "label": "Variable"}]},
    {"key": "component_wise_payroll_report", "title": "Component-wise Payroll Report", "module": "payroll",
     "description": "Total paid per salary component, company-wide.", "run": run_component_wise_payroll_report,
     "columns": [{"key": "component_name", "label": "Component"}, {"key": "component_type", "label": "Type"}, {"key": "total_amount", "label": "Total"}, {"key": "employee_count", "label": "Employees"}]},
    {"key": "bank_transfer_report", "title": "Bank Transfer Report", "module": "payroll",
     "description": "Net pay + bank details for salary disbursement.", "run": run_bank_transfer_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "bank_name", "label": "Bank"}, {"key": "bank_account_no", "label": "Account No."}, {"key": "net_pay", "label": "Net Pay"}, {"key": "end_date", "label": "Period End"}]},
    {"key": "payroll_cost_by_department_report", "title": "Payroll Cost by Department", "module": "payroll",
     "description": "Total net pay per department for a period.", "run": run_payroll_cost_by_department_report,
     "columns": [{"key": "department", "label": "Department"}, {"key": "total_net_pay", "label": "Total Net Pay"}, {"key": "employee_count", "label": "Employees"}]},

    {"key": "outstanding_loans_report", "title": "Outstanding Loans Report", "module": "loan",
     "description": "Loans with a remaining balance.", "run": run_outstanding_loans_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "loan_amount", "label": "Principal"}, {"key": "balance_amount", "label": "Balance"}, {"key": "monthly_repayment_amount", "label": "EMI"}, {"key": "status", "label": "Status"}, {"key": "disbursement_date", "label": "Disbursed"}]},
    {"key": "loan_repayment_report", "title": "Loan Repayment Report", "module": "loan",
     "description": "Repayments made within a period.", "run": run_loan_repayment_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "payment_date", "label": "Date"}, {"key": "amount_paid", "label": "Paid"}, {"key": "principal_amount", "label": "Principal"}, {"key": "interest_amount", "label": "Interest"}, {"key": "balance_after", "label": "Balance After"}]},

    {"key": "leave_balance_report", "title": "Leave Balance Report", "module": "leave",
     "description": "Allocated vs. taken leave per employee per type.", "run": run_leave_balance_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "leave_type", "label": "Leave Type"}, {"key": "allocated", "label": "Allocated"}, {"key": "taken", "label": "Taken"}]},
    {"key": "leave_application_report", "title": "Leave Application Report", "module": "leave",
     "description": "All leave applications within a period.", "run": run_leave_application_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "leave_type", "label": "Type"}, {"key": "from_date", "label": "From"}, {"key": "to_date", "label": "To"}, {"key": "total_leave_days", "label": "Days"}, {"key": "status", "label": "Status"}]},
    {"key": "employee_leave_taken_report", "title": "Employee-wise Leave Taken", "module": "leave",
     "description": "Total approved leave days per employee for a period.", "run": run_employee_leave_taken_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "department", "label": "Department"}, {"key": "total_days_taken", "label": "Days Taken"}, {"key": "applications_count", "label": "Applications"}]},

    {"key": "job_openings_report", "title": "Job Openings Report", "module": "recruitment",
     "description": "Open positions and applicant counts.", "run": run_job_openings_report,
     "columns": [{"key": "title", "label": "Position"}, {"key": "department", "label": "Department"}, {"key": "status", "label": "Status"}, {"key": "no_of_positions", "label": "Openings"}, {"key": "applicant_count", "label": "Applicants"}]},
    {"key": "applicant_pipeline_report", "title": "Applicant Pipeline Report", "module": "recruitment",
     "description": "Applicant counts by stage, per job opening.", "run": run_applicant_pipeline_report,
     "columns": [{"key": "job_opening", "label": "Job Opening"}, {"key": "stage", "label": "Stage"}, {"key": "applicant_count", "label": "Count"}]},

    {"key": "account_balances_report", "title": "Account Balances Report", "module": "accounts",
     "description": "Debit-credit balance per ledger account.", "run": run_account_balances_report,
     "columns": [{"key": "account_name", "label": "Account"}, {"key": "account_type", "label": "Type"}, {"key": "report_type", "label": "Root Type"}, {"key": "balance", "label": "Balance"}]},
    {"key": "expense_claims_report", "title": "Expense Claims Report", "module": "accounts",
     "description": "Employee expense claims within a period.", "run": run_expense_claims_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "posting_date", "label": "Date"}, {"key": "total_claimed_amount", "label": "Amount"}, {"key": "status", "label": "Status"}]},

    {"key": "ticket_summary_report", "title": "Ticket Summary Report", "module": "helpdesk",
     "description": "Ticket counts by status, priority, and category.", "run": run_ticket_summary_report,
     "columns": [{"key": "status", "label": "Status"}, {"key": "priority", "label": "Priority"}, {"key": "category", "label": "Category"}, {"key": "ticket_count", "label": "Count"}]},
    {"key": "kudos_report", "title": "Recognition (Kudos) Report", "module": "recognition",
     "description": "Kudos given within a period.", "run": run_kudos_report,
     "columns": [{"key": "given_by", "label": "From"}, {"key": "given_to", "label": "To"}, {"key": "category", "label": "Category"}, {"key": "message", "label": "Message"}, {"key": "created_at", "label": "Date"}]},
    {"key": "travel_requests_report", "title": "Travel Requests Report", "module": "hr",
     "description": "Travel requests within a period.", "run": run_travel_requests_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "destination", "label": "Destination"}, {"key": "travel_type", "label": "Type"}, {"key": "from_date", "label": "From"}, {"key": "to_date", "label": "To"}, {"key": "estimated_cost", "label": "Est. Cost"}, {"key": "status", "label": "Status"}]},
    {"key": "onboarding_progress_report", "title": "Onboarding Progress Report", "module": "hr",
     "description": "Checklist completion per onboarding record.", "run": run_onboarding_progress_report,
     "columns": [{"key": "employee_code", "label": "Code"}, {"key": "full_name", "label": "Employee"}, {"key": "boarding_date", "label": "Started"}, {"key": "boarding_status", "label": "Status"}, {"key": "total_activities", "label": "Total Tasks"}, {"key": "completed_activities", "label": "Completed"}]},
]

REPORTS_BY_KEY = {r["key"]: r for r in REPORTS}