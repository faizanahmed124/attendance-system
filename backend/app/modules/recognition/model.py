from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Recognition(Base):
    """
    Peer-to-peer appreciation - not a Frappe HRMS feature, added because
    lightweight public recognition ("kudos") is one of the most requested
    additions in modern HR tools (Lattice, Bonusly, Culture Amp etc.) -
    boosts morale and surfaces who's doing good work company-wide.
    """
    __tablename__ = "recognitions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    given_by: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    given_to: Mapped[int] = mapped_column(ForeignKey("employees.id"))

    category: Mapped[str] = mapped_column(String(30))  # Teamwork, Innovation, Leadership, Customer Focus, Above & Beyond
    message: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
