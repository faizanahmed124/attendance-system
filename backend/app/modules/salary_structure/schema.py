from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


# ---------- Salary Component ----------

class SalaryComponentCreate(BaseModel):
    name: str
    component_type: str  # Earning, Deduction
    abbreviation: Optional[str] = None
    is_formula_based: Optional[bool] = False
    formula: Optional[str] = None
    amount: Optional[float] = None
    depends_on_payment_days: Optional[bool] = True
    is_tax_applicable: Optional[bool] = False
    is_active: Optional[bool] = True


class SalaryComponentUpdate(BaseModel):
    name: Optional[str] = None
    component_type: Optional[str] = None
    abbreviation: Optional[str] = None
    is_formula_based: Optional[bool] = None
    formula: Optional[str] = None
    amount: Optional[float] = None
    depends_on_payment_days: Optional[bool] = None
    is_tax_applicable: Optional[bool] = None
    is_active: Optional[bool] = None


class SalaryComponentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    component_type: str
    abbreviation: Optional[str] = None
    is_formula_based: bool
    formula: Optional[str] = None
    amount: Optional[float] = None
    depends_on_payment_days: bool
    is_tax_applicable: bool
    is_active: bool


# ---------- Salary Structure ----------

class SalaryStructureComponentCreate(BaseModel):
    salary_component_id: int
    amount_override: Optional[float] = None
    formula_override: Optional[str] = None
    sort_order: Optional[int] = 0


class SalaryStructureComponentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    salary_structure_id: int
    salary_component_id: int
    amount_override: Optional[float] = None
    formula_override: Optional[str] = None
    sort_order: int


class SalaryStructureCreate(BaseModel):
    name: str
    company_id: int
    is_active: Optional[bool] = True
    components: List[SalaryStructureComponentCreate] = []


class SalaryStructureUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    components: Optional[List[SalaryStructureComponentCreate]] = None  # if given, REPLACES the whole component list


class SalaryStructureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company_id: int
    is_active: bool
    created_at: datetime
    components: List[SalaryStructureComponentOut] = []


# ---------- Salary Structure Assignment ----------

class SalaryStructureAssignmentCreate(BaseModel):
    employee_id: int
    salary_structure_id: int
    company_id: int
    from_date: date
    base: float
    variable: Optional[float] = 0


class SalaryStructureAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    salary_structure_id: int
    company_id: int
    from_date: date
    base: float
    variable: float
    created_at: datetime


# ---------- Salary calculation preview ----------

class SalaryBreakdownLine(BaseModel):
    component_name: str
    component_type: str
    amount: float


class SalaryCalculationOut(BaseModel):
    employee_id: int
    salary_structure_id: int
    base: float
    payment_days: float
    working_days: float
    earnings: List[SalaryBreakdownLine]
    deductions: List[SalaryBreakdownLine]
    gross_pay: float
    total_deductions: float
    net_pay: float
