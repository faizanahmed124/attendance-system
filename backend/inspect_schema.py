"""
Prints every table in your database, and every column in each table -
so I can align the Reports module's queries to your ACTUAL schema in one
pass, instead of fixing errors one report at a time.

Run from inside backend/, with the venv active:
    python3 inspect_schema.py

Paste the FULL output back - it's plain text, no sensitive data (just
table/column names, no actual row data).
"""
import sqlite3
from app.config import settings

db_path = settings.DATABASE_URL.replace("sqlite:///", "")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [row[0] for row in cur.fetchall() if not row[0].startswith("sqlite_")]

for table in tables:
    cur.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cur.fetchall()]
    print(f"{table}: {', '.join(columns)}")

conn.close()