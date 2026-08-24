from datetime import date

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundError, BadRequestError
from app.modules.payroll.model import PayrollEntry, SalarySlip, SalarySlipComponent
from app.modules.payroll.schema import (
    PayrollEntryCreate, SalarySlipCreate, SalarySlipComponentCreate, PostPayrollToJournalRequest,
)


def _generate_slip_for_employee(db, employee, pay_period_start: date, pay_period_end: date) -> SalarySlip:
    """
    Builds one SalarySlip for one employee/period:
    - "Basic Salary" earning = employee.salary
    - "Absent Deduction" = (basic_salary / total days in period) * absent day count,
      pulled straight from the Attendance module for that date range.
    """
    from app.modules.attendance.model import Attendance

    total_days = (pay_period_end - pay_period_start).days + 1
    basic_salary = employee.salary or 0

    absent_count = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee.id,
            Attendance.attendance_date >= pay_period_start,
            Attendance.attendance_date <= pay_period_end,
            Attendance.status == "Absent",
        )
        .count()
    )

    per_day_rate = basic_salary / total_days if total_days > 0 else 0
    absent_deduction = round(per_day_rate * absent_count, 2)

    slip = SalarySlip(
        employee_id=employee.id,
        company_id=employee.company_id,
        department_id=employee.department_id,
        pay_period_start=pay_period_start,
        pay_period_end=pay_period_end,
        basic_salary=basic_salary,
        payable_days=total_days,
        absent_days=absent_count,
        status="Draft",
    )
    slip.components.append(SalarySlipComponent(
        component_type="Earning", component_name="Basic Salary", amount=basic_salary
    ))
    if absent_deduction > 0:
        slip.components.append(SalarySlipComponent(
            component_type="Deduction", component_name="Absent Deduction", amount=absent_deduction
        ))

    _recalculate_slip_totals(slip)
    return slip


def _recalculate_slip_totals(slip: SalarySlip) -> None:
    gross = sum(c.amount for c in slip.components if c.component_type == "Earning")
    deductions = sum(c.amount for c in slip.components if c.component_type == "Deduction")
    slip.gross_pay = gross
    slip.total_deductions = deductions
    slip.net_pay = round(gross - deductions, 2)


# ---------- Payroll Entry ----------

def list_payroll_entries(db: Session, company_id: int | None = None, department_id: int | None = None):
    query = db.query(PayrollEntry)
    if company_id:
        query = query.filter(PayrollEntry.company_id == company_id)
    if department_id:
        query = query.filter(PayrollEntry.department_id == department_id)
    return query.order_by(PayrollEntry.created_at.desc()).all()


def get_payroll_entry(db: Session, entry_id: int) -> PayrollEntry:
    entry = (
        db.query(PayrollEntry)
        .options(joinedload(PayrollEntry.salary_slips).joinedload(SalarySlip.components))
        .filter(PayrollEntry.id == entry_id)
        .first()
    )
    if not entry:
        raise NotFoundError("Payroll entry not found")
    return entry


def create_payroll_entry(db: Session, payload: PayrollEntryCreate) -> PayrollEntry:
    from app.modules.employee.model import Employee

    if payload.pay_period_end < payload.pay_period_start:
        raise BadRequestError("pay_period_end must be on or after pay_period_start")

    query = db.query(Employee).filter(
        Employee.company_id == payload.company_id,
        Employee.status == "active",
        Employee.salary.isnot(None),
    )
    if payload.department_id:
        query = query.filter(Employee.department_id == payload.department_id)
    employees = query.all()

    if not employees:
        raise BadRequestError("No active employees with a salary set match this company/department")

    entry = PayrollEntry(
        company_id=payload.company_id,
        department_id=payload.department_id,
        pay_period_start=payload.pay_period_start,
        pay_period_end=payload.pay_period_end,
    )
    db.add(entry)
    db.flush()

    total_net = 0
    for emp in employees:
        slip = _generate_slip_for_employee(db, emp, payload.pay_period_start, payload.pay_period_end)
        slip.payroll_entry_id = entry.id
        db.add(slip)
        total_net += slip.net_pay

    entry.employee_count = len(employees)
    entry.total_net_pay = round(total_net, 2)

    db.commit()
    db.refresh(entry)
    return entry


def delete_payroll_entry(db: Session, entry_id: int) -> None:
    entry = get_payroll_entry(db, entry_id)
    for slip in entry.salary_slips:
        db.delete(slip)
    db.delete(entry)
    db.commit()


