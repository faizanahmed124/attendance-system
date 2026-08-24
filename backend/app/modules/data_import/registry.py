"""
Central registry describing every doctype the Data Import tool can target.
To make another doctype importable, add ONE new entry here - no other
backend changes needed (see router.py, which is fully generic and reads
everything from this dict).

Field shape:
    {
        "label": str                     - shown in the Doctype dropdown
        "model": SQLAlchemy model class
        "create_schema": Pydantic Create schema
        "update_schema": Pydantic Update schema
        "unique_field": str               - column used to decide update-vs-create on import
        "fields": [
            {"name": str, "label": str, "type": "string"|"int"|"float"|"bool"|"date", "required": bool}
        ]
    }

Doctypes deliberately NOT registered here: Attendance, Check-in, Shift
Assignment, Journal Entry, Expense Claim, Salary Posting, Payroll Entry,
Salary Slip, Job Applicant, Interview - these are transactional/derived
records with calculated fields or multi-step business logic (balance
validation, attendance sync, etc.) that a blind CSV upsert would bypass or
corrupt. Import is for master data.
"""
from app.modules.employee.model import Employee
from app.modules.employee.schema import EmployeeCreate, EmployeeUpdate
from app.modules.department.model import Department
from app.modules.department.schema import DepartmentCreate, DepartmentUpdate
from app.modules.company.model import Company
from app.modules.company.schema import CompanyCreate, CompanyUpdate
from app.modules.designation.model import Designation
from app.modules.designation.schema import DesignationCreate, DesignationUpdate
from app.modules.attendance.model import ShiftType
from app.modules.attendance.schema import ShiftTypeCreate, ShiftTypeUpdate
from app.modules.accounts.model import Account, CostCenter
from app.modules.accounts.schema import AccountCreate, AccountUpdate, CostCenterCreate
from app.modules.integration.model import BiometricDevice, CCTVCamera
from app.modules.integration.schema import (
    BiometricDeviceCreate, BiometricDeviceUpdate, CCTVCameraCreate, CCTVCameraUpdate,
)
from app.modules.recruitment.model import JobOpening
from app.modules.recruitment.schema import JobOpeningCreate, JobOpeningUpdate


