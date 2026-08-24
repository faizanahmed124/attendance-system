import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listEmployees } from '../../api/employeeApi'
import { checkIn, listCheckIns } from '../../api/attendanceApi'

export default function CheckIn() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [logs, setLogs] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    listEmployees().then((res) => {
      setEmployees(res.data)
      if (res.data.length > 0) setEmployeeId(res.data[0].id)
    })
  }, [])

  const loadLogs = (id) => {
    if (!id) return
    listCheckIns(id).then((res) => setLogs(res.data))
  }

  useEffect(() => { loadLogs(employeeId) }, [employeeId])

  const handlePunch = async (logType) => {
    setError('')
    setMessage('')
    try {
      await checkIn({ employee_id: Number(employeeId), log_type: logType, source: 'web' })
      const emp = employees.find((e) => e.id === Number(employeeId))
      setMessage(`${emp?.full_name} punched ${logType === 'IN' ? 'in' : 'out'} at ${new Date().toLocaleTimeString()}`)
      loadLogs(employeeId)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not record check-in')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Check-in / Check-out</h1>
          <p>Manual web punch. Biometric device syncs land here too, tagged with source "biometric".</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/check-in-logs')}>View All Check-in Logs →</button>
      </div>

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        {error && <div className="error-banner">{error}</div>}
        {message && <div className="error-banner" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>{message}</div>}

        <div className="form-grid" style={{ alignItems: 'end' }}>
          <div className="field">
            <label>Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.employee_code} — {emp.full_name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button className="btn btn-primary" onClick={() => handlePunch('IN')}>Punch In</button>
            <button className="btn btn-outline" onClick={() => handlePunch('OUT')}>Punch Out</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
          <strong>Recent punches for this employee</strong>
        </div>
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="icon">□</div>
            <div className="title">No punches recorded yet</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Type</th><th>Time</th><th>Source</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.log_type === 'IN' ? '→ In' : '← Out'}</td>
                  <td className="mono">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="mono">{log.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
