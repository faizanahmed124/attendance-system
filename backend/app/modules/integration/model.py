from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BiometricDevice(Base):
    """
    A physical fingerprint/face-scan machine. Check-in and check-out are
    always SEPARATE machines/records — a device only ever does one purpose.

    This table only stores configuration for now (name, IP, port, location,
    purpose, status). The actual polling/sync job that talks to the device
    over the network and creates CheckIn rows (source="biometric",
    device_id=<this row's id>) is added later — see
    app/modules/attendance/service.py::create_check_in, which already
    accepts a device_id. Once that job exists, it should only poll devices
    where status == "Active".
    """
    __tablename__ = "biometric_devices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    device_name: Mapped[str] = mapped_column(String(100))
    ip_address: Mapped[str] = mapped_column(String(50))
    port: Mapped[int] = mapped_column(Integer, default=4370)  # 4370 is the common ZKTeco default
    location: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # A device is dedicated to one direction only.
    purpose: Mapped[str] = mapped_column(String(20), default="Check-in")  # "Check-in" or "Check-out"

    device_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g. "ZKTeco", "Hikvision"
    status: Mapped[str] = mapped_column(String(20), default="Active")  # Active, Inactive

    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class CCTVCamera(Base):
    """
    A CCTV camera's connection details. Same configuration-only pattern as
    BiometricDevice — the actual stream/recording integration is added later.
    """
    __tablename__ = "cctv_cameras"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    camera_name: Mapped[str] = mapped_column(String(100))
    ip_address: Mapped[str] = mapped_column(String(50))
    port: Mapped[int] = mapped_column(Integer, default=554)  # 554 is the common RTSP default
    location: Mapped[str | None] = mapped_column(String(150), nullable=True)

    stream_url: Mapped[str | None] = mapped_column(String(300), nullable=True)  # e.g. rtsp://...
    status: Mapped[str] = mapped_column(String(20), default="Active")  # Active, Inactive

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
