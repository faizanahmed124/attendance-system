from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.modules.integration.model import BiometricDevice, CCTVCamera
from app.modules.integration.schema import (
    BiometricDeviceCreate, BiometricDeviceUpdate,
    CCTVCameraCreate, CCTVCameraUpdate,
)


# ---------- Biometric Device ----------

def list_biometric_devices(db: Session, purpose: str | None = None, status: str | None = None):
    query = db.query(BiometricDevice)
    if purpose:
        query = query.filter(BiometricDevice.purpose == purpose)
    if status:
        query = query.filter(BiometricDevice.status == status)
    return query.order_by(BiometricDevice.created_at.desc()).all()


def get_biometric_device(db: Session, device_id: int) -> BiometricDevice:
    device = db.query(BiometricDevice).filter(BiometricDevice.id == device_id).first()
    if not device:
        raise NotFoundError("Biometric device not found")
    return device


def create_biometric_device(db: Session, payload: BiometricDeviceCreate) -> BiometricDevice:
    device = BiometricDevice(**payload.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


def update_biometric_device(db: Session, device_id: int, payload: BiometricDeviceUpdate) -> BiometricDevice:
    device = get_biometric_device(db, device_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(device, field, value)
    db.commit()
    db.refresh(device)
    return device


def delete_biometric_device(db: Session, device_id: int) -> None:
    device = get_biometric_device(db, device_id)
    db.delete(device)
    db.commit()


def get_active_devices(db: Session, purpose: str | None = None):
    """
    Reserved for the future polling/sync job: only devices returned here
    should be contacted over the network to pull check-in/check-out events.
    """
    query = db.query(BiometricDevice).filter(BiometricDevice.status == "Active")
    if purpose:
        query = query.filter(BiometricDevice.purpose == purpose)
    return query.all()


# ---------- CCTV Camera ----------

def list_cctv_cameras(db: Session, status: str | None = None):
    query = db.query(CCTVCamera)
    if status:
        query = query.filter(CCTVCamera.status == status)
    return query.order_by(CCTVCamera.created_at.desc()).all()


def get_cctv_camera(db: Session, camera_id: int) -> CCTVCamera:
    camera = db.query(CCTVCamera).filter(CCTVCamera.id == camera_id).first()
    if not camera:
        raise NotFoundError("CCTV camera not found")
    return camera


def create_cctv_camera(db: Session, payload: CCTVCameraCreate) -> CCTVCamera:
    camera = CCTVCamera(**payload.model_dump())
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


def update_cctv_camera(db: Session, camera_id: int, payload: CCTVCameraUpdate) -> CCTVCamera:
    camera = get_cctv_camera(db, camera_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(camera, field, value)
    db.commit()
    db.refresh(camera)
    return camera


def delete_cctv_camera(db: Session, camera_id: int) -> None:
    camera = get_cctv_camera(db, camera_id)
    db.delete(camera)
    db.commit()
