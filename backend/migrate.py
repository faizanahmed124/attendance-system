"""
Run this ONCE after pulling the updated employee module, if you already have
an existing attendance.db with employee data you want to keep.

It adds the new Employee columns via ALTER TABLE (SQLite-safe: only adds
columns that don't already exist) and creates any brand-new tables
(employee_documents, role_permissions, etc.) that don't exist yet.

Usage:
    cd backend
    python migrate.py
"""
import sqlite3

from app.database import Base, engine
from app.config import settings

# import every model so create_all() knows about all tables, including
# brand-new ones like EmployeeDocument / RolePermission
from app.modules.auth import model as auth_model  # noqa
from app.modules.company import model as company_model  # noqa
from app.modules.department import model as department_model  # noqa
from app.modules.designation import model as designation_model  # noqa
from app.modules.employee import model as employee_model  # noqa
from app.modules.holiday import model as holiday_model  # noqa
from app.modules.attendance import model as attendance_model  # noqa
from app.modules.accounts import model as accounts_model  # noqa
from app.modules.permission import model as permission_model  # noqa
from app.modules.recruitment import model as recruitment_model  # noqa
from app.modules.integration import model as integration_model  # noqa
from app.modules.payroll import model as payroll_model  # noqa
from app.modules.system_settings import model as system_settings_model  # noqa

NEW_EMPLOYEE_COLUMNS = {
    "branch": "VARCHAR(100)",
    "shift_type_id": "INTEGER",
    "employment_type": "VARCHAR(30)",
    "contract_expiry": "DATE",
    "manager_id": "INTEGER",
    "salary": "FLOAT",
    "benefits": "VARCHAR(500)",
    "emergency_contact_name": "VARCHAR(150)",
    "emergency_contact_phone": "VARCHAR(30)",
    "photo_url": "VARCHAR(300)",
    # Frappe Employee doctype parity - added in bulk
    "salutation": "VARCHAR(20)",
    "first_name": "VARCHAR(80)",
    "middle_name": "VARCHAR(80)",
    "last_name": "VARCHAR(80)",
    "father_name": "VARCHAR(150)",
    "grade": "VARCHAR(50)",
    "expense_approver_id": "INTEGER",
    "leave_approver_id": "INTEGER",
    "shift_request_approver_id": "INTEGER",
    "offer_date": "DATE",
    "confirmation_date": "DATE",
    "notice_days": "INTEGER",
    "date_of_retirement": "DATE",
    "ctc": "FLOAT",
    "income_tax_amount": "FLOAT",
    "salary_currency": "VARCHAR(10)",
    "salary_mode": "VARCHAR(20)",
    "payroll_cost_center_id": "INTEGER",
    "bank_name": "VARCHAR(150)",
    "bank_account_no": "VARCHAR(50)",
    "iban": "VARCHAR(50)",
    "medical_allow": "BOOLEAN DEFAULT 0",
    "medical_amount": "FLOAT",
    "gratuity_allow": "BOOLEAN DEFAULT 0",
    "total_gratuity": "FLOAT",
    "consumed_gratuity_amount": "FLOAT",
    "personal_email": "VARCHAR(150)",
    "preferred_contact_email": "VARCHAR(30)",
    "current_address": "TEXT",
    "current_accommodation_type": "VARCHAR(20)",
    "permanent_address": "TEXT",
    "permanent_accommodation_type": "VARCHAR(20)",
    "emergency_contact_relation": "VARCHAR(80)",
    "allow_overtime": "BOOLEAN DEFAULT 0",
    "holiday_list_id": "INTEGER",
    "marital_status": "VARCHAR(20)",
    "family_background": "TEXT",
    "blood_group": "VARCHAR(10)",
    "health_details": "TEXT",
    "health_insurance_provider": "VARCHAR(150)",
    "health_insurance_no": "VARCHAR(50)",
    "passport_number": "VARCHAR(50)",
    "passport_valid_upto": "DATE",
    "passport_date_of_issue": "DATE",
    "passport_place_of_issue": "VARCHAR(100)",
    "bio": "TEXT",
    "resignation_letter_date": "DATE",
    "relieving_date": "DATE",
    "exit_interview_date": "DATE",
    "new_workplace": "VARCHAR(150)",
    "leave_encashed": "VARCHAR(10)",
    "encashment_date": "DATE",
    "reason_for_leaving": "TEXT",
    "exit_feedback": "TEXT",
}

