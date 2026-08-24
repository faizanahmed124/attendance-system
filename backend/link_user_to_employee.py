"""
Links a User account to an Employee profile (sets Employee.user_id) so
that account can give/receive Kudos, and anywhere else in the app that
resolves "which employee is this logged-in user" (like Recognition).

Run from inside backend/, with the venv active:
    python3 link_user_to_employee.py

Edit the two variables below first.
"""
from app.database import SessionLocal
from app.modules.auth.model import User
from app.modules.employee.model import Employee

# ---- EDIT THESE ----
USER_EMAIL = "admin@example.com"      # the User account (login email) to link
EMPLOYEE_CODE = "6460"            # the Employee record to link it to
# ---------------------

db = SessionLocal()

user = db.query(User).filter(User.email == USER_EMAIL).first()
if not user:
    print(f"No User found with email '{USER_EMAIL}'")
else:
    employee = db.query(Employee).filter(Employee.employee_code == EMPLOYEE_CODE).first()
    if not employee:
        print(f"No Employee found with employee_code '{EMPLOYEE_CODE}'")
    else:
        employee.user_id = user.id
        db.commit()
        print(f"Linked: User '{user.email}' -> Employee '{employee.full_name}' ({employee.employee_code})")

db.close()
