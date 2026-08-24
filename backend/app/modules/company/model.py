from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    abbreviation: Mapped[str] = mapped_column(String(20))
    default_currency: Mapped[str] = mapped_column(String(10), default="PKR")
    country: Mapped[str] = mapped_column(String(100), default="Pakistan")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
