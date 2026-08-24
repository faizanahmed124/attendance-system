from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict


class EmployeeCreate(BaseModel):
    employee_code: str
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: str
    father_name: Optional[str] = None
    email: EmailStr
    personal_email: Optional[str] = None
    preferred_contact_email: Optional[str] = None
    phone: Optional[str] = None
    cnic: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    photo_url: Optional[str] = None

    company_id: int
    department_id: int
    designation_id: int
    branch: Optional[str] = None
    grade: Optional[str] = None
    shift_type_id: Optional[int] = None
    employment_type: Optional[str] = None
    date_of_joining: date
    contract_expiry: Optional[date] = None
    manager_id: Optional[int] = None
    expense_approver_id: Optional[int] = None
    leave_approver_id: Optional[int] = None
    shift_request_approver_id: Optional[int] = None

    offer_date: Optional[date] = None
    confirmation_date: Optional[date] = None
    notice_days: Optional[int] = None
    date_of_retirement: Optional[date] = None

    salary: Optional[float] = None
    ctc: Optional[float] = None
    income_tax_amount: Optional[float] = None
    salary_currency: Optional[str] = "PKR"
    salary_mode: Optional[str] = None
    payroll_cost_center_id: Optional[int] = None
    benefits: Optional[str] = None

    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    iban: Optional[str] = None

    medical_allow: Optional[bool] = False
    medical_amount: Optional[float] = None
    gratuity_allow: Optional[bool] = False
    total_gratuity: Optional[float] = None
    consumed_gratuity_amount: Optional[float] = None

    current_address: Optional[str] = None
    current_accommodation_type: Optional[str] = None
    permanent_address: Optional[str] = None
    permanent_accommodation_type: Optional[str] = None

    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None

    allow_overtime: Optional[bool] = False
    holiday_list_id: Optional[int] = None

    marital_status: Optional[str] = None
    family_background: Optional[str] = None
    blood_group: Optional[str] = None
    health_details: Optional[str] = None

    health_insurance_provider: Optional[str] = None
    health_insurance_no: Optional[str] = None

    passport_number: Optional[str] = None
    passport_valid_upto: Optional[date] = None
    passport_date_of_issue: Optional[date] = None
    passport_place_of_issue: Optional[str] = None

    bio: Optional[str] = None

    resignation_letter_date: Optional[date] = None
    relieving_date: Optional[date] = None
    exit_interview_date: Optional[date] = None
    new_workplace: Optional[str] = None
    leave_encashed: Optional[str] = None
    encashment_date: Optional[date] = None
    reason_for_leaving: Optional[str] = None
    exit_feedback: Optional[str] = None

    user_id: Optional[int] = None
    biometric_id: Optional[str] = None
    status: Optional[str] = "active"


