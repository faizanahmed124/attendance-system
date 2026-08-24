from datetime import datetime, timezone

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SystemSettings(Base):
    """
    A SINGLETON - only ever one row (id=1), same idea as Frappe's
    'Single' doctype. app/modules/system_settings/service.py::get_settings
    creates this row with sane defaults the first time it's requested,
    so there's nothing to seed manually.
    """
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    country: Mapped[str] = mapped_column(String(100), default="Pakistan")
    time_zone: Mapped[str] = mapped_column(String(60), default="Asia/Karachi")
    language: Mapped[str] = mapped_column(String(40), default="English")
    currency: Mapped[str] = mapped_column(String(10), default="PKR")

    date_format: Mapped[str] = mapped_column(String(20), default="dd-mm-yyyy")
    time_format: Mapped[str] = mapped_column(String(20), default="HH:mm:ss")
    first_day_of_week: Mapped[str] = mapped_column(String(10), default="Monday")

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
