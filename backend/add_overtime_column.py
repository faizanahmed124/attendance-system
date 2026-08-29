"""
One-off migration: adds 'overtime_hours' to the existing 'attendance' table.

Run from inside backend/, with the venv active:
    python3 add_overtime_column.py

Safe to run more than once.
"""
import sqlite3
from app.config import settings

db_path = settings.DATABASE_URL.replace("sqlite:///", "")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("PRAGMA table_info(attendance)")
existing = {row[1] for row in cur.fetchall()}

if "overtime_hours" in existing:
    print("Column attendance.overtime_hours already exists, skipping")
else:
    print("Adding column attendance.overtime_hours (REAL)")
    cur.execute("ALTER TABLE attendance ADD COLUMN overtime_hours REAL DEFAULT 0")
    conn.commit()
    print("Done.")

conn.close()
