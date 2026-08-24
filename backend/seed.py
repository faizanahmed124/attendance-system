"""
Run this once after setting up the database to create an admin login
and a bit of sample data to get started.

Usage:
    cd backend
    python seed.py
"""
from datetime import date, time

from app.database import Base, engine, SessionLocal
from app.core.security import hash_password

from app.modules.auth.model import User
from app.modules.company.model import Company
from app.modules.department.model import Department
from app.modules.designation.model import Designation
from app.modules.employee.model import Employee
from app.modules.holiday.model import HolidayList  # noqa - needed for shift_types FK
from app.modules.attendance.model import ShiftType
from app.modules.accounts.model import Account
from app.modules.permission.model import RolePermission  # noqa
from app.modules.permission.service import seed_default_permissions

Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    if not db.query(User).filter(User.email == "admin@example.com").first():
        admin = User(
            full_name="System Admin",
            email="admin@example.com",
            hashed_password=hash_password("Admin@123"),
            role="admin",
        )
        db.add(admin)
        db.commit()
        print("Created admin user -> email: admin@example.com | password: Admin@123")
    else:
        print("Admin user already exists, skipping.")

    company = db.query(Company).filter(Company.name == "My Company").first()
    if not company:
        company = Company(name="My Company", abbreviation="MC", default_currency="PKR", country="Pakistan")
        db.add(company)
        db.commit()
        db.refresh(company)
        print("Created sample company: My Company")

    dept = db.query(Department).filter(Department.name == "General").first()
    if not dept:
        dept = Department(name="General", company_id=company.id)
        db.add(dept)
        db.commit()
        db.refresh(dept)
        print("Created sample department: General")

    designation = db.query(Designation).filter(Designation.title == "Staff").first()
    if not designation:
        designation = Designation(title="Staff", description="General staff role")
        db.add(designation)
        db.commit()
        db.refresh(designation)
        print("Created sample designation: Staff")

    if not db.query(ShiftType).filter(ShiftType.name == "General Shift").first():
        shift = ShiftType(
            name="General Shift",
            start_time=time(9, 0),
            end_time=time(18, 0),
            late_entry_grace_minutes=10,
            early_exit_grace_minutes=10,
        )
        db.add(shift)
        db.commit()
        print("Created sample shift: General Shift (9:00 AM - 6:00 PM)")

    if not db.query(Employee).filter(Employee.employee_code == "EMP-0001").first():
        emp = Employee(
            employee_code="EMP-0001",
            full_name="Sample Employee",
            email="employee1@example.com",
            date_of_joining=date.today(),
            company_id=company.id,
            department_id=dept.id,
            designation_id=designation.id,
            status="active",
        )
        db.add(emp)
        db.commit()
        print("Created sample employee: EMP-0001 - Sample Employee")

    seed_default_permissions(db)
    print("Seeded default role permissions (hr_manager, employee).")

    if not db.query(Account).filter(Account.company_id == company.id).first():
        def make(name, root_type, account_type=None, is_group=False, parent=None):
            acc = Account(
                account_name=name, company_id=company.id, root_type=root_type,
                account_type=account_type, is_group=is_group,
                parent_account_id=parent.id if parent else None,
            )
            db.add(acc)
            db.commit()
            db.refresh(acc)
            return acc

        assets = make("Assets", "Asset", is_group=True)
        make("Cash", "Asset", "Cash", parent=assets)
        make("Bank Account", "Asset", "Bank", parent=assets)
        make("Accounts Receivable", "Asset", "Receivable", parent=assets)

        liabilities = make("Liabilities", "Liability", is_group=True)
        make("Accounts Payable", "Liability", "Payable", parent=liabilities)
        make("Salary Payable", "Liability", "Payable", parent=liabilities)

        make("Equity", "Equity", is_group=True)

        income = make("Income", "Income", is_group=True)
        make("Sales Income", "Income", "Income Account", parent=income)

        expenses = make("Expenses", "Expense", is_group=True)
        make("Salary Expense", "Expense", "Expense Account", parent=expenses)
        make("Office Expenses", "Expense", "Expense Account", parent=expenses)
        make("Travel Expenses", "Expense", "Expense Account", parent=expenses)
        make("Utilities", "Expense", "Expense Account", parent=expenses)

        print("Seeded a default Chart of Accounts (Assets/Liabilities/Equity/Income/Expenses)")

    print("\nSeeding complete.")

finally:
    db.close()
