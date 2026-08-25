"""
Finds and fixes date columns on 'employees' that don't match the proper
YYYY-MM-DD format (this is what's crashing the Employee List right now).
Tries to intelligently convert common alternate formats (like MM-DD-YY,
MM/DD/YYYY, DD-MM-YYYY); anything it truly can't parse gets set to NULL
(with a printed warning so you know which employee/field to fix by hand
in the Employee edit form).

Run from inside backend/, with the venv active:
    python3 fix_bad_dates.py
"""
import re
import sqlite3
from datetime import datetime
from app.config import settings

DATE_COLUMNS = [
    "date_of_birth", "date_of_joining", "contract_expiry", "offer_date",
    "confirmation_date", "date_of_retirement", "resignation_letter_date",
    "relieving_date", "exit_interview_date", "encashment_date",
    "passport_valid_upto", "passport_date_of_issue",
]

ISO_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# tried in order - whichever parses first wins
CANDIDATE_FORMATS = ["%m-%d-%y", "%m/%d/%Y", "%m-%d-%Y", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%y", "%Y/%m/%d"]


def try_fix(value: str) -> str | None:
    for fmt in CANDIDATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


db_path = settings.DATABASE_URL.replace("sqlite:///", "")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT id, full_name FROM employees")
employees = {row[0]: row[1] for row in cur.fetchall()}

fixed, cleared = 0, 0

for column in DATE_COLUMNS:
    cur.execute(f"SELECT id, {column} FROM employees WHERE {column} IS NOT NULL AND {column} != ''")
    for emp_id, value in cur.fetchall():
        if ISO_PATTERN.match(value):
            continue  # already correct

        new_value = try_fix(value)
        if new_value:
            cur.execute(f"UPDATE employees SET {column} = ? WHERE id = ?", (new_value, emp_id))
            print(f"Fixed: {employees.get(emp_id, f'#{emp_id}')} - {column}: '{value}' -> '{new_value}'")
            fixed += 1
        else:
            cur.execute(f"UPDATE employees SET {column} = NULL WHERE id = ?", (emp_id,))
            print(f"Could not parse, cleared: {employees.get(emp_id, f'#{emp_id}')} - {column}: '{value}' -> NULL (please re-enter manually)")
            cleared += 1

conn.commit()
conn.close()

print(f"\nDone. Fixed: {fixed}, Cleared (needs manual re-entry): {cleared}")