NEW_SHIFT_TYPE_COLUMNS = {
    "holiday_list_id": "INTEGER",
    "roster_color": "VARCHAR(30)",
    "enable_auto_attendance": "BOOLEAN DEFAULT 1",
    "determine_check_in_out": "VARCHAR(80)",
    "working_hours_calc_based_on": "VARCHAR(50)",
    "begin_check_in_before_shift_minutes": "INTEGER DEFAULT 60",
    "allow_check_out_after_shift_minutes": "INTEGER DEFAULT 0",
    "mark_auto_attendance_on_holidays": "BOOLEAN DEFAULT 0",
    "working_hours_threshold_half_day": "FLOAT",
    "working_hours_threshold_absent": "FLOAT",
    "process_attendance_after": "DATE",
    "last_sync_of_checkin": "DATETIME",
    "auto_update_last_sync": "BOOLEAN DEFAULT 1",
    "enable_late_entry_marking": "BOOLEAN DEFAULT 1",
    "enable_early_exit_marking": "BOOLEAN DEFAULT 1",
    "created_at": "DATETIME",
}


def _table_exists(cur, table_name: str) -> bool:
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
    return cur.fetchone() is not None


def _migrate_table_columns(cur, table_name: str, new_columns: dict):
    if not _table_exists(cur, table_name):
        print(f"Table '{table_name}' doesn't exist yet - it'll be created fresh by create_all() below, skipping column migration for it")
        return

    cur.execute(f"PRAGMA table_info({table_name})")
    existing_columns = {row[1] for row in cur.fetchall()}

    for column, col_type in new_columns.items():
        if column not in existing_columns:
            print(f"Adding column {table_name}.{column} ({col_type})")
            cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {column} {col_type}")
        else:
            print(f"Column {table_name}.{column} already exists, skipping")


def migrate_sqlite():
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    _migrate_table_columns(cur, "employees", NEW_EMPLOYEE_COLUMNS)
    _migrate_table_columns(cur, "shift_types", NEW_SHIFT_TYPE_COLUMNS)

    conn.commit()
    conn.close()


def backfill_shift_type_defaults():
    """
    SQLite's ALTER TABLE ADD COLUMN only auto-fills existing rows when the
    ADD COLUMN statement itself has a DEFAULT clause. Any column added
    without one (mainly the text fields above) is left NULL on rows that
    existed before this migration — which then fails API response
    validation. This backfills sane defaults into any such NULL cells.
    Safe to run every time; only touches rows that are still NULL.
    """
    from datetime import datetime, timezone

    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    if not _table_exists(cur, "shift_types"):
        conn.close()
        return

    now = datetime.now(timezone.utc).isoformat(sep=" ", timespec="seconds")
    fixes = [
        ("roster_color", "'Blue'"),
        ("determine_check_in_out", "'Alternating entries as IN and OUT during the same shift'"),
        ("working_hours_calc_based_on", "'Every Valid Check-in and Check-out'"),
        ("created_at", f"'{now}'"),
    ]
    for column, default_sql in fixes:
        cur.execute(f"UPDATE shift_types SET {column} = {default_sql} WHERE {column} IS NULL")

    conn.commit()
    conn.close()


if __name__ == "__main__":
    if not settings.DATABASE_URL.startswith("sqlite"):
        print("This script only handles SQLite. For Postgres/MySQL, use Alembic:")
        print("  alembic revision --autogenerate -m 'employee profile fields'")
        print("  alembic upgrade head")
    else:
        try:
            migrate_sqlite()
            backfill_shift_type_defaults()
        except Exception as e:
            print(f"\nColumn migration hit an error ({e}) - continuing to table creation anyway.")

    print("\nCreating any brand-new tables (employee_documents, role_permissions, etc.)...")
    Base.metadata.create_all(bind=engine)
    print("Done. Your existing data was kept.")
