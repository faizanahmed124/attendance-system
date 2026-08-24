# Attendance System

FastAPI (Python) backend + React frontend attendance & HR system, inspired by
Frappe HRMS: Companies, Departments, Designations, Employees, Shifts,
Check-in/Check-out, daily Attendance summaries, and a starter Chart of
Accounts / Cost Centers module.

Biometric hardware is **not** wired up yet (by design, for this first phase).
The check-in endpoint and data model are already shaped so a biometric
device sync job can plug in later without changing the schema — see
"Adding biometric later" below.

## Project structure

```
attendance-system/
├── backend/     FastAPI + SQLAlchemy + JWT auth
└── frontend/    React + Vite
```

## 1. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        
pip install -r requirements.txt

cp .env.example .env           
python seed.py                  
uvicorn app.main:app --reload  

Seeded login: **admin@example.com / Admin@123**

API docs (interactive): http://localhost:8000/docs

### Switching from SQLite to PostgreSQL
Edit `DATABASE_URL` in `.env`, e.g.:
```
DATABASE_URL=postgresql://user:password@localhost:5432/attendance_db
```
Uncomment `psycopg2-binary` in `requirements.txt` and reinstall.

### Database migrations (Alembic)
`seed.py` / the app's startup event create tables directly for quick local
setup. Once you start changing models in a shared/production environment,
use Alembic instead:
```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env    # points to the backend URL
npm run dev              # http://localhost:5173
```

## 3. Modules included

| Module | What it covers |
|---|---|
| Auth | Register/login, JWT, role-based access (admin / hr_manager / employee) |
| Company | Legal entities |
| Department | Org units, linked to a company |
| Designation | Job titles |
| Employee | Core employee record, linked to company/department/designation, has a `biometric_id` field reserved for later |
| Shift Type | Working hours, grace periods for late/early |
| Check-in | Raw punch events (IN/OUT), `source` field: `web`, `manual`, or `biometric` |
| Attendance | Daily summary auto-built from check-in events (first IN, last OUT, working hours, status) |
| Accounts | Chart of Accounts (tree via parent_account_id, root_type: Asset/Liability/Equity/Income/Expense) + Cost Centers |

## 4. ZKTeco biometric integration (built)

Real-device polling is implemented using the `pyzk` library (talks directly
to the ZKTeco device over the network — this is unrelated to any Frappe
app). It's **off by default** so installs without real hardware don't get
connection errors every couple of minutes.

**Setup:**
1. Add your device(s) under **Integration → Biometric Devices** — device
   name, IP address, port (usually `4370`), and **purpose** (`Check-in` or
   `Check-out` — these are always separate physical machines, matching how
   the module is designed).
2. On the physical ZKTeco machine, note the **user ID** each employee was
   enrolled with. Set that same value in **Employee → Biometric ID** on
   their profile — this is how a punch gets matched to a person.
3. In `backend/.env`, set:
   ```
   ENABLE_BIOMETRIC_SYNC=true
   BIOMETRIC_SYNC_INTERVAL_MINUTES=2
   ```
4. Restart `uvicorn`. A background job (APScheduler, runs inside the same
   process) polls every **Active** device on that interval and turns new
   punches into `CheckIn` rows (`source="biometric"`), which then flow into
   the normal daily Attendance summary exactly like a web punch does.
5. To test a device immediately without waiting for the next tick, use the
   **"Sync Now"** button on the Biometric Devices page (or
   `POST /api/integration/biometric-devices/{id}/sync-now`).

**Requirements:**
- The machine running the backend must be able to reach the device's IP on
  its configured port (same network, or a routed/VPN path — no cloud relay
  is used).
- `pyzk` and `apscheduler` are in `requirements.txt` — installed automatically.

**Notes:**
- The device is temporarily disabled (locked) for the moment it's being
  read, then always re-enabled, even if the read fails — this matches
  ZKTeco's own recommended pattern and avoids losing punches.
- A device unreachable at poll time logs an error and is skipped — it never
  crashes the server or blocks other devices from syncing.
- Duplicate punches (the device returns its full history on every pull) are
  filtered both by `last_sync_at` and a direct DB check before inserting.

## 5. What's intentionally left as a starter, not a finished product

- Chart of Accounts covers Journal Entries, Expense Claims, and Salary
  Postings — a full trial balance / P&L report is not built yet.
- Role permissions are a simple 3-role system (admin / hr_manager /
  employee) with a per-module read/create/write/delete matrix.
- CCTV camera integration only stores connection config for now — no
  stream viewer or recording pull is wired up.
- No automated tests yet — add pytest for the backend as the next step.

Build these one module at a time the same way the existing modules are
structured (model → schema → service → router), and register any new
router in `backend/app/main.py`.
