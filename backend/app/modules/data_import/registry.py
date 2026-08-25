"""
Name-based Data Import registry. Every doctype declares its fields; any
field of type "lookup" is shown to the user as a plain NAME (e.g.
"Company", "Department") in the template/CSV - never a raw foreign-key
ID. On import, that name is resolved to the correct ID automatically
(case-insensitive, whitespace-trimmed). On export, IDs are resolved back
to names the same way, so the file you download is exactly what you'd
re-upload.

Field types:
  - "text"   : plain string column, written as-is
  - "date"   : plain date column, expects YYYY-MM-DD
  - "number" : plain numeric column
  - "lookup" : foreign key - user provides a NAME, we resolve it against
               `lookup_table`/`lookup_column` to get the real ID

`key_field` is the column used to decide whether a row is a create or an
update (e.g. Employee's `employee_code`, Department's `name`) - if a row
value matches an EXISTING record's key_field, that record is updated;
otherwise a new one is created.

Verified against the live schema captured via inspect_schema.py.
"""

DOCTYPES = {
    "employee": {
        "label": "Employee",
        "table": "employees",
        "key_field": "employee_code",
        "fields": [
            {"key": "employee_code", "label": "Employee Code", "type": "text", "required": True},
            {"key": "full_name", "label": "Full Name", "type": "text", "required": True},
            {"key": "email", "label": "Email", "type": "text"},
            {"key": "phone", "label": "Phone", "type": "text"},
            {"key": "gender", "label": "Gender", "type": "text"},
            {"key": "date_of_birth", "label": "Date of Birth", "type": "date"},
            {"key": "date_of_joining", "label": "Date of Joining", "type": "date"},
            {"key": "company_id", "label": "Company", "type": "lookup", "lookup_table": "companies", "lookup_column": "name", "required": True},
            {"key": "department_id", "label": "Department", "type": "lookup", "lookup_table": "departments", "lookup_column": "name"},
            {"key": "designation_id", "label": "Designation", "type": "lookup", "lookup_table": "designations", "lookup_column": "title"},
            {"key": "shift_type_id", "label": "Shift Type", "type": "lookup", "lookup_table": "shift_types", "lookup_column": "name"},
            {"key": "employment_type", "label": "Employment Type", "type": "text"},
            {"key": "status", "label": "Status", "type": "text", "default": "active"},
            {"key": "bank_name", "label": "Bank Name", "type": "text"},
            {"key": "bank_account_no", "label": "Bank Account No.", "type": "text"},
        ],
    },
    "department": {
        "label": "Department",
        "table": "departments",
        "key_field": "name",
        "fields": [
            {"key": "name", "label": "Department Name", "type": "text", "required": True},
            {"key": "company_id", "label": "Company", "type": "lookup", "lookup_table": "companies", "lookup_column": "name", "required": True},
            {"key": "parent_department_id", "label": "Parent Department", "type": "lookup", "lookup_table": "departments", "lookup_column": "name"},
            {"key": "is_group", "label": "Is Group (yes/no)", "type": "bool"},
            {"key": "is_active", "label": "Active (yes/no)", "type": "bool", "default": "yes"},
        ],
    },
    "designation": {
        "label": "Designation",
        "table": "designations",
        "key_field": "title",
        "fields": [
            {"key": "title", "label": "Title", "type": "text", "required": True},
            {"key": "description", "label": "Description", "type": "text"},
            {"key": "is_active", "label": "Active (yes/no)", "type": "bool", "default": "yes"},
        ],
    },
    "shift_type": {
        "label": "Shift Type",
        "table": "shift_types",
        "key_field": "name",
        "fields": [
            {"key": "name", "label": "Shift Name", "type": "text", "required": True},
            {"key": "start_time", "label": "Start Time (HH:MM)", "type": "text", "required": True},
            {"key": "end_time", "label": "End Time (HH:MM)", "type": "text", "required": True},
        ],
    },
    "attendance": {
        "label": "Attendance",
        "table": "attendance",
        "key_field": None,  # always inserts new rows - attendance isn't a natural upsert target
        "fields": [
            {"key": "employee_id", "label": "Employee Code", "type": "lookup", "lookup_table": "employees", "lookup_column": "employee_code", "required": True},
            {"key": "attendance_date", "label": "Date", "type": "date", "required": True},
            {"key": "status", "label": "Status (Present/Absent/Half Day/On Leave)", "type": "text", "required": True},
            {"key": "check_in_time", "label": "Check-in Time", "type": "text"},
            {"key": "check_out_time", "label": "Check-out Time", "type": "text"},
        ],
    },
    "leave_application": {
        "label": "Leave Application",
        "table": "leave_applications",
        "key_field": None,
        "fields": [
            {"key": "employee_id", "label": "Employee Code", "type": "lookup", "lookup_table": "employees", "lookup_column": "employee_code", "required": True},
            {"key": "leave_type_id", "label": "Leave Type", "type": "lookup", "lookup_table": "leave_types", "lookup_column": "name", "required": True},
            {"key": "from_date", "label": "From Date", "type": "date", "required": True},
            {"key": "to_date", "label": "To Date", "type": "date", "required": True},
            {"key": "reason", "label": "Reason", "type": "text"},
            {"key": "status", "label": "Status (Open/Approved/Rejected)", "type": "text", "default": "Open"},
        ],
    },
    "job_opening": {
        "label": "Job Opening",
        "table": "job_openings",
        "key_field": "title",
        "fields": [
            {"key": "title", "label": "Job Title", "type": "text", "required": True},
            {"key": "company_id", "label": "Company", "type": "lookup", "lookup_table": "companies", "lookup_column": "name", "required": True},
            {"key": "department_id", "label": "Department", "type": "lookup", "lookup_table": "departments", "lookup_column": "name"},
            {"key": "designation_id", "label": "Designation", "type": "lookup", "lookup_table": "designations", "lookup_column": "title"},
            {"key": "positions", "label": "Number of Positions", "type": "number"},
            {"key": "status", "label": "Status", "type": "text", "default": "Open"},
        ],
    },
    "job_applicant": {
        "label": "Job Applicant",
        "table": "job_applicants",
        "key_field": None,
        "fields": [
            {"key": "full_name", "label": "Applicant Name", "type": "text", "required": True},
            {"key": "email", "label": "Email", "type": "text"},
            {"key": "phone", "label": "Phone", "type": "text"},
            {"key": "job_opening_id", "label": "Job Opening", "type": "lookup", "lookup_table": "job_openings", "lookup_column": "title", "required": True},
            {"key": "status", "label": "Status", "type": "text", "default": "Applied"},
        ],
    },
}
