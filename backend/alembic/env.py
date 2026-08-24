from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

from app.database import Base
from app.config import settings

# import every model so autogenerate can see all tables
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

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url, target_metadata=target_metadata, literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
