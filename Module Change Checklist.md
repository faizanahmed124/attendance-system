# Module Change Checklist

Har naye module (Leave, Payroll, waghera) ya kisi maujooda module (Employee,
Attendance, Company...) mein tabdeeli ke liye ye files touch hoti hain.
Employee module isi pattern se bana hai — reference ke liye dekh sakte hain.

---

## 1. BACKEND — naya module banate waqt (e.g. "leave")

Order matters: upar se neeche isi tarteeb mein banayein.

| # | File | Kya hota hai |
|---|------|---------------|
| 1 | `backend/app/modules/leave/model.py` | SQLAlchemy table — columns define |
| 2 | `backend/app/modules/leave/schema.py` | Pydantic `LeaveCreate`, `LeaveUpdate`, `LeaveOut` |
| 3 | `backend/app/modules/leave/service.py` | Business logic — `create_leave()`, `list_leaves()`, waghera |
| 4 | `backend/app/modules/leave/router.py` | API endpoints (`/api/leaves/...`), `require_permission()` ke sath |
| 5 | `backend/app/modules/leave/__init__.py` | Khali file (Python package marker) |
| 6 | `backend/app/main.py` | Naya model import + naya router import + `app.include_router(leave_router)` |
| 7 | `backend/app/modules/permission/model.py` | `MODULES` list mein `"leave"` add karein — warna permission matrix mein nahi dikhega |
| 8 | `backend/alembic/env.py` | Naya model import (autogenerate ke liye) |
| 9 | `backend/seed.py` | (optional) sample data add karna ho to |

**Existing module mein sirf naya field add karna ho** (jaise Employee mein humne kiya):
- Sirf `model.py`, `schema.py`, `service.py` (agar logic change ho) update karein
- **`backend/migrate.py`** mein naye column ka entry add karein (`NEW_EMPLOYEE_COLUMNS` jaisa dict, apne module ke liye alag dict/function bana lein) — warna purana SQLite data ke sath naya column nahi banega

---

## 2. FRONTEND — naya module banate waqt

| # | File | Kya hota hai |
|---|------|---------------|
| 1 | `frontend/src/api/leaveApi.js` | Axios calls — `listLeaves()`, `createLeave()`, waghera |
| 2 | `frontend/src/pages/Leave/Leave.jsx` | List page (table + "New" button) |
| 3 | `frontend/src/pages/Leave/LeaveForm.jsx` | (agar full-page form chahiye, Employee jaisa) |
| 4 | `frontend/src/pages/Leave/LeaveDetail.jsx` | (agar single-record view chahiye, Attendance jaisa) |
| 5 | `frontend/src/routes/AppRoutes.jsx` | Naya `<Route path="/leaves" .../>` add karein |
| 6 | `frontend/src/components/Sidebar.jsx` | `links` array mein naya nav link add karein |
| 7 | `frontend/src/components/Navbar.jsx` | `titles` object mein path→title mapping add karein |

**Existing module mein sirf field add karna ho:**
- Us module ka `Api.js`, list page, aur form/detail page — jahan bhi wo field dikhna/edit hona hai

---

## 3. Extra cheezein jo bhool jaati hain

- **Search mein shamil karna ho** → `backend/app/modules/search/service.py` mein naya block add karein (Employee/Department jaisa)
- **Permission matrix mein control chahiye** → Step 7 (upar) zaroori hai, warna wo module hamesha sabke liye blocked rahega (kyunke default `has_permission()` false return karta hai jab tak row na ho)
- **File upload chahiye** (photo/document jaisa) → `backend/app/utils/file_storage.py` mein naya helper function add karein, `main.py` mein static mount already hai (`/uploads`) — dobara mount nahi karna

---

## 4. Quick decision guide

| Chahte kya hain | Kahan dekhein |
|---|---|
| Naya field ek maujooda module mein | model → schema → service → frontend form/list |
| Bilkul naya module | Poori Section 1 + 2 |
| Kisi role ko access dena/hatana | Sirf UI se — `Settings → Permissions` (koi code change nahi) |
| Field required se optional (ya vice versa) | `schema.py` mein `Optional[]` / default value |
| Naya dropdown option (status, type, waghera) | Backend: `service.py` ya `router.py` mein validation agar hai; Frontend: form ke options array mein |

---

## 5. Har change ke baad

```bash
# Backend
cd backend
find app -name "*.py" | xargs python -m py_compile   # syntax check
python migrate.py                                     # agar existing DB hai
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run build     # errors pakadne ke liye
npm run dev
```
