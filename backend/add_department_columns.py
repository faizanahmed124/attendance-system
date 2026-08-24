"""
One-off migration: adds is_group, payroll_cost_center_id, and the 3
approver fields to an existing 'departments' table.

Run from inside backend/, with the venv active:
    python3 add_department_columns.py

Safe to run more than once - skips any column that already exists.
"""
import sqlite3
from app.config import settings

NEW_COLUMNS = {
    "is_group": "BOOLEAN DEFAULT 0",
    "payroll_cost_center_id": "INTEGER",
    "leave_approver_id": "INTEGER",
    "expense_approver_id": "INTEGER",
    "shift_request_approver_id": "INTEGER",
}

db_path = settings.DATABASE_URL.replace("sqlite:///", "")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='departments'")
if not cur.fetchone():
    print("departments table doesn't exist yet - nothing to migrate.")
else:
    cur.execute("PRAGMA table_info(departments)")
    existing = {row[1] for row in cur.fetchall()}

    for column, col_type in NEW_COLUMNS.items():
        if column in existing:
            print(f"Column departments.{column} already exists, skipping")
        else:
            print(f"Adding column departments.{column} ({col_type})")
            cur.execute(f"ALTER TABLE departments ADD COLUMN {column} {col_type}")

    conn.commit()
    print("\nDone.")

conn.close()
