from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, BadRequestError
from app.modules.salary_structure.model import (
    SalaryComponent, SalaryStructure, SalaryStructureComponent, SalaryStructureAssignment,
)
from app.modules.salary_structure.schema import (
    SalaryComponentCreate, SalaryComponentUpdate,
    SalaryStructureCreate, SalaryStructureUpdate,
    SalaryStructureAssignmentCreate,
)
from app.modules.salary_structure.formula import safe_eval_formula


# ---------- Salary Component ----------

def list_salary_components(db: Session):
    return db.query(SalaryComponent).all()


def get_salary_component(db: Session, component_id: int) -> SalaryComponent:
    component = db.query(SalaryComponent).filter(SalaryComponent.id == component_id).first()
    if not component:
        raise NotFoundError("Salary component not found")
    return component


def create_salary_component(db: Session, payload: SalaryComponentCreate) -> SalaryComponent:
    if payload.component_type not in ("Earning", "Deduction"):
        raise BadRequestError("component_type must be 'Earning' or 'Deduction'")
    if payload.is_formula_based and not payload.formula:
        raise BadRequestError("formula is required when is_formula_based is true")
    component = SalaryComponent(**payload.model_dump())
    db.add(component)
    db.commit()
    db.refresh(component)
    return component


def update_salary_component(db: Session, component_id: int, payload: SalaryComponentUpdate) -> SalaryComponent:
    component = get_salary_component(db, component_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(component, field, value)
    db.commit()
    db.refresh(component)
    return component


def delete_salary_component(db: Session, component_id: int) -> None:
    component = get_salary_component(db, component_id)
    db.delete(component)
    db.commit()


# ---------- Salary Structure ----------

def list_salary_structures(db: Session):
    return db.query(SalaryStructure).all()


def get_salary_structure(db: Session, structure_id: int) -> SalaryStructure:
    structure = db.query(SalaryStructure).filter(SalaryStructure.id == structure_id).first()
    if not structure:
        raise NotFoundError("Salary structure not found")
    return structure


def create_salary_structure(db: Session, payload: SalaryStructureCreate) -> SalaryStructure:
    structure = SalaryStructure(name=payload.name, company_id=payload.company_id, is_active=payload.is_active)
    db.add(structure)
    db.flush()  # get structure.id before adding line items

    for i, comp in enumerate(payload.components):
        get_salary_component(db, comp.salary_component_id)  # 404s if invalid
        db.add(SalaryStructureComponent(
            salary_structure_id=structure.id,
            salary_component_id=comp.salary_component_id,
            amount_override=comp.amount_override,
            formula_override=comp.formula_override,
            sort_order=comp.sort_order if comp.sort_order else i,
        ))

    db.commit()
    db.refresh(structure)
    return structure


def update_salary_structure(db: Session, structure_id: int, payload: SalaryStructureUpdate) -> SalaryStructure:
    structure = get_salary_structure(db, structure_id)

    if payload.name is not None:
        structure.name = payload.name
    if payload.is_active is not None:
        structure.is_active = payload.is_active

    if payload.components is not None:
        # replace the whole line-item list - simplest way to keep it
        # consistent with whatever the editor UI last submitted
        db.query(SalaryStructureComponent).filter(SalaryStructureComponent.salary_structure_id == structure_id).delete()
        for i, comp in enumerate(payload.components):
            get_salary_component(db, comp.salary_component_id)
            db.add(SalaryStructureComponent(
                salary_structure_id=structure.id,
                salary_component_id=comp.salary_component_id,
                amount_override=comp.amount_override,
                formula_override=comp.formula_override,
                sort_order=comp.sort_order if comp.sort_order else i,
            ))

    db.commit()
    db.refresh(structure)
    return structure


def delete_salary_structure(db: Session, structure_id: int) -> None:
    structure = get_salary_structure(db, structure_id)
    in_use = db.query(SalaryStructureAssignment).filter(SalaryStructureAssignment.salary_structure_id == structure_id).count()
    if in_use:
        raise BadRequestError(f"Can't delete - {in_use} employee(s) are assigned to this structure")
    db.query(SalaryStructureComponent).filter(SalaryStructureComponent.salary_structure_id == structure_id).delete()
    db.delete(structure)
    db.commit()


# ---------- Salary Structure Assignment ----------

def list_assignments(db: Session, employee_id: int | None = None):
    query = db.query(SalaryStructureAssignment)
    if employee_id:
        query = query.filter(SalaryStructureAssignment.employee_id == employee_id)
    return query.order_by(SalaryStructureAssignment.from_date.desc()).all()


def create_assignment(db: Session, payload: SalaryStructureAssignmentCreate) -> SalaryStructureAssignment:
    get_salary_structure(db, payload.salary_structure_id)  # 404s if invalid
    assignment = SalaryStructureAssignment(**payload.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def delete_assignment(db: Session, assignment_id: int) -> None:
    assignment = db.query(SalaryStructureAssignment).filter(SalaryStructureAssignment.id == assignment_id).first()
    if not assignment:
        raise NotFoundError("Salary structure assignment not found")
    db.delete(assignment)
    db.commit()


def get_active_assignment(db: Session, employee_id: int, as_of: date) -> SalaryStructureAssignment | None:
    """The assignment with the latest from_date on or before `as_of` - matches Frappe's resolution rule."""
    return (
        db.query(SalaryStructureAssignment)
        .filter(SalaryStructureAssignment.employee_id == employee_id, SalaryStructureAssignment.from_date <= as_of)
        .order_by(SalaryStructureAssignment.from_date.desc())
        .first()
    )


# ---------- Salary calculation ----------

def calculate_salary(
    db: Session, employee_id: int, period_start: date, period_end: date,
    payment_days: float | None = None,
) -> dict:
    """
    Resolves the employee's active Salary Structure Assignment as of
    period_start, evaluates every component's formula/amount, and returns
    a full earnings/deductions breakdown. Raises BadRequestError if the
    employee has no assignment at all (caller should fall back to a
    simpler flat-salary calculation in that case, for employees not yet
    migrated onto a structure).
    """
    assignment = get_active_assignment(db, employee_id, period_start)
    if not assignment:
        raise BadRequestError(f"Employee #{employee_id} has no active Salary Structure Assignment as of {period_start}")

    structure = get_salary_structure(db, assignment.salary_structure_id)
    line_items = (
        db.query(SalaryStructureComponent)
        .filter(SalaryStructureComponent.salary_structure_id == structure.id)
        .order_by(SalaryStructureComponent.sort_order)
        .all()
    )

    total_days = (period_end - period_start).days + 1
    if payment_days is None:
        payment_days = total_days  # assume full attendance if not told otherwise

    variables = {
        "base": assignment.base,
        "variable": assignment.variable,
        "payment_days": payment_days,
        "working_days": total_days,
    }

    earnings, deductions = [], []
    for item in line_items:
        component = get_salary_component(db, item.salary_component_id)
        if not component.is_active:
            continue

        formula = item.formula_override or (component.formula if component.is_formula_based else None)
        if formula:
            amount = safe_eval_formula(formula, variables)
        else:
            amount = item.amount_override if item.amount_override is not None else (component.amount or 0)

        if component.depends_on_payment_days and total_days > 0:
            amount = round(amount * payment_days / total_days, 2)
        else:
            amount = round(amount, 2)

        line = {"component_name": component.name, "component_type": component.component_type, "amount": amount}
        if component.component_type == "Earning":
            earnings.append(line)
        else:
            deductions.append(line)

    gross_pay = round(sum(l["amount"] for l in earnings), 2)
    total_deductions = round(sum(l["amount"] for l in deductions), 2)
    net_pay = round(gross_pay - total_deductions, 2)

    return {
        "employee_id": employee_id,
        "salary_structure_id": structure.id,
        "base": assignment.base,
        "payment_days": payment_days,
        "working_days": total_days,
        "earnings": earnings,
        "deductions": deductions,
        "gross_pay": gross_pay,
        "total_deductions": total_deductions,
        "net_pay": net_pay,
    }