def post_payroll_to_journal(db: Session, entry_id: int, payload: PostPayrollToJournalRequest) -> PayrollEntry:
    from app.modules.accounts.model import JournalEntry, JournalEntryLine

    entry = get_payroll_entry(db, entry_id)
    if entry.journal_entry_id:
        raise BadRequestError("This payroll entry has already been posted")

    # Recompute from each slip's CURRENT net_pay (not the snapshot taken at
    # generation time) so the journal always balances even if components
    # were added/removed on individual slips afterwards.
    live_total = round(sum(slip.net_pay for slip in entry.salary_slips), 2)

    journal = JournalEntry(
        company_id=entry.company_id,
        entry_date=entry.pay_period_end,
        reference_number=f"Payroll {entry.pay_period_start} to {entry.pay_period_end}",
        user_remark=f"Payroll for {entry.employee_count} employee(s)",
        total_debit=live_total,
        total_credit=live_total,
        status="Submitted",
    )
    for slip in entry.salary_slips:
        journal.lines.append(JournalEntryLine(
            account_id=payload.salary_expense_account_id,
            department_id=slip.department_id,
            debit=slip.net_pay,
            credit=0,
            remarks=f"Salary slip #{slip.id} - employee #{slip.employee_id}",
        ))
    journal.lines.append(JournalEntryLine(
        account_id=payload.salary_payable_account_id,
        debit=0,
        credit=live_total,
        remarks=f"Salary payable - {entry.pay_period_start} to {entry.pay_period_end}",
    ))
    db.add(journal)
    db.flush()

    entry.journal_entry_id = journal.id
    entry.total_net_pay = live_total
    entry.status = "Submitted"
    for slip in entry.salary_slips:
        slip.status = "Submitted"

    db.commit()
    db.refresh(entry)
    return entry


# ---------- Salary Slip ----------

def list_salary_slips(
    db: Session, employee_id: int | None = None, payroll_entry_id: int | None = None,
    status: str | None = None,
):
    query = db.query(SalarySlip).options(joinedload(SalarySlip.components))
    if employee_id:
        query = query.filter(SalarySlip.employee_id == employee_id)
    if payroll_entry_id:
        query = query.filter(SalarySlip.payroll_entry_id == payroll_entry_id)
    if status:
        query = query.filter(SalarySlip.status == status)
    return query.order_by(SalarySlip.created_at.desc()).all()


def get_salary_slip(db: Session, slip_id: int) -> SalarySlip:
    slip = (
        db.query(SalarySlip)
        .options(joinedload(SalarySlip.components))
        .filter(SalarySlip.id == slip_id)
        .first()
    )
    if not slip:
        raise NotFoundError("Salary slip not found")
    return slip


def create_standalone_salary_slip(db: Session, payload: SalarySlipCreate) -> SalarySlip:
    from app.modules.employee.model import Employee

    employee = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not employee:
        raise NotFoundError("Employee not found")

    slip = _generate_slip_for_employee(db, employee, payload.pay_period_start, payload.pay_period_end)
    db.add(slip)
    db.commit()
    db.refresh(slip)
    return slip


def add_component(db: Session, slip_id: int, payload: SalarySlipComponentCreate) -> SalarySlip:
    slip = get_salary_slip(db, slip_id)
    if slip.status != "Draft":
        raise BadRequestError("Can only edit components while the slip is in Draft status")

    slip.components.append(SalarySlipComponent(**payload.model_dump()))
    db.flush()
    _recalculate_slip_totals(slip)
    db.commit()
    db.refresh(slip)
    return slip


def remove_component(db: Session, slip_id: int, component_id: int) -> SalarySlip:
    slip = get_salary_slip(db, slip_id)
    if slip.status != "Draft":
        raise BadRequestError("Can only edit components while the slip is in Draft status")

    component = next((c for c in slip.components if c.id == component_id), None)
    if not component:
        raise NotFoundError("Component not found on this slip")

    db.delete(component)
    db.flush()
    slip.components = [c for c in slip.components if c.id != component_id]
    _recalculate_slip_totals(slip)
    db.commit()
    db.refresh(slip)
    return slip


def update_slip_status(db: Session, slip_id: int, status: str) -> SalarySlip:
    from datetime import datetime, timezone

    slip = get_salary_slip(db, slip_id)
    slip.status = status
    if status == "Paid":
        slip.payment_date = datetime.now(timezone.utc).date()
    db.commit()
    db.refresh(slip)
    return slip


def delete_salary_slip(db: Session, slip_id: int) -> None:
    slip = get_salary_slip(db, slip_id)
    db.delete(slip)
    db.commit()
