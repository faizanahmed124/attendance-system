"""
Resets the admin@example.com user's password to a known value, using the
exact same bcrypt hashing the app itself uses (via bcrypt directly, since
that's the confirmed library/version in this venv).

Run from inside backend/, with the venv active:
    python3 reset_admin_password.py

Change ADMIN_EMAIL / NEW_PASSWORD below if needed.
"""
import sqlite3
import bcrypt
from app.config import settings

ADMIN_EMAIL = "admin@example.com"
NEW_PASSWORD = "Admin@123"

db_path = settings.DATABASE_URL.replace("sqlite:///", "")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT id FROM users WHERE email = ?", (ADMIN_EMAIL,))
row = cur.fetchone()

if not row:
    print(f"No user found with email '{ADMIN_EMAIL}'")
else:
    user_id = row[0]
    new_hash = bcrypt.hashpw(NEW_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    cur.execute("UPDATE users SET hashed_password = ? WHERE id = ?", (new_hash, user_id))
    conn.commit()
    print(f"Password for '{ADMIN_EMAIL}' reset to '{NEW_PASSWORD}'")

conn.close()