from datetime import datetime, date, timezone

from sqlalchemy import String, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HolidayList(Base):
    __tablename__ = "holiday_lists"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150))  # e.g. "Pakistan Holidays 2026"
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    from_date: Mapped[date] = mapped_column(Date)
    to_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    holidays: Mapped[list["Holiday"]] = relationship(
        back_populates="holiday_list", cascade="all, delete-orphan"
    )


class Holiday(Base):
    __tablename__ = "holidays"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    holiday_list_id: Mapped[int] = mapped_column(ForeignKey("holiday_lists.id"))
    holiday_date: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(String(255))

    holiday_list: Mapped["HolidayList"] = relationship(back_populates="holidays")
