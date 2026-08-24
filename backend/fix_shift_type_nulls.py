"""
One-time fix for existing installs: an earlier version of migrate.py added
new shift_types columns without SQL-level defaults for text fields, so
pre-existing shift type rows ended up with NULL in roster_color,
determine_check_in_out, working_hours_calc_based_on, and created_at —
which crashes the API response validation.

This script backfills sane defaults into any NULL cells. Safe to run
multiple times.

Usage:
    cd backend
    python fix_shift_type_nulls.py
"""
import sqlite3
from datetime import datetime, timezone

from app.config import settings

db_path = settings.DATABASE_URL.replace("sqlite:///", "")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

now = datetime.now(timezone.utc).isoformat(sep=" ", timespec="seconds")

fixes = [
    ("roster_color", "'Blue'"),
    ("determine_check_in_out", "'Alternating entries as IN and OUT during the same shift'"),
    ("working_hours_calc_based_on", "'Every Valid Check-in and Check-out'"),
    ("created_at", f"'{now}'"),
    ("begin_check_in_before_shift_minutes", "60"),
    ("allow_check_out_after_shift_minutes", "0"),
    ("enable_auto_attendance", "1"),
    ("mark_auto_attendance_on_holidays", "0"),
    ("auto_update_last_sync", "1"),
    ("enable_late_entry_marking", "1"),
    ("enable_early_exit_marking", "1"),
    ("late_entry_grace_minutes", "10"),
    ("early_exit_grace_minutes", "10"),
]

for column, default_sql in fixes:
    cur.execute(f"UPDATE shift_types SET {column} = {default_sql} WHERE {column} IS NULL")
    if cur.rowcount:
        print(f"Fixed {cur.rowcount} row(s) with NULL {column}")

conn.commit()
conn.close()
print("\nDone. Restart uvicorn and try again.")