DOCTYPE_REGISTRY = {
    "employee": {
        "label": "Employee",
        "permission_module": "employee",
        "model": Employee,
        "create_schema": EmployeeCreate,
        "update_schema": EmployeeUpdate,
        "unique_field": "employee_code",
        "fields": [
            {"name": "employee_code", "label": "Employee ID", "type": "string", "required": True},
            {"name": "full_name", "label": "Full Name", "type": "string", "required": True},
            {"name": "email", "label": "Company Email", "type": "string", "required": True},
            {"name": "personal_email", "label": "Personal Email", "type": "string", "required": False},
            {"name": "phone", "label": "Phone", "type": "string", "required": False},
            {"name": "cnic", "label": "CNIC", "type": "string", "required": False},
            {"name": "gender", "label": "Gender", "type": "string", "required": False},
            {"name": "date_of_birth", "label": "Date of Birth", "type": "date", "required": False},
            {"name": "company_id", "label": "Company ID", "type": "int", "required": True},
            {"name": "department_id", "label": "Department ID", "type": "int", "required": True},
            {"name": "designation_id", "label": "Designation ID", "type": "int", "required": True},
            {"name": "branch", "label": "Branch", "type": "string", "required": False},
            {"name": "grade", "label": "Grade", "type": "string", "required": False},
            {"name": "employment_type", "label": "Employment Type", "type": "string", "required": False},
            {"name": "date_of_joining", "label": "Date of Joining", "type": "date", "required": True},
            {"name": "contract_expiry", "label": "Contract Expiry", "type": "date", "required": False},
            {"name": "salary", "label": "Basic Pay", "type": "float", "required": False},
            {"name": "ctc", "label": "CTC", "type": "float", "required": False},
            {"name": "status", "label": "Status", "type": "string", "required": False},
            {"name": "biometric_id", "label": "Biometric ID", "type": "string", "required": False},
        ],
    },
    "department": {
        "label": "Department",
        "permission_module": "department",
        "model": Department,
        "create_schema": DepartmentCreate,
        "update_schema": DepartmentUpdate,
        "unique_field": "name",
        "fields": [
            {"name": "name", "label": "Department Name", "type": "string", "required": True},
            {"name": "company_id", "label": "Company ID", "type": "int", "required": True},
            {"name": "parent_department_id", "label": "Parent Department ID", "type": "int", "required": False},
            {"name": "is_active", "label": "Is Active", "type": "bool", "required": False},
        ],
    },
    "company": {
        "label": "Company",
        "permission_module": "company",
        "model": Company,
        "create_schema": CompanyCreate,
        "update_schema": CompanyUpdate,
        "unique_field": "name",
        "fields": [
            {"name": "name", "label": "Company Name", "type": "string", "required": True},
            {"name": "abbreviation", "label": "Abbreviation", "type": "string", "required": True},
            {"name": "default_currency", "label": "Currency", "type": "string", "required": False},
            {"name": "country", "label": "Country", "type": "string", "required": False},
        ],
    },
    "designation": {
        "label": "Designation",
        "permission_module": "designation",
        "model": Designation,
        "create_schema": DesignationCreate,
        "update_schema": DesignationUpdate,
        "unique_field": "title",
        "fields": [
            {"name": "title", "label": "Title", "type": "string", "required": True},
            {"name": "description", "label": "Description", "type": "string", "required": False},
            {"name": "is_active", "label": "Is Active", "type": "bool", "required": False},
        ],
    },
    "shift_type": {
        "label": "Shift Type",
        "permission_module": "attendance",
        "model": ShiftType,
        "create_schema": ShiftTypeCreate,
        "update_schema": ShiftTypeUpdate,
        "unique_field": "name",
        "fields": [
            {"name": "name", "label": "Shift Name", "type": "string", "required": True},
            {"name": "start_time", "label": "Start Time (HH:MM:SS)", "type": "string", "required": True},
            {"name": "end_time", "label": "End Time (HH:MM:SS)", "type": "string", "required": True},
            {"name": "late_entry_grace_minutes", "label": "Late Entry Grace (min)", "type": "int", "required": False},
            {"name": "early_exit_grace_minutes", "label": "Early Exit Grace (min)", "type": "int", "required": False},
        ],
    },
    "account": {
        "label": "Account (Chart of Accounts)",
        "permission_module": "accounts",
        "model": Account,
        "create_schema": AccountCreate,
        "update_schema": AccountUpdate,
        "unique_field": "account_name",
        "fields": [
            {"name": "account_name", "label": "Account Name", "type": "string", "required": True},
            {"name": "account_number", "label": "Account Number", "type": "string", "required": False},
            {"name": "company_id", "label": "Company ID", "type": "int", "required": True},
            {"name": "parent_account_id", "label": "Parent Account ID", "type": "int", "required": False},
            {"name": "root_type", "label": "Root Type", "type": "string", "required": True},
            {"name": "account_type", "label": "Account Type", "type": "string", "required": False},
            {"name": "is_group", "label": "Is Group", "type": "bool", "required": False},
            {"name": "currency", "label": "Currency", "type": "string", "required": False},
        ],
    },
    "cost_center": {
        "label": "Cost Center",
        "permission_module": "accounts",
        "model": CostCenter,
        "create_schema": CostCenterCreate,
        "update_schema": None,  # no update schema built yet - import will only create, never update
        "unique_field": "name",
        "fields": [
            {"name": "name", "label": "Name", "type": "string", "required": True},
            {"name": "company_id", "label": "Company ID", "type": "int", "required": True},
            {"name": "parent_cost_center_id", "label": "Parent Cost Center ID", "type": "int", "required": False},
            {"name": "is_group", "label": "Is Group", "type": "bool", "required": False},
        ],
    },
    "biometric_device": {
        "label": "Biometric Device",
        "permission_module": "integration",
        "model": BiometricDevice,
        "create_schema": BiometricDeviceCreate,
        "update_schema": BiometricDeviceUpdate,
        "unique_field": "device_name",
        "fields": [
            {"name": "device_name", "label": "Device Name", "type": "string", "required": True},
            {"name": "ip_address", "label": "IP Address", "type": "string", "required": True},
            {"name": "port", "label": "Port", "type": "int", "required": False},
            {"name": "location", "label": "Location", "type": "string", "required": False},
            {"name": "purpose", "label": "Purpose (Check-in/Check-out)", "type": "string", "required": True},
            {"name": "device_type", "label": "Device Type", "type": "string", "required": False},
            {"name": "status", "label": "Status", "type": "string", "required": False},
        ],
    },
    "cctv_camera": {
        "label": "CCTV Camera",
        "permission_module": "integration",
        "model": CCTVCamera,
        "create_schema": CCTVCameraCreate,
        "update_schema": CCTVCameraUpdate,
        "unique_field": "camera_name",
        "fields": [
            {"name": "camera_name", "label": "Camera Name", "type": "string", "required": True},
            {"name": "ip_address", "label": "IP Address", "type": "string", "required": True},
            {"name": "port", "label": "Port", "type": "int", "required": False},
            {"name": "location", "label": "Location", "type": "string", "required": False},
            {"name": "stream_url", "label": "Stream URL", "type": "string", "required": False},
            {"name": "status", "label": "Status", "type": "string", "required": False},
        ],
    },
    "job_opening": {
        "label": "Job Opening",
        "permission_module": "recruitment",
        "model": JobOpening,
        "create_schema": JobOpeningCreate,
        "update_schema": JobOpeningUpdate,
        "unique_field": "title",
        "fields": [
            {"name": "title", "label": "Title", "type": "string", "required": True},
            {"name": "company_id", "label": "Company ID", "type": "int", "required": True},
            {"name": "department_id", "label": "Department ID", "type": "int", "required": True},
            {"name": "designation_id", "label": "Designation ID", "type": "int", "required": True},
            {"name": "positions", "label": "Positions", "type": "int", "required": False},
            {"name": "description", "label": "Description", "type": "string", "required": False},
            {"name": "status", "label": "Status", "type": "string", "required": False},
        ],
    },
}
