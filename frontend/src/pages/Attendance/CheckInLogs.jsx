import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus } from 'lucide-react'
import Modal from '../../components/Modal'
import { listCheckInLogs, createCheckIn, deleteCheckIn } from '../../api/attendanceApi'
import { listEmployees } from '../../api/employeeApi'
import { extractErrorMessage } from '../../utils/errorMessage'

const PAGE_SIZE = 20

function nowForInput() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const emptyCreateForm = { employee_id: '', log_type: 'IN', timestamp: nowForInput(), source: 'web', device_id: '' }

export default function CheckInLogs() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [employees, setEmployees] = useState([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ employee_id: '', log_type: '', from_date: '', to_date: '' })
  const [error, setError] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [creating, setCreating] = useState(false)

  const [deletingId, setDeletingId] = useState(null)

  const load = () => {
    setLoading(true)
    const params = { skip: page * PAGE_SIZE, limit: PAGE_SIZE }
    if (filters.employee_id) params.employee_id = filters.employee_id
    if (filters.log_type) params.log_type = filters.log_type
    if (filters.from_date) params.from_date = filters.from_date
    if (filters.to_date) params.to_date = filters.to_date

    Promise.all([listCheckInLogs(params), employees.length ? Promise.resolve({ data: employees }) : listEmployees()])
      .then(([logRes, empRes]) => {
        setLogs(logRes.data.results)
        setTotal(logRes.data.total)
        if (!employees.length) setEmployees(empRes.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page])

  const applyFilters = () => {
    setPage(0)
    load()
  }

  const openCreate = () => {
    setCreateForm({ ...emptyCreateForm, employee_id: filters.employee_id || (employees[0]?.id ?? '') })
    setError('')
    setShowCreateModal(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      await createCheckIn({
        employee_id: Number(createForm.employee_id),
        log_type: createForm.log_type,
        timestamp: new Date(createForm.timestamp).toISOString(),
        source: createForm.source || 'web',
        device_id: createForm.device_id || null,
      })
      setShowCreateModal(false)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create check-in'))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (log) => {
    if (!window.confirm(
      `Delete this ${log.log_type} punch for ${log.employee_name} at ${new Date(log.timestamp).toLocaleString()}?\n\n` +
      `If it's a real biometric punch, it will come back automatically on the next device sync. Use this to remove duplicates or mistakes.`
    )) return

    setDeletingId(log.id)
    setError('')
    try {
      await deleteCheckIn(log.id)
      load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete this check-in'))
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Check-in Logs</h1>
          <p>Every check-in / check-out event across all employees, including biometric device syncs.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => navigate('/check-in')}>Manual Punch</button>
          <button className="btn btn-primary" onClick={openCreate} disabled={employees.length === 0}>
            <Plus size={14} style={{ marginRight: 6 }} /> New Check-in
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="toolbar">
        <div className="filter-bar">
          <select value={filters.employee_id} onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}>
            <option value="">All employees</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.employee_code} — {emp.full_name}</option>)}
          </select>
          <select value={filters.log_type} onChange={(e) => setFilters({ ...filters, log_type: e.target.value })}>
            <option value="">All log types</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
          <input type="date" value={filters.from_date} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })} />
          <input type="date" value={filters.to_date} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })} />
          <button className="btn btn-outline btn-sm" onClick={applyFilters}>Apply</button>
        </div>
      </div>

      {loading ? (
        <div className="card card-pad">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon">□</div><div className="title">No check-in logs match these filters</div></div></div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Employee</th>
                <th>Shift</th>
                <th>Log Type</th>
                <th>Time</th>
                <th>ID</th>
                <th>Source</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/employees/${log.employee_id}`)}>
                  <td style={{ fontWeight: 600 }}>{log.employee_name}</td>
                  <td className="mono">{log.employee_code}</td>
                  <td>{log.shift_name || '—'}</td>
                  <td>
                    <span className={`pill ${log.log_type === 'IN' ? 'pill-present' : 'pill-leave'}`}>{log.log_type}</span>
                  </td>
                  <td className="mono">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{log.checkin_id}</td>
                  <td style={{ textTransform: 'capitalize' }}>{log.source}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(log)}
                      disabled={deletingId === log.id}
                      title="Delete this punch"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="toolbar" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginRight: 10 }}>
          {total === 0 ? '0 results' : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
        </span>
        <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>← Prev</button>
        <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))} disabled={page >= totalPages - 1}>Next →</button>
      </div>

      {showCreateModal && (
        <Modal
          title="New Check-in"
          onClose={() => setShowCreateModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Saving…' : 'Create Check-in'}
              </button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>Employee</label>
              <select value={createForm.employee_id} onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })} required autoFocus>
                <option value="">— Select —</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.employee_code} — {emp.full_name}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Log Type</label>
                <select value={createForm.log_type} onChange={(e) => setCreateForm({ ...createForm, log_type: e.target.value })}>
                  <option value="IN">IN (Check-in)</option>
                  <option value="OUT">OUT (Check-out)</option>
                </select>
              </div>
              <div className="field">
                <label>Date &amp; Time</label>
                <input type="datetime-local" value={createForm.timestamp} onChange={(e) => setCreateForm({ ...createForm, timestamp: e.target.value })} required />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Source</label>
                <select value={createForm.source} onChange={(e) => setCreateForm({ ...createForm, source: e.target.value })}>
                  <option value="web">Web (manual entry)</option>
                  <option value="biometric">Biometric</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
              <div className="field">
                <label>Device ID (optional)</label>
                <input value={createForm.device_id} onChange={(e) => setCreateForm({ ...createForm, device_id: e.target.value })} placeholder="Leave blank for manual entries" />
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              This immediately recalculates that employee's attendance for the day (status, hours, overtime), the same way a real biometric punch would.
            </p>
          </form>
        </Modal>
      )}
    </div>
  )
}