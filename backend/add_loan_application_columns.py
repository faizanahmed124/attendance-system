"""
One-off migration: adds the new Loan Application fields to an existing
'loan_applications' table (company_id, rate_of_interest, dates, bank
details, guarantor info, hr_remarks).

Run from inside backend/, with the venv active:
    python3 add_loan_application_columns.py

Safe to run more than once - skips any column that already exists.
"""
import sqlite3
from app.config import settings

NEW_COLUMNS = {
    "company_id": "INTEGER",
    "rate_of_interest": "FLOAT",
    "requested_disbursement_date": "DATE",
    "repayment_start_date": "DATE",
    "bank_account_no": "VARCHAR(50)",
    "bank_name": "VARCHAR(150)",
    "guarantor_name": "VARCHAR(150)",
    "guarantor_contact": "VARCHAR(50)",
    "hr_remarks": "TEXT",
}

db_path = settings.DATABASE_URL.replace("sqlite:///", "")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='loan_applications'")
if not cur.fetchone():
    print("loan_applications table doesn't exist yet - nothing to migrate. "
          "It'll be created fresh with all the new columns next time you run migrate.py.")
else:
    cur.execute("PRAGMA table_info(loan_applications)")
    existing = {row[1] for row in cur.fetchall()}

    for column, col_type in NEW_COLUMNS.items():
        if column in existing:
            print(f"Column loan_applications.{column} already exists, skipping")
        else:
            print(f"Adding column loan_applications.{column} ({col_type})")
            cur.execute(f"ALTER TABLE loan_applications ADD COLUMN {column} {col_type}")

    conn.commit()
    print("\nDone.")

conn.close()