class EmployeeUpdate(BaseModel):
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    father_name: Optional[str] = None
    personal_email: Optional[str] = None
    preferred_contact_email: Optional[str] = None
    phone: Optional[str] = None
    cnic: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    photo_url: Optional[str] = None

    department_id: Optional[int] = None
    designation_id: Optional[int] = None
    branch: Optional[str] = None
    grade: Optional[str] = None
    shift_type_id: Optional[int] = None
    employment_type: Optional[str] = None
    contract_expiry: Optional[date] = None
    manager_id: Optional[int] = None
    expense_approver_id: Optional[int] = None
    leave_approver_id: Optional[int] = None
    shift_request_approver_id: Optional[int] = None

    offer_date: Optional[date] = None
    confirmation_date: Optional[date] = None
    notice_days: Optional[int] = None
    date_of_retirement: Optional[date] = None

    salary: Optional[float] = None
    ctc: Optional[float] = None
    income_tax_amount: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_mode: Optional[str] = None
    payroll_cost_center_id: Optional[int] = None
    benefits: Optional[str] = None

    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    iban: Optional[str] = None

    medical_allow: Optional[bool] = None
    medical_amount: Optional[float] = None
    gratuity_allow: Optional[bool] = None
    total_gratuity: Optional[float] = None
    consumed_gratuity_amount: Optional[float] = None

    current_address: Optional[str] = None
    current_accommodation_type: Optional[str] = None
    permanent_address: Optional[str] = None
    permanent_accommodation_type: Optional[str] = None

    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None

    allow_overtime: Optional[bool] = None
    holiday_list_id: Optional[int] = None

    marital_status: Optional[str] = None
    family_background: Optional[str] = None
    blood_group: Optional[str] = None
    health_details: Optional[str] = None

    health_insurance_provider: Optional[str] = None
    health_insurance_no: Optional[str] = None

    passport_number: Optional[str] = None
    passport_valid_upto: Optional[date] = None
    passport_date_of_issue: Optional[date] = None
    passport_place_of_issue: Optional[str] = None

    bio: Optional[str] = None

    resignation_letter_date: Optional[date] = None
    relieving_date: Optional[date] = None
    exit_interview_date: Optional[date] = None
    new_workplace: Optional[str] = None
    leave_encashed: Optional[str] = None
    encashment_date: Optional[date] = None
    reason_for_leaving: Optional[str] = None
    exit_feedback: Optional[str] = None

    user_id: Optional[int] = None
    biometric_id: Optional[str] = None
    status: Optional[str] = None


class EmployeeDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    document_name: str
    file_url: str
    uploaded_at: datetime


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: str
    father_name: Optional[str] = None
    email: EmailStr
    personal_email: Optional[str] = None
    preferred_contact_email: Optional[str] = None
    phone: Optional[str] = None
    cnic: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    photo_url: Optional[str] = None

    company_id: int
    department_id: int
    designation_id: int
    branch: Optional[str] = None
    grade: Optional[str] = None
    shift_type_id: Optional[int] = None
    employment_type: Optional[str] = None
    date_of_joining: date
    contract_expiry: Optional[date] = None
    manager_id: Optional[int] = None
    expense_approver_id: Optional[int] = None
    leave_approver_id: Optional[int] = None
    shift_request_approver_id: Optional[int] = None

    offer_date: Optional[date] = None
    confirmation_date: Optional[date] = None
    notice_days: Optional[int] = None
    date_of_retirement: Optional[date] = None

    salary: Optional[float] = None
    ctc: Optional[float] = None
    income_tax_amount: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_mode: Optional[str] = None
    payroll_cost_center_id: Optional[int] = None
    benefits: Optional[str] = None

    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    iban: Optional[str] = None

    medical_allow: bool = False
    medical_amount: Optional[float] = None
    gratuity_allow: bool = False
    total_gratuity: Optional[float] = None
    consumed_gratuity_amount: Optional[float] = None

    current_address: Optional[str] = None
    current_accommodation_type: Optional[str] = None
    permanent_address: Optional[str] = None
    permanent_accommodation_type: Optional[str] = None

    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None

    allow_overtime: bool = False
    holiday_list_id: Optional[int] = None

    marital_status: Optional[str] = None
    family_background: Optional[str] = None
    blood_group: Optional[str] = None
    health_details: Optional[str] = None

    health_insurance_provider: Optional[str] = None
    health_insurance_no: Optional[str] = None

    passport_number: Optional[str] = None
    passport_valid_upto: Optional[date] = None
    passport_date_of_issue: Optional[date] = None
    passport_place_of_issue: Optional[str] = None

    bio: Optional[str] = None

    resignation_letter_date: Optional[date] = None
    relieving_date: Optional[date] = None
    exit_interview_date: Optional[date] = None
    new_workplace: Optional[str] = None
    leave_encashed: Optional[str] = None
    encashment_date: Optional[date] = None
    reason_for_leaving: Optional[str] = None
    exit_feedback: Optional[str] = None

    user_id: Optional[int] = None
    biometric_id: Optional[str] = None
    status: str
    created_at: datetime

    documents: List[EmployeeDocumentOut] = []
