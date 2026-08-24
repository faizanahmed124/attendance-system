from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_permission
from app.modules.integration import service
from app.modules.integration.schema import (
    BiometricDeviceCreate, BiometricDeviceUpdate, BiometricDeviceOut,
    CCTVCameraCreate, CCTVCameraUpdate, CCTVCameraOut,
)

router = APIRouter(prefix="/api/integration", tags=["Integration"])


# ---- Biometric Devices ----

@router.get("/biometric-devices", response_model=List[BiometricDeviceOut])
def list_biometric_devices(
    purpose: Optional[str] = None, status: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(require_permission("integration", "read")),
):
    return service.list_biometric_devices(db, purpose, status)


@router.get("/biometric-devices/{device_id}", response_model=BiometricDeviceOut)
def get_biometric_device(
    device_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("integration", "read")),
):
    return service.get_biometric_device(db, device_id)


@router.post("/biometric-devices", response_model=BiometricDeviceOut)
def create_biometric_device(
    payload: BiometricDeviceCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("integration", "create")),
):
    return service.create_biometric_device(db, payload)


@router.put("/biometric-devices/{device_id}", response_model=BiometricDeviceOut)
def update_biometric_device(
    device_id: int, payload: BiometricDeviceUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("integration", "write")),
):
    return service.update_biometric_device(db, device_id, payload)


@router.delete("/biometric-devices/{device_id}")
def delete_biometric_device(
    device_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("integration", "delete")),
):
    service.delete_biometric_device(db, device_id)
    return {"message": "Biometric device deleted successfully"}


@router.post("/biometric-devices/{device_id}/sync-now")
def sync_biometric_device_now(
    device_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("integration", "write")),
):
    """
    Connects to the physical device right now instead of waiting for the
    background poller's next tick - useful for testing a device you just
    configured, or for hitting a manual "Sync Now" button in the UI.
    """
    from app.services.zkteco_sync import sync_device

    device = service.get_biometric_device(db, device_id)
    result = sync_device(db, device)
    return result.as_dict()


# ---- CCTV Cameras ----

@router.get("/cctv-cameras", response_model=List[CCTVCameraOut])
def list_cctv_cameras(
    status: Optional[str] = None, db: Session = Depends(get_db),
    current_user=Depends(require_permission("integration", "read")),
):
    return service.list_cctv_cameras(db, status)


@router.get("/cctv-cameras/{camera_id}", response_model=CCTVCameraOut)
def get_cctv_camera(
    camera_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("integration", "read")),
):
    return service.get_cctv_camera(db, camera_id)


@router.post("/cctv-cameras", response_model=CCTVCameraOut)
def create_cctv_camera(
    payload: CCTVCameraCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("integration", "create")),
):
    return service.create_cctv_camera(db, payload)


@router.put("/cctv-cameras/{camera_id}", response_model=CCTVCameraOut)
def update_cctv_camera(
    camera_id: int, payload: CCTVCameraUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("integration", "write")),
):
    return service.update_cctv_camera(db, camera_id, payload)


@router.delete("/cctv-cameras/{camera_id}")
def delete_cctv_camera(
    camera_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("integration", "delete")),
):
    service.delete_cctv_camera(db, camera_id)
    return {"message": "CCTV camera deleted successfully"}
