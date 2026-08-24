import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusPill from '../../components/StatusPill'
import { listAttendance, markAttendanceBulk } from '../../api/attendanceApi'
import { listEmployees } from '../../api/employeeApi'

const STATUS_OPTIONS = ['Present', 'Absent', 'On Leave', 'Half Day', 'Work From Home']

export default function Attendance() {
  const navigate = useNavigate()
  const [attendance, setAttendance] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ employee_id: '', status: '', from_date: '', to_date: '' })

  const [showMarkModal, setShowMarkModal] = useState(false)
  const [markForm, setMarkForm] = useState({ employee_id: '', from_date: '', to_date: '', status: 'Present', skip_weekends: true })
  const [marking, setMarking] = useState(false)
  const [markError, setMarkError] = useState('')
  const [markMessage, setMarkMessage] = useState('')

  const employeeLabel = (id) => {
    const emp = employees.find((e) => e.id === id)
    return emp ? `${emp.employee_code} — ${emp.full_name}` : `#${id}`
  }

  const load = () => {
    setLoading(true)
    const params = {}
    if (filters.employee_id) params.employee_id = filters.employee_id
    if (filters.status) params.status = filters.status
    if (filters.from_date) params.from_date = filters.from_date
    if (filters.to_date) params.to_date = filters.to_date

    Promise.all([listAttendance(params), listEmployees()])
      .then(([attRes, empRes]) => {
        setAttendance(attRes.data)
        setEmployees(empRes.data)
        setMarkForm((f) => ({ ...f, employee_id: f.employee_id || empRes.data[0]?.id || '' }))
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openMarkModal = () => {
    setMarkError('')
    setMarkMessage('')
    setShowMarkModal(true)
  }

  const handleMarkSubmit = async (e) => {
    e.preventDefault()
    setMarking(true)
    setMarkError('')
    setMarkMessage('')
    try {
      const res = await markAttendanceBulk({
        ...markForm,
        employee_id: Number(markForm.employee_id),
      })
      setMarkMessage(`Marked ${res.data.length} day(s) as ${markForm.status} for ${employeeLabel(Number(markForm.employee_id))}.`)
      load()
    } catch (err) {
      setMarkError(err.response?.data?.detail || 'Could not mark attendance')
    } finally {
      setMarking(false)
    }
  }

  const columns = [
    { key: 'employee_id', label: 'Employee', render: (r) => employeeLabel(r.employee_id) },
    { key: 'attendance_date', label: 'Date', render: (r) => <span className="mono">{r.attendance_date}</span> },
    { key: 'check_in_time', label: 'Check-in', render: (r) => <span className="mono">{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '—'}</span> },
    { key: 'check_out_time', label: 'Check-out', render: (r) => <span className="mono">{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '—'}</span> },
    { key: 'working_hours', label: 'Hours', render: (r) => <span className="mono">{r.working_hours ?? '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Attendance</h1>
          <p>Daily attendance summary built from check-in / check-out events.</p>
        </div>
        <button className="btn btn-primary" onClick={openMarkModal} disabled={employees.length === 0}>
          Mark Attendance
        </button>
      </div>

      <div className="toolbar">
        <div className="filter-bar">
          <select value={filters.employee_id} onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}>
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.employee_code} — {emp.full_name}</option>
            ))}
          </select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" value={filters.from_date} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })} />
          <input type="date" value={filters.to_date} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })} />
          <button className="btn btn-outline btn-sm" onClick={load}>Apply</button>
        </div>
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={attendance}
          emptyMessage="No attendance records match these filters"
          onRowClick={(row) => navigate(`/attendance/${row.id}`)}
        />
      )}

      {showMarkModal && (
        <Modal
          title="Mark Attendance"
          onClose={() => setShowMarkModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowMarkModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={handleMarkSubmit} disabled={marking}>
                {marking ? 'Marking…' : 'Mark Attendance'}
              </button>
            </>
          }
        >
          {markError && <div className="error-banner">{markError}</div>}
          {markMessage && <div className="error-banner" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>{markMessage}</div>}
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
            Mark the same status across a date range — e.g. a whole month at once — instead of day by day.
          </p>
          <form onSubmit={handleMarkSubmit}>
            <div className="field">
              <label>Employee</label>
              <select value={markForm.employee_id} onChange={(e) => setMarkForm({ ...markForm, employee_id: e.target.value })}>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.employee_code} — {emp.full_name}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>From date</label>
                <input type="date" value={markForm.from_date} onChange={(e) => setMarkForm({ ...markForm, from_date: e.target.value })} required />
              </div>
              <div className="field">
                <label>To date</label>
                <input type="date" value={markForm.to_date} onChange={(e) => setMarkForm({ ...markForm, to_date: e.target.value })} required />
              </div>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={markForm.status} onChange={(e) => setMarkForm({ ...markForm, status: e.target.value })}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={markForm.skip_weekends} onChange={(e) => setMarkForm({ ...markForm, skip_weekends: e.target.checked })} />
              Skip Saturdays &amp; Sundays
            </label>
          </form>
        </Modal>
      )}
    </div>
  )
}
