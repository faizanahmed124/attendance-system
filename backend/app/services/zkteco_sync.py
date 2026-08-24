"""
Talks to a real ZKTeco biometric machine over the network (using the `pyzk`
library and turns its punch log into CheckIn rows.

Design notes, since these decisions aren't obvious from the code alone:

- Each BiometricDevice has a fixed `purpose` ("Check-in" or "Check-out").
  Per the requirement, check-in and check-out are always physically
  separate machines - so every punch pulled from a given device becomes
  a CheckIn with that device's purpose as the log_type. We don't need to
  interpret the device's own IN/OUT punch flag at all.

- ZKTeco devices generally return their FULL stored punch history on every
  `get_attendance()` call - there's no "give me only new records" query in
  the protocol. So every sync re-processes the FULL history every time
  (no time-based cutoff), and relies entirely on a DB-level duplicate
  check (same employee + log_type + timestamp) before inserting.

  An earlier version of this file also skipped any record older than
  `device.last_sync_at`. That was a bug - a punch from someone whose
  Employee record didn't have a biometric_id set yet would get marked
  "unmatched" on the first sync, then permanently skipped by every later
  sync via the cutoff before ever re-checking whether an Employee now has
  a matching biometric_id. Removed entirely - the dedup check below is
  what actually matters for correctness.

- IMPORTANT - timezone: pyzk decodes each punch's timestamp as a NAIVE
  datetime matching the physical device's own local wall-clock time (i.e.
  whatever timezone the machine itself is set to - it does NOT report
  UTC). But everywhere else in this app, a naive datetime stored in the
  database is treated as UTC (see app/core/json_encoding.py, which adds a
  "Z" suffix to every timestamp on the way out so the frontend converts
  it to the browser's local time correctly). If we stored the device's
  raw local timestamp as-is, it would get double-shifted - e.g. Pakistan
  is UTC+5, so an 8:51 AM local punch got stored as if 8:51 AM WERE UTC,
  and then displayed as 8:51 AM + 5 hours = 1:51 PM. So every timestamp
  pulled from the device is localized to the system's configured time
  zone (Settings > System Settings > Time Zone) and converted to real UTC
  before being stored, exactly like every other timestamp in this app.

- Employees are matched by `Employee.biometric_id` == the device's
  `user_id` field on each punch record. That field is set on the Employee
  profile page and must match whatever ID was used to enroll that
  fingerprint on the physical machine.

- The device is disabled (locked, won't accept new punches) for the
  brief moment we're reading it, then always re-enabled in a `finally`
  block - matches ZKTeco's own recommended pull-log pattern.
"""
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.modules.integration.model import BiometricDevice
from app.modules.attendance.model import CheckIn
from app.modules.attendance.service import create_check_in
from app.modules.attendance.schema import CheckInCreate
from app.modules.employee.service import get_employee_by_biometric_id

logger = logging.getLogger("zkteco_sync")

PURPOSE_TO_LOG_TYPE = {"Check-in": "IN", "Check-out": "OUT"}
FALLBACK_TIMEZONE = "Asia/Karachi"


class SyncResult:
    def __init__(self):
        self.pulled = 0
        self.created = 0
        self.skipped_duplicate = 0
        self.skipped_unmatched_employee = 0
        self.error = None

    def as_dict(self):
        return {
            "pulled": self.pulled,
            "created": self.created,
            "skipped_duplicate": self.skipped_duplicate,
            "skipped_unmatched_employee": self.skipped_unmatched_employee,
            "error": self.error,
        }


def _get_device_timezone(db: Session) -> ZoneInfo:
    """
    The physical biometric device reports its OWN local wall-clock time,
    not UTC - so we need to know what timezone that clock is actually set
    to in order to convert correctly. We use the system-wide configured
    Time Zone (Settings > System Settings) as that value, since in
    practice the device and the office are in the same timezone.
    """
    try:
        from app.modules.system_settings.service import get_settings as get_system_settings
        settings = get_system_settings(db)
        return ZoneInfo(settings.time_zone)
    except Exception as e:  # noqa: BLE001 - bad/missing settings should never crash a sync
        logger.warning(f"Could not load system time zone, falling back to {FALLBACK_TIMEZONE}: {e}")
        return ZoneInfo(FALLBACK_TIMEZONE)


def sync_device(db: Session, device: BiometricDevice) -> SyncResult:
    result = SyncResult()

    try:
        from zk import ZK  # imported lazily so the app still runs on machines without pyzk installed
    except ImportError:
        result.error = "pyzk is not installed - run: pip install pyzk"
        logger.error(result.error)
        return result

    log_type = PURPOSE_TO_LOG_TYPE.get(device.purpose)
    if not log_type:
        result.error = f"Unknown device purpose '{device.purpose}'"
        logger.error(result.error)
        return result

    device_tz = _get_device_timezone(db)

    conn = None
    zk = ZK(device.ip_address, port=device.port, timeout=10, force_udp=False, ommit_ping=False)

    try:
        conn = zk.connect()
        conn.disable_device()  # pause the device while we read it, per ZKTeco's own recommended pattern

        records = conn.get_attendance() or []
        result.pulled = len(records)

        for record in records:
            raw_ts = record.timestamp
            if raw_ts.tzinfo is not None:
                raw_ts = raw_ts.replace(tzinfo=None)

            # raw_ts is naive and represents the DEVICE's local wall-clock
            # time. Localize it to the configured timezone, convert to
            # real UTC, then strip tzinfo again - matching how every other
            # timestamp in this app is stored (naive, but UTC).
            ts = raw_ts.replace(tzinfo=device_tz).astimezone(timezone.utc).replace(tzinfo=None)

            employee = get_employee_by_biometric_id(db, str(record.user_id))
            if not employee:
                result.skipped_unmatched_employee += 1
                logger.warning(
                    f"No employee has biometric_id='{record.user_id}' "
                    f"(device '{device.device_name}', punch at {ts} UTC)"
                )
                continue

            already_exists = (
                db.query(CheckIn)
                .filter(
                    CheckIn.employee_id == employee.id,
                    CheckIn.log_type == log_type,
                    CheckIn.timestamp == ts,
                )
                .first()
            )
            if already_exists:
                result.skipped_duplicate += 1
                continue

            create_check_in(db, CheckInCreate(
                employee_id=employee.id,
                log_type=log_type,
                timestamp=ts,
                source="biometric",
                device_id=str(device.id),
            ))
            result.created += 1

        device.last_sync_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()

    except Exception as e:  # noqa: BLE001 - a single unreachable device must never crash the poller
        result.error = str(e)
        logger.error(f"Sync failed for device '{device.device_name}' ({device.ip_address}): {e}")

    finally:
        if conn:
            try:
                conn.enable_device()
                conn.disconnect()
            except Exception:  # noqa: BLE001
                pass

    return result