from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------- Biometric Device ----------

class BiometricDeviceCreate(BaseModel):
    device_name: str
    ip_address: str
    port: Optional[int] = 4370
    location: Optional[str] = None
    purpose: str  # "Check-in" or "Check-out"
    device_type: Optional[str] = None
    status: Optional[str] = "Active"
    notes: Optional[str] = None


class BiometricDeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    location: Optional[str] = None
    purpose: Optional[str] = None
    device_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class BiometricDeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_name: str
    ip_address: str
    port: int
    location: Optional[str] = None
    purpose: str
    device_type: Optional[str] = None
    status: str
    last_sync_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime


# ---------- CCTV Camera ----------

class CCTVCameraCreate(BaseModel):
    camera_name: str
    ip_address: str
    port: Optional[int] = 554
    location: Optional[str] = None
    stream_url: Optional[str] = None
    status: Optional[str] = "Active"
    notes: Optional[str] = None


class CCTVCameraUpdate(BaseModel):
    camera_name: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    location: Optional[str] = None
    stream_url: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CCTVCameraOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    camera_name: str
    ip_address: str
    port: int
    location: Optional[str] = None
    stream_url: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
