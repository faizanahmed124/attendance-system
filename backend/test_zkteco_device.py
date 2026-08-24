"""
Standalone diagnostic tool - connects directly to a ZKTeco device and shows
you exactly what it returns, without going through the API/UI or touching
the database. Use this FIRST when setting up a new device, before relying
on "Sync Now" or the background poller.

Usage:
    cd backend
    python test_zkteco_device.py 192.168.1.50
    python test_zkteco_device.py 192.168.1.50 --port 4370
    python test_zkteco_device.py 192.168.1.50 --live     # watch punches arrive in real time (Ctrl+C to stop)
"""
import argparse
import sys


def main():
    parser = argparse.ArgumentParser(description="Test a ZKTeco device connection")
    parser.add_argument("ip", help="Device IP address, e.g. 192.168.1.50")
    parser.add_argument("--port", type=int, default=4370, help="Device port (default: 4370)")
    parser.add_argument("--timeout", type=int, default=10, help="Connection timeout in seconds (default: 10)")
    parser.add_argument("--live", action="store_true", help="Watch punches arrive live instead of dumping history")
    args = parser.parse_args()

    try:
        from zk import ZK
    except ImportError:
        print("ERROR: pyzk is not installed. Run: pip install pyzk")
        sys.exit(1)

    print(f"Connecting to {args.ip}:{args.port} (timeout={args.timeout}s)...")
    zk = ZK(args.ip, port=args.port, timeout=args.timeout, force_udp=False, ommit_ping=False)

    try:
        conn = zk.connect()
    except Exception as e:
        print(f"\nFAILED to connect: {e}")
        print("\nCommon causes:")
        print("  - Wrong IP/port, or device is on a different network/VLAN")
        print("  - Device's 'Cloud Server' / ADMS setting is blocking direct SDK connections")
        print("  - A firewall on this machine or the device's network is blocking the port")
        print("  - The device is asleep / powered off")
        sys.exit(1)

    print("Connected successfully.\n")

    try:
        print("--- Device info ---")
        print(f"Name:           {conn.get_device_name()}")
        print(f"Firmware:       {conn.get_firmware_version()}")
        print(f"Serial number:  {conn.get_serialnumber()}")
        print(f"Platform:       {conn.get_platform()}")
        try:
            print(f"MAC address:    {conn.get_mac()}")
        except Exception:
            pass

        print("\n--- Enrolled users ---")
        users = conn.get_users()
        if not users:
            print("(none found)")
        else:
            for u in users[:20]:
                print(f"  user_id={u.user_id!r}  name={u.name!r}  privilege={u.privilege}")
            if len(users) > 20:
                print(f"  ... and {len(users) - 20} more")
        print(f"Total enrolled: {len(users)}")
        print("\n>>> The 'user_id' shown above must match the 'Biometric ID' field on the matching Employee profile. <<<")

        if args.live:
            print("\n--- Watching for live punches (Ctrl+C to stop) ---")
            conn.disable_device()
            try:
                for attendance in conn.live_capture():
                    if attendance is None:
                        continue
                    print(f"PUNCH: user_id={attendance.user_id!r}  timestamp={attendance.timestamp}  punch={attendance.punch}  status={attendance.status}")
            except KeyboardInterrupt:
                print("\nStopped.")
            finally:
                conn.enable_device()
        else:
            print("\n--- Attendance log (full history stored on device) ---")
            records = conn.get_attendance() or []
            if not records:
                print("(no attendance records on this device)")
            else:
                for r in records[-30:]:
                    print(f"  user_id={r.user_id!r}  timestamp={r.timestamp}  punch={r.punch}  status={r.status}")
                if len(records) > 30:
                    print(f"  ... showing last 30 of {len(records)} total records")

    finally:
        conn.disconnect()
        print("\nDisconnected.")


if __name__ == "__main__":
    main()