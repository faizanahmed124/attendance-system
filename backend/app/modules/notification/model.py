from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Notification(Base):
    """
    In-app notification for a User (not Employee - this is tied to the
    login account, since that's who sees the bell icon). Created by other
    modules calling service.create_notification() - see the module
    docstring in service.py for the reusable helper other features call.
    """
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String(300), nullable=True)  # frontend route to navigate to on click
    notification_type: Mapped[str] = mapped_column(String(40), default="general")

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
