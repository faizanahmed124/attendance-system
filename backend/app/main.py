from pathlib import Path
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine

from app.core.json_encoding import UTCTimestampMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)

# Import all models so Base.metadata knows about every table
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
from app.modules.loan import model as loan_model  # noqa
from app.modules.leave import model as leave_model  # noqa
from app.modules.salary_structure import model as salary_structure_model  # noqa
from app.modules.onboarding import model as onboarding_model  # noqa
from app.modules.travel_request import model as travel_request_model  # noqa
from app.modules.recognition import model as recognition_model  # noqa
from app.modules.notification import model as notification_model  # noqa
from app.modules.helpdesk import model as helpdesk_model  # noqa

# Routers
from app.modules.auth.router import router as auth_router
from app.modules.company.router import router as company_router
from app.modules.department.router import router as department_router
from app.modules.designation.router import router as designation_router
from app.modules.employee.router import router as employee_router
from app.modules.holiday.router import router as holiday_router
from app.modules.attendance.router import router as attendance_router
from app.modules.accounts.router import router as accounts_router
from app.modules.permission.router import router as permission_router
from app.modules.search.router import router as search_router
from app.modules.recruitment.router import router as recruitment_router
from app.modules.integration.router import router as integration_router
from app.modules.payroll.router import router as payroll_router
from app.modules.system_settings.router import router as system_settings_router
from app.modules.loan.router import router as loan_router
from app.modules.data_import.router import router as data_import_router
from app.modules.salary_structure.router import router as salary_structure_router
from app.modules.onboarding.router import router as onboarding_router
from app.modules.travel_request.router import router as travel_request_router
from app.modules.recognition.router import router as recognition_router
from app.modules.notification.router import router as notification_router
from app.modules.helpdesk.router import router as helpdesk_router
from app.modules.reports.router import router as reports_router

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fixes naive-datetime JSON responses so the frontend always displays times
# correctly regardless of the user's timezone - see app/core/json_encoding.py
app.add_middleware(UTCTimestampMiddleware)

# Serves employee photos/documents saved by app/utils/file_storage.py
UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_ROOT.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


@app.on_event("startup")
def on_startup():
    # Creates tables if they don't exist yet.
    # For real migrations (schema changes over time) use Alembic instead -
    # see backend/alembic/README usage in the project README.
    Base.metadata.create_all(bind=engine)

    # Make sure hr_manager / employee have a sensible default permission
    # matrix the first time the app boots against a fresh database.
    from app.database import SessionLocal
    from app.modules.permission.service import seed_default_permissions

    db = SessionLocal()
    try:
        seed_default_permissions(db)
    finally:
        db.close()

    from app.services.scheduler import start_scheduler
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown():
    from app.services.scheduler import stop_scheduler
    stop_scheduler()


app.include_router(auth_router)
app.include_router(company_router)
app.include_router(department_router)
app.include_router(designation_router)
app.include_router(employee_router)
app.include_router(holiday_router)
app.include_router(attendance_router)
app.include_router(accounts_router)
app.include_router(permission_router)
app.include_router(search_router)
app.include_router(recruitment_router)
app.include_router(integration_router)
app.include_router(payroll_router)
app.include_router(system_settings_router)
app.include_router(loan_router)
app.include_router(data_import_router)
app.include_router(salary_structure_router)
app.include_router(onboarding_router)
app.include_router(travel_request_router)
app.include_router(recognition_router)
app.include_router(notification_router)
app.include_router(helpdesk_router)
app.include_router(reports_router)


@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} API is running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
