"""
Runs app.services.zkteco_sync.sync_device() against every Active biometric
device on a fixed interval, inside the same process as the API server.

Only starts if ENABLE_BIOMETRIC_SYNC=true in .env - left off by default so
installs without real hardware don't get connection-refused spam in the
logs every couple of minutes.
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database import SessionLocal
from app.modules.integration.service import get_active_devices
from app.services.zkteco_sync import sync_device

logger = logging.getLogger("zkteco_sync")

_scheduler = BackgroundScheduler()


def poll_all_devices():
    db = SessionLocal()
    try:
        devices = get_active_devices(db)
        if not devices:
            logger.info("Biometric sync tick: no active devices configured")
            return

        for device in devices:
            result = sync_device(db, device)
            logger.info(
                f"Synced '{device.device_name}' ({device.purpose}): "
                f"pulled={result.pulled} created={result.created} "
                f"duplicates={result.skipped_duplicate} "
                f"unmatched={result.skipped_unmatched_employee} "
                f"error={result.error}"
            )
    finally:
        db.close()


def start_scheduler():
    if not settings.ENABLE_BIOMETRIC_SYNC:
        logger.info("Biometric sync is disabled (ENABLE_BIOMETRIC_SYNC=false in .env)")
        return

    from datetime import datetime, timedelta

    first_run = datetime.now() + timedelta(minutes=settings.BIOMETRIC_SYNC_INTERVAL_MINUTES)

    _scheduler.add_job(
        poll_all_devices,
        "interval",
        minutes=settings.BIOMETRIC_SYNC_INTERVAL_MINUTES,
        id="biometric_poll",
        replace_existing=True,
        next_run_time=first_run,  # first tick happens after one full interval, not instantly at boot
    )
    _scheduler.start()
    logger.info(
        f"Biometric sync scheduler started - polling every "
        f"{settings.BIOMETRIC_SYNC_INTERVAL_MINUTES} minute(s)"
    )


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
