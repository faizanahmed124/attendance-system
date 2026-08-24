import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listCheckInLogs } from '../../api/attendanceApi'
import { listEmployees } from '../../api/employeeApi'

const PAGE_SIZE = 20

export default function CheckInLogs() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [employees, setEmployees] = useState([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ employee_id: '', log_type: '', from_date: '', to_date: '' })

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

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Check-in Logs</h1>
          <p>Every check-in / check-out event across all employees, including biometric device syncs.</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/check-in')}>Manual Punch</button>
      </div>

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
    </div>
  )
}
